# Frontend Documentation

This document provides a comprehensive overview of the frontend for the NBA Predictions Game project.

## 1. Project Structure

The frontend is a React application with the following structure:

- `src/`: The main React source code directory.
- `components/`: Reusable React components.
- `hooks/`: Custom React hooks.
- `pages/`: Top-level page components.
- `utils/`: Utility functions.

### 1.1. `src/components/`

This directory contains reusable React components that are used throughout the application. For a detailed description of the components, see the [Components Documentation](./components.md).

### 1.2. `src/hooks/`

This directory contains custom React hooks that are used to share logic between components.

### 1.3. `src/pages/`

This directory contains the top-level page components for the application.

### 1.4. `src/utils/`

This directory contains utility functions that are used throughout the application.

## 2. State Management

The frontend uses Redux for state management and React Query for data fetching.

### 2.1. Redux

Redux is used to manage the global state of the application, such as the currently logged-in user.

### 2.2. React Query

React Query is used to fetch data from the backend API. It provides a number of features that make it easy to work with asynchronous data, such as caching, optimistic updates, and automatic refetching.

## 3. Styling

The frontend is styled with Tailwind CSS. Tailwind is a utility-first CSS framework that makes it easy to build custom designs without writing a lot of custom CSS.
