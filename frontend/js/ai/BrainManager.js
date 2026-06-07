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

  _getEdgeFunctionUrl() {
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-extract`;
  }

  _getHeaders() {
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseAnonKey}`,
      "apikey": supabaseAnonKey
    };
  }

  async getSyllabusData(rawText, totalDays, onProgressUpdate) {
    try {
      return await this.callEdgeFunction(rawText, totalDays);
    } catch (error) {
      if (error instanceof CloudExhaustedError) throw error;
      throw new CloudExhaustedError(error.message);
    }
  }

  async callEdgeFunction(text, days, provider = null, apiKey = null) {
    const payload = { text, days };
    if (provider && apiKey) {
      payload.provider = provider;
      payload.api_key = apiKey;
      this.onLog(`Routing to ${provider} via edge function with your key...`);
    } else {
      this.onLog("Routing to cloud AI via edge function...");
    }

    const response = await fetch(this._getEdgeFunctionUrl(), {
      method: "POST",
      headers: this._getHeaders(),
      body: JSON.stringify(payload)
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
    return await this.callEdgeFunction(text, days, provider, apiKey);
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
