# NBA Predictions Game

A web application where users make predictions about NBA seasons and earn points throughout the year, with features for reviewing scores, comparing with other users, and checking leaderboards.

## Getting Started

This guide will help you get the NBA Predictions Game up and running on your local machine.

### Prerequisites

-   Python 3.11+
-   Node.js 16+
-   Docker and Docker Compose

### Installation

1.  Clone the repository:

    ```bash
    git clone <repository-url>
    cd nba_predictions
    ```

2.  Install the backend dependencies:

    ```bash
    pip install -r requirements.txt
    ```

3.  Install the frontend dependencies:

    ```bash
    npm install
    ```

4.  Set up your environment variables:

    ```bash
    cp .env.example .env
    ```

5.  Run the database migrations:

    ```bash
    python manage.py migrate
    ```

6.  Start the development servers:

    ```bash
    python manage.py runserver
    npm run dev
    ```

## Documentation

For more detailed information about the project, please see the [documentation](./docs/README.md).

### CI/CD Deployment

This project uses a two-stage deployment workflow with manual approval gates. See [STAGED_DEPLOYMENT_SETUP.md](./STAGED_DEPLOYMENT_SETUP.md) for details.

## Contributing

We welcome contributions from the open-source community. For more information, please see the [contributing guide](docs/CONTRIBUTING.md).
