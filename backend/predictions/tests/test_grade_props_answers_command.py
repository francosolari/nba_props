"""Regression tests for ``grade_props_answers`` management command."""

import pytest
from django.core.management import call_command

from predictions.models import Answer, UserStats
from predictions.tests.factories import (
    AwardFactory,
    PlayerFactory,
    PropQuestionFactory,
    SeasonFactory,
    SuperlativeQuestionFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestGradePropsAnswersCommand:
    """Validate configurable per-answer scoring rules."""

    def test_uses_answer_point_values_override_for_correct_answer(self):
        """Question-level answer mapping should override default point_value."""
        season = SeasonFactory(slug="25-26", year="25-26")
        user = UserFactory()
        question = PropQuestionFactory(
            season=season,
            text="Will Team X make the playoffs?",
            outcome_type="yes_no",
            point_value=3,
            correct_answer="No",
            answer_point_values={"yes": 3, "no": 1},
        )
        answer = Answer.objects.create(user=user, question=question, answer="No")

        call_command("grade_props_answers", season.slug)

        answer.refresh_from_db()
        assert answer.is_correct is True
        assert answer.points_earned == 1

        stats = UserStats.objects.get(user=user, season=season)
        assert stats.points == 1

    def test_falls_back_to_point_value_when_no_override_exists(self):
        """Default point_value remains the fallback when no mapping entry exists."""
        season = SeasonFactory(slug="26-27", year="26-27")
        user = UserFactory()
        question = PropQuestionFactory(
            season=season,
            text="Will Team Y make the playoffs?",
            outcome_type="yes_no",
            point_value=3,
            correct_answer="Yes",
        )
        answer = Answer.objects.create(user=user, question=question, answer="Yes")

        call_command("grade_props_answers", season.slug)

        answer.refresh_from_db()
        assert answer.is_correct is True
        assert answer.points_earned == 3

    def test_answer_point_values_award_partial_credit_without_marking_correct(self):
        """Mapped non-primary answers can earn points while is_correct stays false."""
        season = SeasonFactory(slug="27-28", year="27-28")
        user = UserFactory()
        award = AwardFactory(name="MVP")
        winner = PlayerFactory(name="Award Winner")
        runner_up = PlayerFactory(name="Award Runner Up")
        question = SuperlativeQuestionFactory(
            season=season,
            award=award,
            point_value=5,
            correct_answer=winner.name,
            answer_point_values={
                winner.name: 5,
                runner_up.name: 2.5,
            },
        )
        answer = Answer.objects.create(user=user, question=question, answer=str(runner_up.id))

        call_command("grade_props_answers", season.slug)

        answer.refresh_from_db()
        assert answer.is_correct is False
        assert answer.points_earned == 2.5

        stats = UserStats.objects.get(user=user, season=season)
        assert stats.points == 2.5

    def test_answer_point_values_do_not_award_unmapped_wrong_answers(self):
        """Wrong answers still earn zero unless explicitly mapped."""
        season = SeasonFactory(slug="28-29", year="28-29")
        user = UserFactory()
        question = PropQuestionFactory(
            season=season,
            text="Will Team Z win the division?",
            outcome_type="yes_no",
            point_value=3,
            correct_answer="No",
            answer_point_values={"no": 1},
        )
        answer = Answer.objects.create(user=user, question=question, answer="Yes")

        call_command("grade_props_answers", season.slug)

        answer.refresh_from_db()
        assert answer.is_correct is False
        assert answer.points_earned == 0
