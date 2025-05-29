# File: predictions/api/v2/endpoints/players.py
"""
Players API Endpoints

This module handles all player-related API endpoints including:
- Retrieving all NBA players
- Player search and filtering (future)
- Player statistics (future)

Endpoints:
- GET /players - Retrieve all players
"""

from ninja import Router
from django.http import JsonResponse

from predictions.models import Player
from predictions.api.v2.schemas import PlayersResponseSchema, ErrorSchema

# Create router for player endpoints
router = Router(tags=["Players"])


@router.get(
    "/",
    response={200: PlayersResponseSchema, 404: ErrorSchema},
    summary="Get All Players",
    description="""
    Retrieve a complete list of all NBA players in the system.

    This endpoint returns basic player information including:
    - Player ID (unique identifier)
    - Player full name

    **Use Cases:**
    - Populate player selection dropdowns
    - Build player lookup tables
    - Display complete player rosters

    **Response Format:**
    Returns a JSON object with a 'players' array containing player objects.

    **Example Response:**
    ```json
    {
        "players": [
            {"id": 1, "name": "LeBron James"},
            {"id": 2, "name": "Stephen Curry"}
        ]
    }
    ```

    **Performance Notes:**
    - Results are not paginated (suitable for current player count ~450)
    - Consider implementing pagination if player count grows significantly
    - Data is cacheable and changes infrequently
    """
)
def get_all_players(request):
    """
    Retrieve all NBA players.

    This endpoint fetches all players from the database and returns them
    in a standardized format. The query is optimized to only fetch
    necessary fields (id, name) to minimize data transfer.

    Returns:
        PlayersResponseSchema: JSON response containing all players

    Raises:
        404: If no players exist in the database (should not happen in normal operation)
    """
    try:
        # Query database for all players, selecting only needed fields
        # Using .values() for performance - only fetches id and name
        players_queryset = Player.objects.all().values('id', 'name')

        # Convert queryset to list for JSON serialization
        players_list = list(players_queryset)

        # Return standardized response format
        return {'players': players_list}

    except Exception as e:
        # Log error for debugging (in production, use proper logging)
        print(f"Error fetching players: {str(e)}")

        # Return error response
        return JsonResponse(
            {'error': 'Unable to fetch players', 'details': str(e)},
            status=500
        )