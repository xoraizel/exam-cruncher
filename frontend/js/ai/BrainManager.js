// frontend/js/ai/BrainManager.js
import { SyllabusSchema } from './schema.js';
import { LocalInferenceEngine } from './inference.js';

export class BrainManager {
  constructor(userKeys = {}, onLogCallback) {
    this.providers = ['GROQ', 'GEMINI'];
    this.currentProviderIndex = 0;
    this.keys = userKeys;
    this.onLog = onLogCallback || console.log;
  }

  async getSyllabusData(rawText, totalDays, onProgressUpdate) {
    this.currentProviderIndex = 0;

    try {
      return await this.attemptCloudParse(rawText, totalDays);
    } catch (error) {
      console.warn("Cloud parsing tier fully exhausted:", error.message);
      this.onLog("Cloud tier exhausted. Prompting for local engine fallback...");

      const userAgreed = await this.promptUserForLocalInference();
      if (userAgreed) {
        return await this.launchLocalEngine(rawText, totalDays, onProgressUpdate);
      } else {
        throw new Error("Analysis halted by user preference.");
      }
    }
  }

  async attemptCloudParse(text, days) {
    if (this.currentProviderIndex >= this.providers.length) {
      throw new Error("All free-tier API services hit rate limits or downtime.");
    }

    const provider = this.providers[this.currentProviderIndex];
    this.onLog(`Routing to cloud: ${provider}...`);

    try {
      let result;
      if (provider === 'GROQ') {
        result = await this.callGroqAPI(text, days);
      } else if (provider === 'GEMINI') {
        result = await this.callGeminiAPI(text, days);
      }
      this.onLog(`${provider} extraction succeeded.`);
      return result;
    } catch (apiError) {
      this.onLog(`${provider} failed: ${apiError.message}. Escalating...`);
      this.currentProviderIndex++;
      return await this.attemptCloudParse(text, days);
    }
  }

  async callGroqAPI(text, days) {
    const apiKey = this.keys.GROQ_API_KEY;
    if (!apiKey) throw new Error("Groq API Key not configured.");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a professional academic coordinator. You must break down raw text syllabi into a clear modular timeline format following the provided JSON schema definitions perfectly. Each module should span a range of days and contain daily_tasks with topics. Every module must end with at least one revision day where is_revision is true."
          },
          {
            role: "user",
            content: `Extract modules from this raw syllabus text and build a ${days}-day study timeline:\n\n${text}\n\nReturn JSON matching the syllabus_extraction schema with subject_name, total_days, and modules containing daily_tasks.`
          }
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
    return JSON.parse(result.choices[0].message.content);
  }

  async callGeminiAPI(text, days) {
    const apiKey = this.keys.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API Key not configured.");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Extract modules from this raw syllabus text and build a ${days}-day study timeline:\n\n${text}\n\nReturn JSON with subject_name, total_days, and modules containing daily_tasks with topics (each topic has name and is_revision fields). Every module should end with revision days.` }]
        }],
        systemInstruction: {
          parts: [{ text: "You are a professional academic coordinator. You must break down raw text syllabi into a clear modular timeline format. Return strictly valid JSON matching the schema with subject_name, total_days, and modules containing daily_tasks." }]
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
    return JSON.parse(result.candidates[0].content.parts[0].text);
  }

  async promptUserForLocalInference() {
    return new Promise((resolve) => {
      const userConsent = confirm(
        "Cloud API paths are busy or limits are hit.\n\n" +
        "To process your data now, we can run a Local WebLLM Engine in your browser.\n\n" +
        "Turn on Local Device Processing? (Uses your GPU/RAM until parsing completes)"
      );
      resolve(userConsent);
    });
  }

  async launchLocalEngine(text, days, onProgressUpdate) {
    this.onLog("Booting local WebLLM engine under user approval...");

    const localEngine = new LocalInferenceEngine(this.onLog);
    await localEngine.initEngine(onProgressUpdate);
    const result = await localEngine.extractSyllabus(text, days);
    this.onLog("Local engine extraction complete.");
    return result;
  }
}
