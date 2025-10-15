# Open Source Contributor's Guide

This document provides a guide for open-source contributors to the NBA Predictions Game project. It outlines the project's architecture, conventions, and key components to ensure that contributions are consistent, maintainable, and aligned with the project's goals.

## Project Overview

The NBA Predictions Game is a Django application with a React frontend. The backend is built with Django and Django Ninja, and the frontend is built with React and Tailwind CSS. The project is containerized with Docker and uses a blue-green deployment strategy.

## How to Contribute

We welcome contributions from the open-source community. To contribute, please follow these guidelines:

1.  **Fork the repository** and create a new branch for your changes.
2.  **Follow the code style** guidelines listed below.
3.  **Write tests** for your changes.
4.  **Update the documentation** as needed.
5.  **Open a pull request** and request a review.

## Backend

The backend is a Django project with the following structure:

- `nba_predictions/`: The main Django project directory.
- `accounts/`: Handles user authentication.
- `predictions/`: The core application logic, including models, views, and APIs.

### Models

The models are organized into separate files based on their domain. The key models are:

- `Season`: Represents an NBA season.
- `Team`: Represents an NBA team.
- `Player`: Represents an NBA player.
- `Question`: Represents a prediction question.
- `Answer`: Represents a user's answer to a question.
- `Prediction`: Represents a user's prediction.
- `UserStats`: Stores user statistics.

### APIs

The project has two API versions:

- **v1 (Legacy)**: The original API, built with Django REST Framework.
- **v2 (Modern)**: The current API, built with Django Ninja.

All new API development should be done in v2. The v1 API is being deprecated and will be removed in a future release.

## Frontend

The frontend is a React application with the following structure:

- `src/`: The main React source code directory.
- `components/`: Reusable React components.
- `hooks/`: Custom React hooks.
- `pages/`: Top-level page components.
- `utils/`: Utility functions.

### State Management

The frontend uses Redux for state management and React Query for data fetching.

### Styling

The frontend is styled with Tailwind CSS.

## Conventions

## Documentation

This project is documented in a series of markdown files. The following is a list of all the markdown files in the project and a brief description of each file:

-   [README.md](./README.md): A brief overview of the project and instructions on how to get started.
-   [DESIGN_REVIEW.md](docs/DESIGN_REVIEW.md): A high-level overview of the project's architecture and design.
-   [CONTRIBUTING.md](docs/CONTRIBUTING.md): A guide for contributing to the project.
-   [gemini.md](./gemini.md): A guide for AI-powered development on the project.
-   [docs/project_overview.md](./docs/project_overview.md): A detailed overview of the project's goals, features, and architecture.
-   [docs/backend/README.md](./docs/backend/README.md): An overview of the backend, including the project structure, apps, and key components.
-   [docs/backend/models.md](./docs/backend/models.md): A detailed description of the database schema.
-   [docs/backend/api.md](./docs/backend/api.md): A detailed description of the v1 and v2 APIs.
-   [docs/frontend/README.md](./docs/frontend/README.md): An overview of the frontend, including the project structure, components, and state management.
-   [docs/frontend/components.md](./docs/frontend/components.md): A detailed description of the reusable UI components.
-   [docs/deployment.md](./docs/deployment.md): Detailed instructions for deploying the application.

### Code Style

- **Python**: Follow the PEP 8 style guide.
- **JavaScript/TypeScript**: Follow the Airbnb style guide.

### Testing

- **Backend**: Use `pytest` for unit and integration tests.
- **Frontend**: Use Jest and React Testing Library for unit and component tests.

### Documentation

- **Backend**: Use docstrings for all modules, classes, and functions.
- **Frontend**: Use JSDoc for all components and functions.
