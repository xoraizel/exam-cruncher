# src/engine/scheduler.py
from typing import Dict, Any
from src.engine.models import Syllabus

class ScheduleEngine:
    """
    Deterministic schedule crunching engine that processes a validated 
    Syllabus object and outputs a compiled, customized study plan blueprint.
    """
    def __init__(self, syllabus: Syllabus):
        self.syllabus = syllabus

    def crunch(self) -> str:
        """
        Processes the internal syllabus object structure into a human-readable,
        perfectly formatted daily action plan document matching the project templates.
        """
        lines = []
        lines.append(f"{self.syllabus.total_days}-Day Study Plan — {self.syllabus.subject_name}")
        lines.append("This plan is made so you:")
        lines.append("  - Cover 100% of the syllabus")
        lines.append("  - Understand concepts without overload")
        lines.append("  - Build revision naturally")
        lines.append("  - Prepare for university-style theory exams\n")
        lines.append("Study time target:")
        lines.append("  - 2–3 hours daily is enough if done properly")
        lines.append("  - Spend: 60% understanding | 40% note-making + revision\n")
        lines.append("=" * 60 + "\n")

        # Iterate over modules inside the validated schema
        for module in self.syllabus.modules:
            lines.append(f"MODULE: {module.name}")
            lines.append(f"Days {module.start_day}–{module.end_day}")
            lines.append("-" * 40)
            
            # Map out each day's task sequences explicitly
            for task in module.daily_tasks:
                lines.append(f"Day {task.day}")
                for topic in task.topics:
                    prefix = " [R] " if topic.is_revision else "  - "
                    lines.append(f"{prefix}{topic.name}")
                
                if task.focus_notes:
                    lines.append(f"  * Focus: {task.focus_notes}")
                lines.append("") # Blank spacer line between individual days
                
            lines.append("=" * 60 + "\n")
            
        return "\n".join(lines)