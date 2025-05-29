# Contributing to NBA Predictions Game

Thank you for considering contributing to the NBA Predictions Game! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Testing](#testing)
6. [Pull Request Process](#pull-request-process)
7. [Versioning](#versioning)

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Set up the development environment as described in the [README.md](./README.md)
4. Create a new branch for your feature or bugfix

## Development Workflow

1. **Branch Naming Convention**:
   - Feature: `feature/short-description`
   - Bugfix: `bugfix/short-description`
   - Hotfix: `hotfix/short-description`
   - Release: `release/vX.Y.Z`

2. **Commit Messages**:
   - Use the present tense ("Add feature" not "Added feature")
   - Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
   - Limit the first line to 72 characters or less
   - Reference issues and pull requests after the first line

3. **Development Process**:
   - Create a new branch from `main` for your changes
   - Make your changes in small, logical commits
   - Keep your branch updated with the main branch
   - Write tests for your changes
   - Ensure all tests pass before submitting a pull request

## Coding Standards

### Python/Django

- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) style guide
- Use docstrings for all functions, classes, and modules
- Use type hints where appropriate
- Organize imports in the following order:
  1. Standard library imports
  2. Related third-party imports
  3. Local application/library specific imports
- Use Django's class-based views where appropriate
- Follow Django's model design best practices

### JavaScript/React

- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use functional components with hooks
- Use ES6+ features
- Organize imports in the following order:
  1. React and related libraries
  2. Third-party libraries
  3. Local components and utilities
- Use PropTypes or TypeScript for component props
- Keep components small and focused on a single responsibility

### CSS/Tailwind

- Follow the [Tailwind CSS best practices](https://tailwindcss.com/docs/utility-first)
- Use consistent class ordering
- Extract common patterns to components
- Use `@apply` for complex components

## Testing

### Backend Testing

- Write unit tests for models, views, and forms
- Use Django's TestCase for database-related tests
- Aim for high test coverage, especially for critical functionality
- Run tests before submitting a pull request:
  ```bash
  python manage.py test
  ```

### Frontend Testing

- Write unit tests for React components using Jest and React Testing Library
- Test component rendering and interactions
- Mock API calls and external dependencies
- Run tests before submitting a pull request:
  ```bash
  npm test
  ```

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the documentation with details of any interface changes
3. Ensure all tests pass and add new tests for new functionality
4. The PR should work in all supported browsers and devices
5. Request review from at least one maintainer
6. PRs require approval from at least one maintainer before merging

## Versioning

We use [Semantic Versioning](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/yourusername/nba-predictions/tags).

- **MAJOR** version when you make incompatible API changes
- **MINOR** version when you add functionality in a backwards compatible manner
- **PATCH** version when you make backwards compatible bug fixes

## Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Django Ninja Documentation](https://django-ninja.rest-framework.com/)

Thank you for contributing to the NBA Predictions Game!