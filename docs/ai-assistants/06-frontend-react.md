# 06 - Frontend: React Patterns

**Part of:** AI Assistant Documentation
**Load when:** Working with React components, hooks, state management, or frontend features

## Table of Contents
- [Frontend Architecture](#frontend-architecture)
- [Component Mounting System](#component-mounting-system)
- [React Query (TanStack Query)](#react-query-tanstack-query)
- [Component Patterns](#component-patterns)
- [Custom Hooks](#custom-hooks)
- [Styling with Tailwind](#styling-with-tailwind)
- [Build System](#build-system)

## Frontend Architecture

```
frontend/src/
├── index.jsx              # Entry point - mounts components
├── App.js                 # Root component (minimal)
├── pages/                 # Page-level components
├── components/            # Reusable components (flat structure)
├── hooks/                 # Custom React hooks
├── utils/                 # Utility functions
├── styles/                # CSS and Tailwind config
└── types/                 # TypeScript types (if using TS)
```

**Key Points:**
- No Redux - Uses React Query for server state
- Flat component structure (no nested folders)
- Page components mount to Django template elements
- Webpack bundles to `frontend/static/js/bundle.js`

## Component Mounting System

React components are mounted to Django template elements by ID.

### Frontend: index.jsx

```javascript
// frontend/src/index.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import pages
import HomePage from './pages/HomePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Mount component function
function mountComponent(Component, elementId, componentName) {
  const element = document.getElementById(elementId);
  if (element) {
    console.log(`Mounting ${componentName}...`);
    const root = createRoot(element);
    root.render(
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>
    );
  }
}

// Mount all page components
mountComponent(HomePage, 'home-root', 'HomePage');
mountComponent(LeaderboardPage, 'leaderboard-root', 'LeaderboardPage');
mountComponent(ProfilePage, 'profile-root', 'ProfilePage');
// ... etc
```

### Backend: Django Template

```html
<!-- predictions/templates/predictions/home.html -->
{% extends "base.html" %}
{% load static %}

{% block content %}
  <div id="home-root"
       data-season-slug="{{ season.slug }}"
       data-user-id="{{ user.id }}">
    <!-- React component mounts here -->
  </div>
{% endblock %}

{% block scripts %}
  <script src="{% static 'js/bundle.js' %}"></script>
{% endblock %}
```

### Accessing Data Attributes

```javascript
// frontend/src/pages/HomePage.jsx
function HomePage() {
  // Get data from DOM element
  const rootElement = document.getElementById('home-root');
  const seasonSlug = rootElement?.dataset?.seasonSlug || '2024-25';
  const userId = rootElement?.dataset?.userId;

  // Use in component
  const { data: questions } = useQuery({
    queryKey: ['questions', seasonSlug],
    queryFn: () => fetchQuestions(seasonSlug),
  });

  return <div>{/* ... */}</div>;
}
```

## React Query (TanStack Query)

The project uses React Query for all server state management.

### Basic Query

```javascript
import { useQuery } from '@tanstack/react-query';

function LeaderboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leaderboard', '2024-25'],
    queryFn: async () => {
      const response = await fetch('/api/v2/leaderboard/2024-25/');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.leaderboard.map(entry => (
        <div key={entry.user_id}>{entry.username}: {entry.points}</div>
      ))}
    </div>
  );
}
```

### Mutations

```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function AnswerForm({ questionId }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (answerData) => {
      const response = await fetch('/api/v2/answers/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(answerData),
      });

      if (!response.ok) throw new Error('Failed to submit');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries(['userAnswers']);
      queryClient.invalidateQueries(['leaderboard']);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      question_id: questionId,
      answer_text: 'LeBron James',
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <button disabled={mutation.isLoading}>
        {mutation.isLoading ? 'Submitting...' : 'Submit'}
      </button>
      {mutation.isError && <div>Error: {mutation.error.message}</div>}
    </form>
  );
}
```

### Query Keys Pattern

```javascript
// Use consistent query keys
const queryKeys = {
  leaderboard: (season) => ['leaderboard', season],
  questions: (season) => ['questions', season],
  userAnswers: (season, userId) => ['userAnswers', season, userId],
  standings: (season) => ['standings', season],
};

// Use in queries
const { data } = useQuery({
  queryKey: queryKeys.leaderboard('2024-25'),
  queryFn: () => fetchLeaderboard('2024-25'),
});
```

### Prefetching

```javascript
import { useQueryClient } from '@tanstack/react-query';

function LeaderboardList() {
  const queryClient = useQueryClient();

  const prefetchUserDetail = (userId) => {
    queryClient.prefetchQuery({
      queryKey: ['user', userId],
      queryFn: () => fetchUserDetail(userId),
    });
  };

  return (
    <div>
      {users.map(user => (
        <div
          key={user.id}
          onMouseEnter={() => prefetchUserDetail(user.id)}
        >
          {user.username}
        </div>
      ))}
    </div>
  );
}
```

## Component Patterns

### Page Components

Located in `frontend/src/pages/`.

```javascript
// frontend/src/pages/LeaderboardPage.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Leaderboard from '../components/Leaderboard';
import LoadingSpinner from '../components/LoadingSpinner';

function LeaderboardPage() {
  const rootElement = document.getElementById('leaderboard-root');
  const seasonSlug = rootElement?.dataset?.seasonSlug || '2024-25';

  const { data, isLoading, error } = useQuery({
    queryKey: ['leaderboard', seasonSlug],
    queryFn: () => fetchLeaderboard(seasonSlug),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
      <Leaderboard data={data.leaderboard} />
    </div>
  );
}

export default LeaderboardPage;
```

### Reusable Components

Located in `frontend/src/components/`.

```javascript
// frontend/src/components/Leaderboard.jsx
import React from 'react';
import PropTypes from 'prop-types';

function Leaderboard({ data }) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Rank
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Points
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((entry, index) => (
            <tr key={entry.user_id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {index + 1}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {entry.username}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {entry.points.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Leaderboard.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      user_id: PropTypes.number.isRequired,
      username: PropTypes.string.isRequired,
      points: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default Leaderboard;
```

### Component Composition

```javascript
// frontend/src/components/PredictionBoard.jsx
import React from 'react';
import QuestionCard from './QuestionCard';
import AnswerForm from './AnswerForm';

function PredictionBoard({ questions, onSubmitAnswer }) {
  return (
    <div className="space-y-6">
      {questions.map(question => (
        <QuestionCard key={question.id} question={question}>
          <AnswerForm
            questionId={question.id}
            onSubmit={onSubmitAnswer}
          />
        </QuestionCard>
      ))}
    </div>
  );
}

export default PredictionBoard;
```

## Custom Hooks

Located in `frontend/src/hooks/`.

### useLeaderboard Hook

```javascript
// frontend/src/hooks/useLeaderboard.js
import { useQuery } from '@tanstack/react-query';

export function useLeaderboard(seasonSlug) {
  return useQuery({
    queryKey: ['leaderboard', seasonSlug],
    queryFn: async () => {
      const response = await fetch(`/api/v2/leaderboard/${seasonSlug}/`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### useSubmissions Hook

```javascript
// frontend/src/hooks/useSubmissions.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getCookie } from '../utils/helpers';

export function useSubmitAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, answerText }) => {
      const response = await fetch('/api/v2/answers/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({
          question_id: questionId,
          answer_text: answerText,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit answer');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries(['userAnswers']);
      queryClient.invalidateQueries(['leaderboard']);
    },
  });
}
```

### Custom Hook Pattern

```javascript
// frontend/src/hooks/useUserSubmissions.js
import { useQuery } from '@tanstack/react-query';

export function useUserSubmissions(seasonSlug, userId) {
  return useQuery({
    queryKey: ['userSubmissions', seasonSlug, userId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v2/user-submissions/${seasonSlug}/${userId}/`
      );
      if (!response.ok) throw new Error('Failed to fetch submissions');
      return response.json();
    },
    enabled: !!userId, // Only run if userId exists
  });
}
```

## Styling with Tailwind

### Utility Classes

```javascript
function Button({ children, variant = 'primary', onClick }) {
  const baseClasses = 'px-4 py-2 rounded font-medium transition-colors';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### Conditional Classes

```javascript
import classNames from 'classnames'; // npm install classnames

function Badge({ status, children }) {
  return (
    <span
      className={classNames(
        'px-2 py-1 text-xs font-medium rounded',
        {
          'bg-green-100 text-green-800': status === 'correct',
          'bg-red-100 text-red-800': status === 'incorrect',
          'bg-gray-100 text-gray-800': status === 'pending',
        }
      )}
    >
      {children}
    </span>
  );
}
```

### Custom Palette

See `frontend/src/styles/palette.css`:

```css
:root {
  --color-primary: #1d4ed8;
  --color-secondary: #6b7280;
  --color-accent: #f59e0b;
}
```

## Build System

### Webpack Configuration

Located in `frontend/webpack.config.js`.

**Key features:**
- Babel transpilation for JSX/modern JS
- CSS extraction with PostCSS/Tailwind
- Source maps in development
- Minification in production

### Build Commands

```bash
# Development build (faster, with source maps)
npm run build:dev

# Production build (minified, optimized)
npm run build

# Watch mode (auto-rebuild on changes)
npm run webpack-watch

# Both Django + Webpack in watch mode
npm run dev
```

### Output

- **JS Bundle**: `frontend/static/js/bundle.js`
- **CSS Bundle**: `frontend/static/css/styles.css`

Django serves these via WhiteNoise from `frontend/staticfiles/`.

## Common Patterns

### CSRF Token

```javascript
// frontend/src/utils/helpers.js
export function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
```

### Error Handling

```javascript
function ErrorBoundary({ children }) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return <div>Something went wrong.</div>;
  }

  return children;
}
```

### Loading States

```javascript
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
```

## Related Documentation

- **API integration**: Load `05-backend-api.md`
- **Architecture overview**: Load `03-architecture.md`
- **Common tasks**: Load `08-common-tasks.md`
- **Testing**: Load `12-testing.md`

---

**Key Takeaways:**
1. Components mount to Django template elements by ID
2. React Query for all server state management
3. Custom hooks for reusable data fetching logic
4. Tailwind CSS for styling
5. CSRF token required for POST requests
6. Webpack bundles to `frontend/static/`
