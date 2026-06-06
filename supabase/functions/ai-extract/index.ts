import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYLLABUS_SCHEMA = {
  type: "object",
  properties: {
    subject_name: { type: "string", description: "The title of the course/subject." },
    total_days: { type: "number", description: "The timeframe target." },
    modules: {
      type: "array",
      description: "Module blocks comprising the timeline.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Module name." },
          start_day: { type: "number", description: "Starting day." },
          end_day: { type: "number", description: "Ending day." },
          daily_tasks: {
            type: "array",
            description: "Daily task breakdowns.",
            items: {
              type: "object",
              properties: {
                day: { type: "number", description: "Day number." },
                topics: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Topic title." },
                      is_revision: { type: "boolean", description: "Revision flag." }
                    },
                    required: ["name", "is_revision"],
                    additionalProperties: false
                  }
                },
                focus_notes: { type: "string", description: "Pedagogical notes." }
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
};

const SYSTEM_PROMPT = "You are a professional academic coordinator. Break down raw text syllabi into a clear modular timeline format following the provided JSON schema. Each module should span a range of days and contain daily_tasks with topics. Every module must end with at least one revision day where is_revision is true.";

async function callGroq(text: string, days: number, apiKey: string): Promise<object> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Extract modules from this raw syllabus text and build a ${days}-day study timeline:\n\n${text}\n\nReturn JSON matching the syllabus_extraction schema with subject_name, total_days, and modules containing daily_tasks.` }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "syllabus_extraction",
          strict: true,
          schema: SYLLABUS_SCHEMA
        }
      },
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Groq ${response.status}: ${body}`);
  }

  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}

async function callGemini(text: string, days: number, apiKey: string): Promise<object> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `Extract modules from this raw syllabus text and build a ${days}-day study timeline:\n\n${text}\n\nReturn JSON with subject_name, total_days, and modules containing daily_tasks with topics (each topic has name and is_revision). Every module should end with revision days.` }]
      }],
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SYLLABUS_SCHEMA
      }
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gemini ${response.status}: ${body}`);
  }

  const result = await response.json();
  return JSON.parse(result.candidates[0].content.parts[0].text);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text, days } = await req.json();

    if (!text || !days || days <= 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'text' and 'days' fields." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqKey = Deno.env.get("GroqAi_key") ?? "";
    const geminiKey = Deno.env.get("GoogleAi_key") ?? "";

    let lastError: string = "";

    // Tier 1: Groq
    if (groqKey) {
      try {
        const data = await callGroq(text, days, groqKey);
        return new Response(
          JSON.stringify({ provider: "groq", data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        lastError = `Groq failed: ${err.message}`;
        console.error(lastError);
      }
    }

    // Tier 2: Gemini
    if (geminiKey) {
      try {
        const data = await callGemini(text, days, geminiKey);
        return new Response(
          JSON.stringify({ provider: "gemini", data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        lastError = `Gemini failed: ${err.message}`;
        console.error(lastError);
      }
    }

    // All cloud providers exhausted
    return new Response(
      JSON.stringify({ error: "All cloud AI providers exhausted. Please use local engine or provide your own API key.", detail: lastError }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
