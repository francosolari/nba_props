# File: predictions/api/v2/endpoints/standings.py
"""
Standings API Endpoints

This module handles all standings-related API endpoints including:
- Regular season standings by conference
- In-Season Tournament (IST) standings by group
- Historical standings data

Endpoints:
- GET /standings/{season_slug} - Regular season standings
- GET /ist-standings/{season_slug} - IST standings
"""

from typing import Dict, List, Any
from ninja import Router
from django.shortcuts import get_object_or_404
from django.http import JsonResponse

from predictions.models import (
    Season,
    RegularSeasonStandings,
    InSeasonTournamentStandings
)
from ..schemas import (
    StandingSchema,
    StandingsResponseSchema,
    ISTStandingSchema,
    ErrorSchema
)
from .user_submissions import _resolve_season

# Create router for standings endpoints
router = Router(tags=["Standings"])


@router.get(
    "/{season_slug}",
    response={200: StandingsResponseSchema, 400: ErrorSchema, 404: ErrorSchema},
    summary="Get Regular Season Standings",
    description="""
    Retrieve regular season standings for a specific season, organized by conference.

    This endpoint returns team standings including wins, losses, win percentage,
    and conference position. Data is grouped by Eastern and Western conferences.

    **Path Parameters:**
    - `season_slug`: Season identifier (e.g., "2023-24") or "current" for latest season

    **Special Values:**
    - "current": Automatically fetches the most recent season's standings

    **Response Structure:**
    Returns standings grouped by conference:
    - `east`: Array of Eastern Conference team standings
    - `west`: Array of Western Conference team standings

    **Sorting:**
    Teams are sorted by:
    1. Conference (East vs West)
    2. Position within conference (1st place to 15th place)

    **Example Response:**
    ```json
    {
        "east": [
            {
                "id": 1,
                "name": "Boston Celtics",
                "conference": "East", 
                "wins": 50,
                "losses": 15,
                "position": 1,
                "win_percentage": 0.769
            }
        ],
        "west": [
            {
                "id": 15,
                "name": "Denver Nuggets",
                "conference": "West",
                "wins": 48,
                "losses": 17, 
                "position": 1,
                "win_percentage": 0.738
            }
        ]
    }
    ```

    **Use Cases:**
    - Display conference standings tables
    - Compare team performance across conferences
    - Generate playoff seeding information
    - Create standings-based visualizations

    **Error Responses:**
    - 400: Invalid season slug or current season not found
    - 404: Season exists but no standings data available
    """
)
def get_regular_season_standings(request, season_slug: str):
    """
    Retrieve regular season standings for a specific season.

    This endpoint handles both explicit season slugs and the special "current"
    keyword to fetch the most recent season's standings. Data is organized
    by conference and sorted by position within each conference.

    Args:
        request: HTTP request object
        season_slug: Season identifier or "current" for latest season

    Returns:
        StandingsResponseSchema: Standings grouped by conference

    Raises:
        400: If "current" season cannot be found or season_slug is invalid
        404: If specific season is not found or has no standings data

    Database Queries:
        1. Season lookup by slug (or latest by start_date if "current")
        2. RegularSeasonStandings filtered by season, ordered by conference and position
    """
    try:
        season = _resolve_season(season_slug)

        # Query standings for the season, ordered by conference and position
        standings_queryset = RegularSeasonStandings.objects.filter(
            season=season
        ).select_related('team').order_by('team__conference', 'position')

        # Initialize response data structure
        standings_data = {
            'east': [],
            'west': []
        }

        # Process each standing and group by conference
        for standing in standings_queryset:
            team = standing.team

            # Build standing entry with all required fields
            standing_entry = {
                'id': team.id,
                'name': team.name,
                'conference': team.conference,
                'wins': standing.wins,
                'losses': standing.losses,
                'position': standing.position,
                'win_percentage': standing.win_percentage
            }

            # Add to appropriate conference list
            conference_key = team.conference.lower()
            if conference_key in standings_data:
                standings_data[conference_key].append(standing_entry)
            else:
                # Handle unexpected conference values gracefully
                print(f"Warning: Unexpected conference value: {team.conference}")
                standings_data.setdefault(conference_key, []).append(standing_entry)

        return standings_data

    except Season.DoesNotExist:
        return JsonResponse(
            {"error": f"Season '{season_slug}' not found"},
            status=404
        )
    except Exception as e:
        print(f"Error fetching standings: {str(e)}")
        return JsonResponse(
            {"error": "Unable to fetch standings", "details": str(e)},
            status=500
        )


@router.get(
    "/ist/{season_slug}",
    response={200: Dict[str, Any], 400: ErrorSchema, 404: ErrorSchema},
    summary="Get In-Season Tournament Standings",
    description="""
    Retrieve In-Season Tournament (IST) standings for a specific season.

    The IST features a unique tournament structure with group play followed
    by knockout rounds. This endpoint returns standings organized by:
    - Conference (East/West)
    - Group within each conference (e.g., "East Group A", "West Group B")

    **Path Parameters:**
    - `season_slug`: Season identifier (e.g., "2023-24")

    **Tournament Structure:**
    - Each conference has multiple groups (typically 3 groups of 5 teams)
    - Teams compete within their group during group play
    - Top teams advance to knockout rounds
    - Wildcard spots available for best non-group-winners

    **Response Structure:**
    ```json
    {
        "East": {
            "East Group A": [
                {
                    "team_id": 1,
                    "team_name": "Boston Celtics",
                    "group_rank": 1,
                    "wins": 4,
                    "losses": 0,
                    "point_differential": 48,
                    "wildcard_rank": null,
                    "clinch_group": true,
                    "clinch_knockout": true,
                    "clinch_wildcard": false
                }
            ]
        },
        "West": {
            "West Group B": [...]
        }
    }
    ```

    **Field Descriptions:**
    - `group_rank`: Position within the group (1-5)
    - `point_differential`: Total point differential in IST games
    - `wildcard_rank`: Ranking among non-group-winners for wildcard spots
    - `clinch_group`: Has secured group winner status
    - `clinch_knockout`: Has secured knockout round berth
    - `clinch_wildcard`: Has secured wildcard playoff spot

    **Use Cases:**
    - Display IST group standings tables
    - Show tournament advancement scenarios
    - Calculate wildcard rankings
    - Generate tournament bracket information
    """
)
def get_ist_standings(request, season_slug: str):
    """
    Retrieve In-Season Tournament standings for a specific season.

    This endpoint handles the complex IST tournament structure, organizing
    teams by conference and group, with specialized tournament metrics.

    Args:
        request: HTTP request object
        season_slug: Season identifier

    Returns:
        Dict: IST standings organized by conference and group

    Raises:
        404: If season is not found or has no IST data
        500: If database query fails

    Database Queries:
        1. Season lookup by slug
        2. InSeasonTournamentStandings filtered by season, ordered by conference and group rank
    """
    try:
        # Look up season by slug
        # Use _resolve_season to handle 'current' slug
        season = _resolve_season(season_slug)

        # Query IST standings, ordered by conference and group rank
        ist_standings = InSeasonTournamentStandings.objects.filter(
            season=season
        ).select_related('team').order_by('team__conference', 'ist_group_rank')

        # Initialize nested data structure for conference -> group -> teams
        standings_data = {
            'East': {},
            'West': {}
        }

        # Process each IST standing
        for standing in ist_standings:
            team = standing.team
            conference = team.conference
            group = standing.ist_group  # e.g., 'East Group A'

            # Initialize group if not exists
            if group not in standings_data[conference]:
                standings_data[conference][group] = []

            # Build IST-specific standing entry
            ist_entry = {
                'team_id': team.id,
                'team_name': team.name,
                'group_rank': standing.ist_group_rank,
                'wins': standing.wins,
                'losses': standing.losses,
                'point_differential': standing.ist_differential,
                'wildcard_rank': standing.ist_wildcard_rank,
                'clinch_group': standing.ist_clinch_group,
                'clinch_knockout': standing.ist_clinch_knockout,
                'clinch_wildcard': standing.ist_clinch_wildcard,
            }

            # Add to appropriate group
            standings_data[conference][group].append(ist_entry)

        return standings_data

    except Season.DoesNotExist:
        return JsonResponse(
            {"error": f"Season '{season_slug}' not found"},
            status=404
        )
    except Exception as e:
        print(f"Error fetching IST standings: {str(e)}")
        return JsonResponse(
            {"error": "Unable to fetch IST standings", "details": str(e)},
            status=500
        )