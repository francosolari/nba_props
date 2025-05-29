# File: predictions/api/v2/endpoints/teams.py
"""
Teams API Endpoints

This module handles all team-related API endpoints including:
- Retrieving all NBA teams with conference information
- Team search and filtering (future)
- Team rosters and statistics (future)

Endpoints:
- GET /teams - Retrieve all teams
"""

from typing import List
from ninja import Router
from django.http import JsonResponse

from predictions.models import Team
from ..schemas import TeamSchema, TeamsResponseSchema, ErrorSchema

# Create router for team endpoints
router = Router(tags=["Teams"])


@router.get(
    "/",
    response={200: TeamsResponseSchema, 404: ErrorSchema},
    summary="Get All Teams",
    description="""
    Retrieve a complete list of all NBA teams with conference information.

    This endpoint returns essential team information including:
    - Team ID (unique identifier)
    - Team name (e.g., "Los Angeles Lakers")
    - Conference affiliation (East or West)

    **Use Cases:**
    - Build team selection interfaces
    - Create conference-based displays
    - Generate team lookup tables
    - Populate standings templates

    **Response Format:**
    Returns a JSON object with a 'teams' array containing team objects.
    Teams are returned in database order (typically alphabetical by name).

    **Example Response:**
    ```json
    {
        "teams": [
            {
                "id": 1,
                "name": "Boston Celtics", 
                "conference": "East"
            },
            {
                "id": 2,
                "name": "Los Angeles Lakers",
                "conference": "West"
            }
        ]
    }
    ```

    **Conference Values:**
    - "East" - Eastern Conference teams (15 teams)
    - "West" - Western Conference teams (15 teams)

    **Performance Notes:**
    - Returns all 30 NBA teams in single request
    - Data is relatively static (changes only with league expansion/relocation)
    - Response is highly cacheable
    - No pagination needed due to small dataset size
    """
)
def get_all_teams(request):
    """
    Retrieve all NBA teams with conference information.

    This endpoint queries the Team model to fetch all teams and their
    conference affiliations. The data is formatted into a standardized
    response structure for consistent API usage.

    The query is optimized to fetch only necessary fields to minimize
    database load and response size.

    Returns:
        TeamsResponseSchema: JSON response containing all teams

    Raises:
        500: If database query fails or teams cannot be retrieved

    Database Query:
        - Fetches all Team objects
        - Selects only id, name, and conference fields
        - No ordering applied (uses natural database order)
    """
    try:
        # Query all teams from database
        teams_queryset = Team.objects.all()

        # Build response data with explicit field selection
        # This ensures we only include intended fields in the response
        team_data = [
            {
                'id': team.id,
                'name': team.name,
                'conference': team.conference,
                # Note: Commented out logo field - uncomment when logo support is added
                # 'logo': team.logo.url if team.logo else None
            }
            for team in teams_queryset
        ]

        # Return standardized response format
        return {'teams': team_data}

    except Exception as e:
        # Log error for debugging (in production, use proper logging)
        print(f"Error fetching teams: {str(e)}")

        # Return error response with details
        return JsonResponse(
            {'error': 'Unable to fetch teams', 'details': str(e)},
            status=500
        )