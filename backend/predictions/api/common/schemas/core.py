# predictions/api/v2/schemas/core.py
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator
from typing import Literal


class PlayerSchema(BaseModel):
    """
    Represents an NBA player.

    Used for: player listings, team rosters, award selections.
    """
    id: int = Field(..., description="Unique player identifier", example=23)
    name: str = Field(..., description="Player's full name", example="LeBron James")


class TeamSchema(BaseModel):
    """
    Represents an NBA team with conference info.

    Used for: team listings, standings, predictions.
    """
    id: int = Field(..., description="Unique team identifier", example=14)
    name: str = Field(..., description="Team name", example="Los Angeles Lakers")
    conference: Literal["East", "West"] = Field(
        ...,
        description="Conference (East/West)",
        example="West"
    )

    # ✔ Pydantic v2 – field_validator
    @field_validator("name")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:                   # noqa: D401
        return v.strip()