// frontend/js/ai/BrainManager.js
import { SyllabusSchema } from './schema.js';
import { LocalInferenceEngine } from './inference.js';

export class CloudExhaustedError extends Error {
  constructor(message = "Cloud AI providers exhausted.") {
    super(message);
    this.name = "CloudExhaustedError";
  }
}

export class BrainManager {
  constructor(onLogCallback) {
    this.onLog = onLogCallback || console.log;
  }

  async getSyllabusData(rawText, totalDays, onProgressUpdate) {
    try {
      return await this.callEdgeFunction(rawText, totalDays);
    } catch (error) {
      if (error instanceof CloudExhaustedError) throw error;
      // Treat any other failure as cloud exhausted
      throw new CloudExhaustedError(error.message);
    }
  }

  async callEdgeFunction(text, days) {
    this.onLog("Routing to cloud AI via edge function...");

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const url = `${supabaseUrl}/functions/v1/ai-extract`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "apikey": supabaseAnonKey
      },
      body: JSON.stringify({ text, days })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      const msg = body.error || body.detail || `Edge function returned ${response.status}`;
      if (response.status === 503) {
        throw new CloudExhaustedError(msg);
      }
      throw new Error(msg);
    }

    const result = await response.json();
    if (result.error) {
      throw new CloudExhaustedError(result.error);
    }

    this.onLog(`Cloud extraction succeeded via ${result.provider}.`);
    return result.data;
  }

  async runWithUserKey(text, days, provider, apiKey) {
    if (provider === 'groq') {
      return await this.callGroqDirect(text, days, apiKey);
    } else if (provider === 'gemini') {
      return await this.callGeminiDirect(text, days, apiKey);
    }
    throw new Error(`Unknown provider: ${provider}`);
  }

  async callGroqDirect(text, days, apiKey) {
    this.onLog("Calling Groq directly with your key...");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a professional academic coordinator. Break down raw text syllabi into a clear modular timeline format following the provided JSON schema. Each module should span a range of days and contain daily_tasks with topics. Every module must end with at least one revision day where is_revision is true." },
          { role: "user", content: `Extract modules from this raw syllabus text and build a ${days}-day study timeline:\n\n${text}\n\nReturn JSON matching the syllabus_extraction schema with subject_name, total_days, and modules containing daily_tasks.` }
        ],
        response_format: {
          type: "json_schema",
          json_schema: SyllabusSchema
        },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`Groq returned ${response.status}: ${errBody}`);
    }

    const result = await response.json();
    this.onLog("Groq extraction succeeded.");
    return JSON.parse(result.choices[0].message.content);
  }

  async callGeminiDirect(text, days, apiKey) {
    this.onLog("Calling Gemini directly with your key...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Extract modules from this raw syllabus text and build a ${days}-day study timeline:\n\n${text}\n\nReturn JSON with subject_name, total_days, and modules containing daily_tasks with topics (each topic has name and is_revision). Every module should end with revision days.` }]
        }],
        systemInstruction: {
          parts: [{ text: "You are a professional academic coordinator. Break down raw text syllabi into a clear modular timeline format. Return strictly valid JSON matching the schema with subject_name, total_days, and modules containing daily_tasks." }]
        },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: SyllabusSchema.schema
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`Gemini returned ${response.status}: ${errBody}`);
    }

    const result = await response.json();
    this.onLog("Gemini extraction succeeded.");
    return JSON.parse(result.candidates[0].content.parts[0].text);
  }

  async runLocalEngine(text, days, onProgressUpdate) {
    this.onLog("Booting local WebLLM engine...");

    const localEngine = new LocalInferenceEngine(this.onLog);
    await localEngine.initEngine(onProgressUpdate);
    const result = await localEngine.extractSyllabus(text, days);
    this.onLog("Local engine extraction complete.");
    return result;
  }
}
