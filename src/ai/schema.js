// src/ai/schema.js

export const SyllabusSchema = {
  name: "syllabus_extraction",
  strict: true, // Forces absolute compliance on engines that support it
  schema: {
    type: "object",
    properties: {
      subject: { 
        type: "string", 
        description: "The main course name or topic title extracted from the syllabus." 
      },
      chapters: {
        type: "array",
        description: "A chronological list of chapters or core study modules identified.",
        items: {
          type: "object",
          properties: {
            name: { 
              type: "string", 
              description: "The clear title or theme of the chapter." 
            },
            estimatedHours: { 
              type: "number", 
              description: "Estimated study time required based on content density (typically 1 to 8 hours)." 
            },
            difficulty: { 
              type: "number", 
              description: "Difficulty score from 1 (very basic) to 5 (extremely complex/dense)." 
            },
            priority_weight: { 
              type: "number", 
              description: "Calculated study priority from 1 (low value) to 10 (crucial core exam concept)." 
            },
            confidence_score: { 
              type: "number", 
              description: "The AI's self-assessment confidence score (0.0 to 1.0) regarding this block extraction." 
            }
          },
          required: ["name", "estimatedHours", "difficulty", "priority_weight", "confidence_score"],
          additionalProperties: false
        }
      }
    },
    required: ["subject", "chapters"],
    additionalProperties: false
  }
};