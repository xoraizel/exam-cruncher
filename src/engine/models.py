# src/engine/models.py
from pydantic import BaseModel, Field
from typing import List, Optional

class Topic(BaseModel):
    name: str = Field(..., description="The individual concept or topic title to study.")
    is_revision: bool = Field(False, description="Flag indicating if this block represents a dedicated revision task.")

class DailyTask(BaseModel):
    day: int = Field(..., ge=1, description="The explicit chronological day number in the plan.")
    topics: List[Topic] = Field(..., description="The group of topics allocated to this day.")
    focus_notes: Optional[str] = Field(None, description="Pedagogical notes, e.g., 'Practice diagrams repeatedly by hand'.")

class Module(BaseModel):
    name: str = Field(..., description="The name of the academic module, unit, or foundational block.")
    start_day: int = Field(..., ge=1, description="The starting day boundary for this module.")
    end_day: int = Field(..., ge=1, description="The ending day boundary for this module.")
    daily_tasks: List[DailyTask] = Field(..., description="Chronological sequence of daily task breakdowns.")

class Syllabus(BaseModel):
    subject_name: str = Field(..., description="The title of the course/subject (e.g., Software Engineering).")
    total_days: int = Field(..., gt=0, description="The comprehensive timeframe target (e.g., 25).")
    modules: List[Module] = Field(..., description="The array of module blocks comprising the structural timeline.")