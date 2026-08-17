import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nba_predictions.settings')
import django
django.setup()

from predictions.models import Player


# 2026 NBA Draft - All 60 picks (Barclays Center, June 23-24, 2026)
ROOKIES_2026 = [
    # First Round (1-30)
    "AJ Dybantsa",
    "Darryn Peterson",
    "Cameron Boozer",
    "Caleb Wilson",
    "Keaton Wagler",
    "Mikel Brown Jr.",
    "Darius Acuff Jr.",
    "Kingston Flemings",
    "Morez Johnson Jr.",
    "Brayden Burries",
    "Yaxel Lendeborg",
    "Aday Mara",
    "Nate Ament",
    "Hannes Steinbach",
    "Dailyn Swain",
    "Bennett Stirtz",
    "Ebuka Okorie",
    "Christian Anderson",
    "Allen Graves",
    "Jayden Quaintance",
    "Karim Lopez",
    "Labaron Philon Jr.",
    "Zuby Ejiofor",
    "Cameron Carr",
    "Sergio De Larrea",
    "Tarris Reed Jr.",
    "Chris Cenac Jr.",
    "Joshua Jefferson",
    "Alex Karaban",
    "Koa Peat",
    # Second Round (31-60)
    "Bruce Thornton",
    "Richie Saunders",
    "Isaiah Evans",
    "Meleek Thomas",
    "Trevon Brazile",
    "Baba Miller",
    "Ryan Conwell",
    "Braden Smith",
    "Jack Kayil",
    "Dillon Mitchell",
    "Otega Oweh",
    "Ja'Kobi Gillespie",
    "Tyler Bilodeau",
    "Maliq Brown",
    "Emanuel Sharp",
    "Felix Okpata",
    "Tyler Nickel",
    "Tobi Lawal",
    "Bryce Hopkins",
    "Jaden Bradley",
    "Izaiyah Nelson",
    "Henri Veesaar",
    "Ugonna Onyenso",
    "Lajae Jones",
    "Nick Martinelli",
    "Vsevolod Ishchenko",
    "Narcisse Ngoy",
    "Jaron Pierre Jr.",
    "Trey Kaufman-Renn",
    "Malique Lewis",
]


def add_rookies_to_database(rookies):
    """
    Adds rookie players to the database.
    """
    added_count = 0
    updated_count = 0

    print(f"\n{'=' * 60}")
    print(f"Adding {len(rookies)} rookies to database...")
    print(f"{'=' * 60}\n")

    for idx, name in enumerate(rookies, 1):
        try:
            player, created = Player.objects.get_or_create(
                name=name
            )

            if created:
                added_count += 1
                print(f"{idx:2d}. ✓ Added rookie: {name}")
                try:
                    from nba_api.stats.static import players as nba_players
                    matches = nba_players.find_players_by_full_name(name)
                    if matches:
                        player.nba_player_id = matches[0]['id']
                        player.save(update_fields=['nba_player_id'])
                except Exception:
                    pass  # Headshot ID backfill is best-effort; `backfill_player_nba_ids` can retry later.
            else:
                updated_count += 1
                print(f"{idx:2d}. - Already exists: {name}")

        except Exception as e:
            print(f"{idx:2d}. ✗ Error adding {name}: {e}")

    return added_count, updated_count


def main():
    print("=" * 60)
    print("2026 NBA Draft Rookies - Database Update Script")
    print("=" * 60)
    print(f"Source: 2026 NBA Draft (Barclays Center, June 23-24, 2026)")
    print(f"Total rookies to add: {len(ROOKIES_2026)}")
    print(f"{'=' * 60}")

    # Add to database
    added, updated = add_rookies_to_database(ROOKIES_2026)

    print(f"\n{'=' * 60}")
    print(f"Summary:")
    print(f"  New rookies added: {added}")
    print(f"  Already existed: {updated}")
    print(f"  Total processed: {len(ROOKIES_2026)}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
