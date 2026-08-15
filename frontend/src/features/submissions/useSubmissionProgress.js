import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  QUESTION_GROUP_META,
  QUESTION_GROUP_ORDER,
  getQuestionGroupType,
  isAnswered,
} from './submissionProgress';

const groupQuestions = (questions) => {
  const grouped = questions.reduce((result, question) => {
    const type = getQuestionGroupType(question);
    return { ...result, [type]: [...(result[type] || []), question] };
  }, {});

  return QUESTION_GROUP_ORDER.filter((type) => grouped[type]?.length).map((type) => ({
    type,
    ...QUESTION_GROUP_META[type],
    questions: grouped[type],
  }));
};

const useSubmissionProgress = ({ seasonSlug, questions, userAnswersData }) => {
  const [answers, setAnswers] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [activeGroupType, setActiveGroupType] = useState(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const storageKey = seasonSlug ? `submissions_${seasonSlug}` : null;

  useEffect(() => {
    if (!seasonSlug) return;
    setAnswers({});
    setHasChanges(false);
  }, [seasonSlug]);

  useEffect(() => {
    if (!storageKey) return;
    const cached = localStorage.getItem(storageKey);
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        setAnswers(parsed);
        setHasChanges(true);
      }
    } catch (error) {
      console.warn('Failed to parse cached submissions', error);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!userAnswersData?.answers) return;
    const serverAnswers = Object.fromEntries(
      userAnswersData.answers.map((answer) => [answer.question_id, answer.answer]),
    );
    let localAnswers = {};
    try {
      localAnswers = storageKey ? JSON.parse(localStorage.getItem(storageKey) || '{}') : {};
    } catch (error) {
      console.warn('Failed to restore cached submissions after sign in', error);
    }
    const hasLocalDraft = Object.entries(localAnswers).some(
      ([questionId, answer]) => String(serverAnswers[questionId] ?? '') !== String(answer),
    );
    setAnswers({ ...localAnswers, ...serverAnswers });
    setHasChanges(hasLocalDraft);
  }, [storageKey, userAnswersData]);

  useEffect(() => {
    if (storageKey && hasChanges && Object.keys(answers).length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    }
  }, [answers, hasChanges, storageKey]);

  const handleAnswerChange = useCallback((questionId, value) => {
    setAnswers((current) => {
      const next = { ...current, [questionId]: value };
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
    setHasChanges(true);
  }, [storageKey]);

  const groupedQuestions = useMemo(() => groupQuestions(questions), [questions]);
  const missingQuestions = useMemo(
    () => questions.filter((question) => !isAnswered(answers[question.id])),
    [answers, questions],
  );
  const completedCount = questions.length - missingQuestions.length;
  const progress = questions.length > 0
    ? Math.round((completedCount / questions.length) * 100)
    : 0;
  const activeGroup = groupedQuestions.find((group) => group.type === activeGroupType)
    || groupedQuestions[0]
    || null;

  useEffect(() => {
    if (groupedQuestions.length === 0) {
      setActiveGroupType(null);
      return undefined;
    }
    if (!groupedQuestions.some((group) => group.type === activeGroupType)) {
      setActiveGroupType(groupedQuestions[0].type);
    }
    if (typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver((entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visibleEntry?.target?.dataset?.groupType) {
        setActiveGroupType(visibleEntry.target.dataset.groupType);
      }
    }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 });

    groupedQuestions.forEach((group) => {
      const section = document.getElementById(`question-group-${group.type}`);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [activeGroupType, groupedQuestions]);

  return {
    answers,
    hasChanges,
    setHasChanges,
    handleAnswerChange,
    groupedQuestions,
    missingQuestions,
    completedCount,
    progress,
    activeGroup,
    setActiveGroupType,
    validationAttempted,
    setValidationAttempted,
  };
};

export default useSubmissionProgress;
