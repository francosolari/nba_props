import logging
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, IntegrityError
from django.contrib.auth.models import User
from django.db.models import Sum
from predictions.models import Season, Question, Answer, UserStats, StandingPrediction, SuperlativeQuestion
from predictions.api.common.services.answer_lookup_service import AnswerLookupService
from django.conf import settings


class Command(BaseCommand):
    help = 'Grades user answers based on the correct answers and assigned point values for questions in a given season.'

    def add_arguments(self, parser):
        parser.add_argument(
            'season_slug',
            type=str,
            help='The slug of the season to grade predictions for.'
        )

    def setup_logging(self):
        logger = logging.getLogger('qa_grading_command')
        logger.setLevel(logging.DEBUG)
        if logger.hasHandlers():
            logger.handlers.clear()
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        file_handler = logging.FileHandler('qa_grading_command.log', mode='a')
        file_handler.setLevel(logging.DEBUG)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(formatter)
        file_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)
        logger.propagate = False
        return logger

    def handle(self, *args, **options):
        logger = self.setup_logging()

        season_slug = options['season_slug']
        try:
            season = Season.objects.get(slug=season_slug)
            logger.info(f'Season "{season.slug}" found.')
        except Season.DoesNotExist:
            error_msg = f'Season with slug "{season_slug}" does not exist.'
            logger.error(error_msg)
            raise CommandError(error_msg)

        self.stdout.write(f'Grading answers for season: {season.slug}')
        logger.info(f'Starting grading process for season "{season.slug}".')

        AnswerLookupService.get_lookup_tables()
        logger.info('AnswerLookupService caches pre-warmed.')

        answers_qs = Answer.objects.select_related(
            'user',
            'question',
            'question__polymorphic_ctype'
        ).filter(question__season=season)

        if not answers_qs.exists():
            warning_msg = f'No answers found for season "{season.slug}".'
            self.stdout.write(self.style.WARNING(warning_msg))
            logger.warning(warning_msg)
            return

        logger.info(f'Fetched {answers_qs.count()} answers. Processing with iterator.')

        total_answers = 0
        updated_answers = 0
        skipped_answers = 0

        question_cache = {}  # Cache for question details

        try:
            with transaction.atomic():
                answers_to_update = []
                fields_to_update = set() # Keep track of which fields need updating

                for answer_obj in answers_qs.iterator():
                    total_answers += 1

                    question_id = answer_obj.question_id

                    if question_id not in question_cache:
                        question_instance = answer_obj.question.get_real_instance()
                        correct_answer_text_cached = question_instance.correct_answer
                        point_value_cached = question_instance.point_value
                        question_cache[question_id] = (correct_answer_text_cached, point_value_cached,
                                                       question_instance)
                    else:
                        correct_answer_text_cached, point_value_cached, question_instance = question_cache[question_id]

                    if correct_answer_text_cached is None or not correct_answer_text_cached.strip():
                        warning_msg = (
                            f'No correct answer set for question ID {question_id} '
                            f'(Answer ID {answer_obj.id}). Skipping.'
                        )
                        logger.warning(warning_msg)
                        # Optionally set is_correct to None or False if skipped due to no correct answer
                        # if answer_obj.is_correct is not None: # Or some other logic
                        #    answer_obj.is_correct = None # Or False
                        #    fields_to_update.add('is_correct')
                        #    answers_to_update.append(answer_obj) # Needs careful consideration if you want to update skipped ones
                        skipped_answers += 1
                        continue

                    points = 0
                    answer_is_correct = False # Default to False
                    correct_answer_normalized = correct_answer_text_cached.lower().strip()

                    resolved_user_answer_text = AnswerLookupService.resolve_answer(answer_obj.answer, question_instance)

                    if resolved_user_answer_text.lower().strip() == correct_answer_normalized:
                        points = point_value_cached
                        answer_is_correct = True

                    # Check if points_earned or is_correct needs updating
                    changed = False
                    if answer_obj.points_earned != points:
                        answer_obj.points_earned = points
                        fields_to_update.add('points_earned')
                        changed = True

                    if answer_obj.is_correct != answer_is_correct:
                        answer_obj.is_correct = answer_is_correct
                        fields_to_update.add('is_correct')
                        changed = True

                    if changed:
                        # Add to list if not already there (e.g. if only is_correct changed but it was already in list for points)
                        # This check is implicitly handled by iterating once and adding if any relevant field changed.
                        # No need for "if answer_obj not in answers_to_update"
                        answers_to_update.append(answer_obj) # Add if any tracked field changed
                        updated_answers +=1 # Count updates more accurately if an answer is modified

                # Remove duplicates from answers_to_update if an answer was added multiple times (though logic should prevent it)
                # The current loop structure ensures each answer_obj is processed once.
                # If 'changed' is true, it's added. 'updated_answers' counts how many unique answers had at least one change.
                # To count accurately, it should be outside the conditional 'changed'.
                # Let's adjust 'updated_answers' logic.
                # The current updated_answers counts the number of operations, not unique answers.
                # A better way:

                unique_answers_to_update = {answer.id: answer for answer in answers_to_update}.values()
                actual_updated_count = len(unique_answers_to_update)


                if unique_answers_to_update and fields_to_update:
                    Answer.objects.bulk_update(list(unique_answers_to_update), list(fields_to_update))
                    logger.info(f'Bulk updated {actual_updated_count} answers for fields: {list(fields_to_update)}.')
                elif not fields_to_update:
                     logger.info('No fields were marked for update across all answers.')
                else:
                    logger.info('No answers needed updating.')

                # The rest of your UserStats calculation logic remains the same
                props_totals_qs = (
                    Answer.objects
                    .filter(question__season=season)
                    .exclude(question__polymorphic_ctype__model='inseasontournamentquestion')
                    .values('user_id', 'user__username')
                    .annotate(props_sum=Sum('points_earned'))
                    .order_by()
                )
                standings_totals_qs = (
                    StandingPrediction.objects
                    .filter(season=season)
                    .values('user_id', 'user__username')
                    .annotate(standings_sum=Sum('points'))
                    .order_by()
                )

                user_data = {}
                for item in props_totals_qs:
                    uid = item['user_id']
                    if uid not in user_data:
                        user_data[uid] = {'username': item['user__username'], 'props': 0, 'standings': 0}
                    user_data[uid]['props'] = item['props_sum'] or 0

                for item in standings_totals_qs:
                    uid = item['user_id']
                    if uid not in user_data:
                        user_data[uid] = {'username': item['user__username'], 'props': 0, 'standings': 0}
                    user_data[uid]['standings'] = item['standings_sum'] or 0

                total_props_points = sum(data['props'] for data in user_data.values())
                total_standings_points = sum(data['standings'] for data in user_data.values())

                user_stats_to_create = []
                user_stats_to_update_models = [] # Renamed to avoid clash

                all_user_ids_in_season = list(user_data.keys())
                existing_user_stats_map = {
                    stat.user_id: stat
                    for stat in UserStats.objects.filter(season=season, user_id__in=all_user_ids_in_season)
                }

                user_stats_created_count = 0
                user_stats_updated_count = 0

                for user_id, data in user_data.items():
                    total_points = data['props'] + data['standings']
                    if user_id in existing_user_stats_map:
                        stat = existing_user_stats_map[user_id]
                        if stat.points != total_points:
                            stat.points = total_points
                            user_stats_to_update_models.append(stat)
                            user_stats_updated_count += 1
                    else:
                        user_stats_to_create.append(
                            UserStats(user_id=user_id, season=season, points=total_points)
                        )
                        user_stats_created_count += 1

                if user_stats_to_create:
                    UserStats.objects.bulk_create(user_stats_to_create)
                    logger.info(f'Bulk created {len(user_stats_to_create)} UserStats records.')
                if user_stats_to_update_models:
                    UserStats.objects.bulk_update(user_stats_to_update_models, ['points'])
                    logger.info(f'Bulk updated {len(user_stats_to_update_models)} UserStats records.')

                self.stdout.write("\nUser Scores:")
                self.stdout.write("=" * 60)
                sorted_user_ids = sorted(
                    user_data.keys(),
                    key=lambda uid: user_data[uid]['props'] + user_data[uid]['standings'],
                    reverse=True
                )
                for user_id in sorted_user_ids:
                    data = user_data[user_id]
                    username = data['username']
                    props_p = data['props']
                    standings_p = data['standings']
                    total_p = props_p + standings_p
                    self.stdout.write(
                        f"User: {username}, Total: {total_p} "
                        f"(Standings: {standings_p}, Props: {props_p})"
                    )
                self.stdout.write("=" * 60)

            summary = (
                f"Total Props Points Awarded: {total_props_points}\n"
                f"Total Standings Points Awarded: {total_standings_points}\n"
                f"Total Answers Processed (props): {total_answers}\n"
                # Use actual_updated_count for a more precise count of unique answers changed
                f"Answers Updated (props fields): {actual_updated_count}\n" 
                f"Answers Skipped (props): {skipped_answers}\n"
                f"UserStats Created: {user_stats_created_count}\n"
                f"UserStats Updated: {user_stats_updated_count}"
            )
            self.stdout.write("\nSummary:")
            self.stdout.write("=" * 60)
            self.stdout.write(summary)
            self.stdout.write("=" * 60)
            logger.info("Grading process completed successfully.")
            logger.info(f"Summary:\n{summary}")

        except IntegrityError as e:
            error_msg = f'Database integrity error occurred: {str(e)}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(error_msg, exc_info=True)
            raise CommandError(error_msg)
        except Exception as e:
            error_msg = f'An unexpected error occurred: {str(e)}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(error_msg, exc_info=True)
            raise CommandError(error_msg)