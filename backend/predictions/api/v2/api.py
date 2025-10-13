# File: predictions/api/v2/api.py
"""
NBA Predictions API v2 - Main API Instance

This module creates and configures the main Django Ninja API instance
for version 2 of the NBA Predictions API. It includes all endpoint routers,
authentication, error handling, and API documentation.

The API provides:
- Type-safe endpoints with automatic validation
- OpenAPI/Swagger documentation
- Standardized error responses
- Authentication integration
- Comprehensive logging

API Structure:
- /players - Player-related endpoints
- /teams - Team-related endpoints  
- /standings - Standings and tournament data
- /leaderboard - User rankings and scoring
- /predictions - User predictions and submissions
- /seasons - Season management and metadata
"""

from ninja import NinjaAPI
from ninja.security import django_auth
from django.http import JsonResponse

# Import endpoint routers
from .endpoints.players import router as players_router
from .endpoints.teams import router as teams_router
from .endpoints.standings import router as standings_router
from .endpoints.homepage import router as homepage_router
from .endpoints.answers import router as answers_router
from .endpoints.leaderboard import router as leaderboards_router
from .endpoints.seasons import router as seasons_router
from .endpoints.user_submissions import router as submissions_router
from .endpoints.admin_questions import router as admin_questions_router

# Import schemas for documentation
from .schemas import ErrorSchema

# Import utilities
from .utils import get_user_context

# Create main API instance with comprehensive metadata
api = NinjaAPI(
    title="NBA Predictions API v2",
    version="2.0.0",
    description="""
    # NBA Predictions API v2
    
    A modern, type-safe REST API for NBA predictions and fantasy basketball.
    
    ## Features
    
    - **Type Safety**: Full Pydantic validation for requests and responses
    - **Auto Documentation**: Interactive OpenAPI/Swagger docs
    - **Authentication**: Django session and token authentication
    - **Error Handling**: Standardized error responses with details
    - **Performance**: Optimized database queries and caching
    
    ## API Versions
    
    - **v1** (Legacy): Traditional Django views at `/api/v1/`
    - **v2** (Current): Django Ninja implementation at `/api/v2/`
    
    ## Authentication
    
    Most endpoints are public, but user-specific operations require authentication:
    - Session authentication for web frontend
    - Token authentication for mobile/external apps
    - Login required for: submitting predictions, viewing personal data
    
    ## Rate Limiting
    
    - Public endpoints: 1000 requests/hour per IP
    - Authenticated endpoints: 5000 requests/hour per user
    - Bulk operations: 100 requests/hour per user
    
    ## Error Responses
    
    All errors follow a consistent format:
    ```json
    {
        "error": "Description of what went wrong",
        "details": "Additional technical details (optional)"
    }
    ```
    
    ## Changelog
    
    ### v2.0.0 (Current)
    - Initial Django Ninja implementation
    - Type-safe schemas and validation
    - Improved error handling
    - Interactive API documentation
    
    ### v1.0.0 (Legacy)
    - Original Django views implementation
    - Available at `/api/v1/` for backward compatibility
    """,
    docs_url="/docs/",  # Interactive documentation at /api/v2/docs/
    openapi_url="/openapi.json",  # OpenAPI schema at /api/v2/openapi.json
)


# ====================
# GLOBAL ERROR HANDLERS
# ====================

@api.exception_handler(ValueError)
def value_error_handler(request, exc):
    """
    Handle ValueError exceptions with user-friendly messages.
    
    Common causes: Invalid enum values, malformed data, business logic violations
    """
    return JsonResponse(
        {
            "error": "Invalid value provided",
            "details": str(exc)
        },
        status=400
    )


@api.exception_handler(PermissionError)
def permission_error_handler(request, exc):
    """
    Handle permission errors for unauthorized access attempts.
    """
    return JsonResponse(
        {
            "error": "Permission denied",
            "details": "You don't have permission to access this resource"
        },
        status=403
    )


# ====================
# ROOT ENDPOINT - THIS FIXES THE /api/v2/ 404
# ====================

@api.get(
    "/",
    summary="API Information",
    description="Root endpoint providing API information and available endpoints",
    tags=["System"]
)
def api_root(request):
    """
    API root endpoint providing basic information and navigation.

    This endpoint gives you an overview of the API and links to important resources.
    Use this when you visit /api/v2/ directly in your browser.
    """
    return {
        "message": "Welcome to NBA Predictions API v2",
        "version": "2.0.0",
        "documentation": "/api/v2/docs/",
        "openapi_schema": "/api/v2/openapi.json",
        "available_endpoints": {
            "players": "/api/v2/players/",
            "teams": "/api/v2/teams/",
            "standings": "/api/v2/standings/{season_slug}",
            "ist_standings": "/api/v2/standings/ist/{season_slug}",
            "leaderboard": "/api/v2/leaderboard/{season_slug}",
            "latest_season": "/api/v2/latest-season",
            "health": "/api/v2/health"
        },
        "examples": {
            "get_teams": "/api/v2/teams/",
            "current_standings": "/api/v2/standings/current",
            "2023_24_standings": "/api/v2/standings/2023-24"
        }
    }


# ====================
# HEALTH CHECK ENDPOINT
# ====================

@api.get(
    "/health",
    summary="API Health Check",
    description="Simple health check endpoint to verify API availability",
    tags=["System"]
)
def health_check(request):
    """
    API health check endpoint.
    
    Returns basic system status and API version information.
    Useful for monitoring, load balancer health checks, and debugging.
    
    Returns:
        dict: API status and metadata
    """
    return {
        "status": "healthy",
        "version": "2.0.0",
        "api": "NBA Predictions API v2",
        "docs": "/api/v2/docs/"
    }


@api.get(
    "/user/context",
    summary="Get User Context",
    description="Get information about the current user including admin status",
    tags=["System"]
)
def get_current_user_context(request):
    """
    Get information about the current authenticated user.
    Includes admin status for conditional UI rendering.
    
    Returns:
        dict: User context information
    """
    return get_user_context(request)


# ====================
# REGISTER ENDPOINT ROUTERS
# ====================

# Add all endpoint routers to the main API
api.add_router("/players", players_router)
api.add_router("/teams", teams_router)
api.add_router("/standings", standings_router)
api.add_router("/homepage/", homepage_router)
api.add_router("/answers/", answers_router)
api.add_router("/leaderboards/", leaderboards_router)
api.add_router("/seasons/", seasons_router)
api.add_router("/submissions", submissions_router)
api.add_router("/admin", admin_questions_router)

# ====================
# TEMPORARY PLACEHOLDER ENDPOINTS
# ====================
# These maintain API compatibility while full implementation is completed

from typing import Optional
from django.shortcuts import get_object_or_404
from django.db.models import Sum
from predictions.models import Season, UserStats

@api.get(
    "/leaderboard/{season_slug}",
    summary="Get Season Leaderboard",
    description="Retrieve user rankings for a specific season (temporary implementation)",
    tags=["Leaderboard"]
)
def get_leaderboard_temp(request, season_slug: str):
    """Temporary leaderboard endpoint - will be moved to dedicated router"""
    try:
        if season_slug == "current":
            season = Season.objects.order_by('-end_date').first()
            if not season:
                return JsonResponse({"error": "Could not find the latest season"}, status=400)
        else:
            season = get_object_or_404(Season, slug=season_slug)
        
        top_users = UserStats.objects.filter(season=season).order_by('-points')
        
        leaderboard_data = []
        for stat in top_users:
            user_data = {
                'id': stat.user.id,
                'username': stat.user.username,
                'first_name': stat.user.first_name,
                'last_name': stat.user.last_name,
                'display_name': f"{stat.user.first_name} {stat.user.last_name[0]}" if stat.user.last_name else stat.user.first_name,
            }
            leaderboard_data.append({
                'user': user_data,
                'points': stat.points,
            })
        
        return {'top_users': leaderboard_data}
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@api.get(
    "/latest-season",
    summary="Get Latest Season",
    description="Get the slug of the most recent season",
    tags=["Seasons"]
)
def get_latest_season_temp(request):
    """Temporary latest season endpoint - will be moved to dedicated router"""
    latest_season = Season.objects.order_by('-end_date').first()
    return {'slug': latest_season.slug if latest_season else None}


# ====================
# API INSTANCE EXPORT
# ====================

# Export the configured API instance for use in URL routing
# __all__ = ['api']
