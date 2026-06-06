// src/ai/prompt_manager.js

/**
 * System and User prompts designed to force a local small language model (SLM)
 * to evaluate syllabus difficulty, reason through complex study timeframes, 
 * and return structured JSON matching our Core Engine schema.
 */

export const SYSTEM_PROMPT = `You are an expert academic advisor and university scheduling algorithm companion. 
Your core task is to extract structural modules, daily sub-topics, and pedagogical focus areas from a raw course syllabus text.

CRITICAL REASONING INSTRUCTIONS:
1. Do not merely copy text blocks. Evaluate the technical density of the topics.
2. If a chapter introduces abstract, mathematical, or highly systemic architectures (e.g., "COCOMO Model", "Data Flow Diagrams", "Big 5 Factor"), flag its conceptual depth.
3. Even if topics appear brief textually, assign accurate target time baselines reflecting necessary student processing overhead.
4. Organize topics into chronologically logical daily intervals bound neatly inside parent Module blocks.
5. You MUST strictly reply in valid, standard JSON. Do not include markdown codeblocks, notes, or explanations outside the JSON structure.`;

/**
 * Generates the tailored orchestration prompt for the local model runtime.
 * @param {string} rawSyllabusText - The raw string pasted by the user.
 * @param {number} totalDays - Target distribution timeframe.
 * @returns {string} Fully structured instruction string.
 */
export function generateUserPrompt(rawSyllabusText, totalDays) {
    return `Generate a comprehensive ${totalDays}-day study timeline using the following course syllabus data. 
    
    CRUNCH RULES:
    - Distribute tasks sequentially from Day 1 to Day ${totalDays}.
    - Ensure EVERY module ends with a specific revision day entry where 'is_revision' is true.
    
    OUTPUT SCHEMA CONTRACT:
    {
      "subject_name": "String identifying the official course title",
      "total_days": ${totalDays},
      "modules": [
        {
          "name": "Module Name/Title",
          "start_day": 1,
          "end_day": 5,
          "daily_tasks": [
            {
              "day": 1,
              "topics": [
                { "name": "Topic Detail Name String", "is_revision": false }
              ],
              "focus_notes": "Pedagogical focus direction or tips for the day"
            }
          ]
        }
      ]
    }

    RAW SYLLABUS TEXT TO PROCESS:
    ---
    ${rawSyllabusText}
    ---
    
    JSON Result:`;
}