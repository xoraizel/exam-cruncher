# verify_contract.py
import sys
from src.engine.models import Syllabus
from src.engine.scheduler import ScheduleEngine

def run_diagnostic():
    print("[-] Initializing Complete Core Engine Diagnostic Test...")
    
    mock_ai_json = {
        "subject_name": "Software Engineering and Modeling (CSIT142)",
        "total_days": 25,
        "modules": [
            {
                "name": "FOUNDATION DAYS (Important)",
                "start_day": 1,
                "end_day": 3,
                "daily_tasks": [
                    {
                        "day": 1,
                        "topics": [
                            {"name": "What is a program?", "is_revision": False},
                            {"name": "Variables & Functions", "is_revision": False},
                            {"name": "Loops & Basic structures", "is_revision": False}
                        ],
                        "focus_notes": "Understand how programs are organized before studying software engineering concepts."
                    },
                    {
                        "day": 2,
                        "topics": [
                            {"name": "Structured Programming", "is_revision": False},
                            {"name": "Modular Programming", "is_revision": False},
                            {"name": "Top Down Thinking", "is_revision": False}
                        ],
                        "focus_notes": "Prepare for Module II coding practices topics."
                    },
                    {
                        "day": 3,
                        "topics": [
                            {"name": "Basic Database Concepts", "is_revision": False},
                            {"name": "Tables, Rows, and Columns", "is_revision": False}
                        ],
                        "focus_notes": "Prepare for ERD and Data Modeling."
                    }
                ]
            }
        ]
    }

    try:
        # Step A: Validate Data Contract
        validated_syllabus = Syllabus(**mock_ai_json)
        print("[✓] Validation Layer: Clear.")
        
        # Step B: Pass validated contract data down directly into the scheduling logic
        engine = ScheduleEngine(validated_syllabus)
        compiled_schedule = engine.crunch()
        
        print("[✓] Schedule Engine: Crunch completed successfully.\n")
        print("Generated Output Blueprint Preview:")
        print("~" * 60)
        print(compiled_schedule)
        print("~" * 60)
        
    except Exception as e:
        print(f"[X] Execution Error Occurred:\n{str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    run_diagnostic()