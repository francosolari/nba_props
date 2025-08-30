# Design Overview

This document provides a high-level overview of the design and architecture of the NBA Predictions Game project.

## 1. Introduction

The NBA Predictions Game is a web application that allows users to predict the outcome of NBA seasons. Users can create an account, make predictions, and track their performance throughout the season. The application also features a leaderboard that shows how users rank against each other.

## 2. Architecture

The application is built with a modern web stack:

-   **Backend**: Django and Django Ninja
-   **Frontend**: React and Tailwind CSS
-   **Database**: PostgreSQL
-   **Deployment**: Docker

### 2.1. Backend

The backend is a Django application that provides a RESTful API for the frontend. The API is built with Django Ninja, a modern, fast, and type-safe API framework for Django.

For more information, see the [Backend Documentation](./docs/backend/README.md).

### 2.2. Frontend

The frontend is a React application that consumes the backend API. The frontend is built with modern React features, such as hooks and context, and is styled with Tailwind CSS.

For more information, see the [Frontend Documentation](./docs/frontend/README.md).

### 2.3. Database

The application uses a PostgreSQL database to store data. The database is managed with Django's built-in ORM.

For more information, see the [Models Documentation](./docs/backend/models.md).

### 2.4. Deployment

The application is containerized with Docker and deployed using a blue-green deployment strategy. This allows for zero-downtime deployments and easy rollbacks.

For more information, see the [Deployment Documentation](./docs/deployment.md).

## 3. Documentation

This project is documented in the `docs` directory. The documentation is written in Markdown and is organized into the following sections:

-   [Project Overview](./docs/project_overview.md)
-   [Backend Documentation](./docs/backend/README.md)
-   [Frontend Documentation](./docs/frontend/README.md)
-   [Deployment Documentation](./docs/deployment.md)
