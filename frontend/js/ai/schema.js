// frontend/js/ai/schema.js
// Unified schema matching the Python Pydantic models (models.py)

export const SyllabusSchema = {
  name: "syllabus_extraction",
  strict: true,
  schema: {
    type: "object",
    properties: {
      subject_name: {
        type: "string",
        description: "The title of the course/subject (e.g., Software Engineering)."
      },
      total_days: {
        type: "number",
        description: "The comprehensive timeframe target (e.g., 25)."
      },
      modules: {
        type: "array",
        description: "The array of module blocks comprising the structural timeline.",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the academic module, unit, or foundational block."
            },
            start_day: {
              type: "number",
              description: "The starting day boundary for this module."
            },
            end_day: {
              type: "number",
              description: "The ending day boundary for this module."
            },
            daily_tasks: {
              type: "array",
              description: "Chronological sequence of daily task breakdowns.",
              items: {
                type: "object",
                properties: {
                  day: {
                    type: "number",
                    description: "The explicit chronological day number in the plan."
                  },
                  topics: {
                    type: "array",
                    description: "The group of topics allocated to this day.",
                    items: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                          description: "The individual concept or topic title to study."
                        },
                        is_revision: {
                          type: "boolean",
                          description: "Flag indicating if this block represents a dedicated revision task."
                        }
                      },
                      required: ["name", "is_revision"],
                      additionalProperties: false
                    }
                  },
                  focus_notes: {
                    type: "string",
                    description: "Pedagogical notes, e.g., 'Practice diagrams repeatedly by hand'."
                  }
                },
                required: ["day", "topics"],
                additionalProperties: false
              }
            }
          },
          required: ["name", "start_day", "end_day", "daily_tasks"],
          additionalProperties: false
        }
      }
    },
    required: ["subject_name", "total_days", "modules"],
    additionalProperties: false
  }
};

// Lightweight schema for WebLLM's json_object mode (no json_schema support)
export const LocalEngineSchema = {
  type: "object",
  properties: {
    subject_name: { type: "string" },
    total_days: { type: "number" },
    modules: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          start_day: { type: "number" },
          end_day: { type: "number" },
          daily_tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "number" },
                topics: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      is_revision: { type: "boolean" }
                    },
                    required: ["name", "is_revision"]
                  }
                },
                focus_notes: { type: "string" }
              },
              required: ["day", "topics"]
            }
          }
        },
        required: ["name", "start_day", "end_day", "daily_tasks"]
      }
    }
  },
  required: ["subject_name", "total_days", "modules"]
};
