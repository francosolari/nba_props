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

from typing import Optional

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
def get_all_players(request, search: Optional[str] = None):
    """
    Retrieve all NBA players, optionally filtering by name.

    Args:
        search: Optional substring to filter player names (case-insensitive).
    """
    try:
        players_queryset = Player.objects.all()
        if search:
            players_queryset = players_queryset.filter(name__icontains=search.strip())

        players_list = list(players_queryset.values('id', 'name'))

        return {'players': players_list}

    except Exception as e:
        print(f"Error fetching players: {str(e)}")
        return JsonResponse(
            {'error': 'Unable to fetch players', 'details': str(e)},
            status=500
        )
