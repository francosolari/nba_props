import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminPanel from '../AdminPanel';

// Mock all hooks used by AdminPanel
jest.mock('../../hooks', () => ({
  useAdminQuestions: jest.fn(() => ({ data: [], isLoading: false, refetch: jest.fn() })),
  useUserContext: jest.fn(() => ({ data: null, isLoading: false })),
  useSeasons: jest.fn(() => ({ data: [], isLoading: false })),
  useAwards: jest.fn(() => ({ data: [] })),
  useTeams: jest.fn(() => ({ data: [] })),
  usePlayers: jest.fn(() => ({ data: [] })),
  useCreateSuperlativeQuestion: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useCreatePropQuestion: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useCreateHeadToHeadQuestion: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useCreatePlayerStatQuestion: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useCreateISTQuestion: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useCreateNBAFinalsQuestion: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useUpdateQuestion: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useDeleteQuestion: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useReorderQuestions: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useCreateSeason: jest.fn(() => ({ mutateAsync: jest.fn() })),
}));

// Mock child components
jest.mock('../../components/SelectComponent', () => {
  return function MockSelectComponent() {
    return <select data-testid="select-component" />;
  };
});

jest.mock('../../components/admin/QuestionBatchWizard', () => {
  return function MockBatchWizard() {
    return <div data-testid="batch-wizard" />;
  };
});

const {
  useAdminQuestions,
  useUserContext,
  useSeasons,
  useAwards,
  useTeams,
  usePlayers,
  useCreateSuperlativeQuestion,
  useCreatePropQuestion,
  useCreateHeadToHeadQuestion,
  useCreatePlayerStatQuestion,
  useCreateISTQuestion,
  useCreateNBAFinalsQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useReorderQuestions,
  useCreateSeason,
} = require('../../hooks');

// Re-mock matchMedia and restore hook defaults before each test
// (resetMocks: true in jest.config clears mock implementations between tests)
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Restore default return values cleared by resetMocks
  useAdminQuestions.mockReturnValue({ data: [], isLoading: false, refetch: jest.fn() });
  useUserContext.mockReturnValue({ data: null, isLoading: false });
  useSeasons.mockReturnValue({ data: [], isLoading: false });
  useAwards.mockReturnValue({ data: [] });
  useTeams.mockReturnValue({ data: [] });
  usePlayers.mockReturnValue({ data: [] });
  useCreateSuperlativeQuestion.mockReturnValue({ mutateAsync: jest.fn() });
  useCreatePropQuestion.mockReturnValue({ mutateAsync: jest.fn() });
  useCreateHeadToHeadQuestion.mockReturnValue({ mutateAsync: jest.fn() });
  useCreatePlayerStatQuestion.mockReturnValue({ mutateAsync: jest.fn() });
  useCreateISTQuestion.mockReturnValue({ mutateAsync: jest.fn() });
  useCreateNBAFinalsQuestion.mockReturnValue({ mutateAsync: jest.fn() });
  useUpdateQuestion.mockReturnValue({ mutateAsync: jest.fn() });
  useDeleteQuestion.mockReturnValue({ mutateAsync: jest.fn() });
  useReorderQuestions.mockReturnValue({ mutateAsync: jest.fn() });
  useCreateSeason.mockReturnValue({ mutateAsync: jest.fn() });
});

describe('AdminPanel', () => {
  test('renders access restricted when user is not admin', () => {
    useUserContext.mockReturnValue({ data: { is_admin: false }, isLoading: false });
    useSeasons.mockReturnValue({ data: [{ slug: '2024-25', year: '2024-25' }], isLoading: false });

    render(<AdminPanel seasonSlug="2024-25" />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  test('renders loading state when user context is loading', () => {
    useUserContext.mockReturnValue({ data: null, isLoading: true });
    useSeasons.mockReturnValue({ data: [], isLoading: false });

    render(<AdminPanel seasonSlug="2024-25" />);

    expect(screen.getByText(/loading admin tools/i)).toBeInTheDocument();
  });

  test('renders loading state when seasons are loading', () => {
    useUserContext.mockReturnValue({ data: { is_admin: true }, isLoading: false });
    useSeasons.mockReturnValue({ data: [], isLoading: true });

    render(<AdminPanel seasonSlug="2024-25" />);

    expect(screen.getByText(/loading admin tools/i)).toBeInTheDocument();
  });

  test('renders admin panel for authorized admin', () => {
    useUserContext.mockReturnValue({ data: { is_admin: true }, isLoading: false });
    useSeasons.mockReturnValue({ data: [{ slug: '2024-25', year: '2024-25' }], isLoading: false });

    render(<AdminPanel seasonSlug="2024-25" />);

    expect(screen.queryByText(/access restricted/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/loading admin tools/i)).not.toBeInTheDocument();
  });

  test('renders without crashing when no season slug provided', () => {
    useUserContext.mockReturnValue({ data: { is_admin: true }, isLoading: false });
    useSeasons.mockReturnValue({ data: [{ slug: '2024-25', year: '2024-25' }], isLoading: false });

    expect(() => render(<AdminPanel />)).not.toThrow();
  });
});
