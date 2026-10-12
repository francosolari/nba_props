"""
Merge duplicate Player rows that are the same person under a differently
spelled name, e.g. "Kristaps Porziņģis" / "Kristaps Porzingis" or a rookie
added once by name and again with an NBA.com ID.

Names are compared without accents, punctuation or suffixes (Jr., II...).
In each group the row with an NBA.com ID is kept; every reference to the
other rows (picks, odds, stats, award leaders, winners, hidden-player
lists) moves onto it, and the other rows are deleted. Groups without
exactly one NBA.com ID are reported and left alone.

Usage:
    python manage.py merge_duplicate_players --dry-run
    python manage.py merge_duplicate_players --skip 532 --also 689:372
"""

from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from predictions.models import (
    Answer, Player, PlayerStatPredictionQuestion, PropQuestion, Question, SuperlativeQuestion,
)
from predictions.management.commands.limit_player_picks import normalize_name

# Picks on these questions store the chosen player's id as text.
PLAYER_PICK_TYPES = (SuperlativeQuestion, PropQuestion, PlayerStatPredictionQuestion)


class Command(BaseCommand):
    help = "Merge Player rows that are the same person under differently spelled names."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Show the merges without saving.")
        parser.add_argument(
            "--skip", type=int, nargs="*", default=[],
            help="Player ids to leave alone, e.g. a different person whose name only differs by Jr.",
        )
        parser.add_argument(
            "--also", nargs="*", default=[], metavar="DUPE:KEEPER",
            help="Extra merges by id for spellings name matching can't catch, e.g. 831:926 (Okpata -> Okpara).",
        )

    def handle(self, *args, dry_run, skip, also, **options):
        groups = defaultdict(list)
        for player in Player.objects.exclude(id__in=skip).order_by("id"):
            groups[normalize_name(player.name)].append(player)

        merges, unclear = [], []
        for rows in groups.values():
            if len(rows) < 2:
                continue
            keepers = [p for p in rows if p.nba_player_id]
            if len(keepers) != 1:
                unclear.append(rows)
                continue
            keeper = keepers[0]
            merges.append((keeper, [p for p in rows if p is not keeper]))

        for pair in also:
            dupe_id, keeper_id = (int(part) for part in pair.split(":"))
            dupe, keeper = Player.objects.get(id=dupe_id), Player.objects.get(id=keeper_id)
            merges.append((keeper, [dupe]))

        for keeper, dupes in merges:
            names = ", ".join(f'"{d.name}" (#{d.id})' for d in dupes)
            self.stdout.write(f'Keep "{keeper.name}" (#{keeper.id}) <- {names}')
        for rows in unclear:
            self.stdout.write(self.style.WARNING(
                "Left alone (needs exactly one row with an NBA.com ID): "
                + ", ".join(f'"{p.name}" (#{p.id})' for p in rows)
            ))
        if skip:
            self.stdout.write(f"Skipped ids: {', '.join(map(str, skip))}")

        if dry_run:
            self.stdout.write(f"Dry run: would merge {sum(len(d) for _, d in merges)} rows into {len(merges)} players.")
            return

        pick_questions = list(Question.objects.instance_of(*PLAYER_PICK_TYPES).values_list("id", flat=True))
        moved_picks = 0
        with transaction.atomic():
            for keeper, dupes in merges:
                for dupe in dupes:
                    moved_picks += Answer.objects.filter(
                        question_id__in=pick_questions, answer=str(dupe.id),
                    ).update(answer=str(keeper.id))
                    self._repoint(dupe, keeper)
                    dupe.delete()
        self.stdout.write(self.style.SUCCESS(
            f"Merged {sum(len(d) for _, d in merges)} rows into {len(merges)} players; moved {moved_picks} picks."
        ))

    def _repoint(self, dupe, keeper):
        """Move every foreign key and many-to-many link from dupe onto keeper."""
        for relation in Player._meta.related_objects:
            if relation.many_to_many:
                for owner in getattr(dupe, relation.get_accessor_name()).all():
                    links = getattr(owner, relation.field.name)
                    links.remove(dupe)
                    links.add(keeper)
            else:
                field = relation.field.name
                rows = relation.related_model._base_manager.filter(**{field: dupe})
                if relation.related_model._meta.unique_together:
                    # e.g. one PlayerStat per player and season: drop the
                    # dupe's row where the keeper already has one.
                    for row in rows:
                        clash = {f: getattr(row, f) for f in relation.related_model._meta.unique_together[0] if f != field}
                        if relation.related_model._base_manager.filter(**{field: keeper}, **clash).exists():
                            row.delete()
                rows.update(**{field: keeper})
