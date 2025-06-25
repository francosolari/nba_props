# NBA Predictions Game

A web application where users make predictions about NBA seasons and earn points throughout the year, with features for reviewing scores, comparing with other users, and checking leaderboards.

## Project Overview

The NBA Predictions Game is a Django application with a React frontend, using Tailwind CSS for styling. It allows users to:

- Make predictions about NBA teams, players, and outcomes
- Track their scores throughout the season
- Compare their predictions with other users
- View leaderboards to see how they rank

## Technology Stack

- **Backend**: Django 4.2
- **Frontend**: React with Tailwind CSS
- **API**: Django Ninja (v2) and legacy API (v1)
- **Database**: PostgreSQL (production), SQLite (development)
- **Deployment**: Docker with blue-green deployment strategy

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 16+
- Docker and Docker Compose (for containerized development/deployment)

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd nba_predictions
   ```

2. Set up a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Install frontend dependencies:
   ```bash
   npm install
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Run database migrations:
   ```bash
   python manage.py migrate
   ```

6. Start the development server:
   ```bash
   python manage.py runserver
   ```

7. In a separate terminal, start the frontend development server:
   ```bash
   npm run dev
   ```

8. Access the application at http://localhost:8000

### Docker Development

1. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

2. Access the application:
   - Blue environment: http://localhost:8000
   - Green environment: http://localhost:8002

## Project Structure

### Backend Structure

- `nba_predictions/` - Django project settings
- `accounts/` - User authentication app
- `predictions/` - Main application logic
  - `api/` - API endpoints
    - `common/` - Shared components
    - `v1/` - Version 1 API (legacy)
    - `v2/` - Version 2 API (using Django Ninja)
  - `models/` - Database models
  - `views/` - View functions
  - `routing/` - URL routing
  - `templates/` - HTML templates
  - `management/` - Custom management commands

### Frontend Structure

- `src/` - React source code
  - `components/` - React components
  - `hooks/` - Custom React hooks
  - `utils/` - Utility functions
  - `App.js` - Main React component
  - `index.jsx` - Entry point

## Deployment

The application uses a blue-green deployment strategy with Docker Compose:

1. Build the Docker images:
   ```bash
   docker-compose build
   ```

2. Deploy the application:
   ```bash
   docker-compose up -d
   ```

## Documentation

For a comprehensive analysis of the project structure and recommendations for improvements, see the [Design Review Document](./DESIGN_REVIEW.md).

## Contributing

Please read the [Contributing Guide](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the [MIT License](./LICENSE).