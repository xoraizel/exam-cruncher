// frontend/js/ai/inference.js
import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";
import { SYSTEM_PROMPT, generateUserPrompt } from "./prompt_manager.js";
import { LocalEngineSchema } from "./schema.js";

export class LocalInferenceEngine {
  constructor(onLogCallback) {
    this.engine = null;
    this.onLogCallback = onLogCallback || console.log;
    this.selectedModel = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
  }

  async initEngine(onProgressUpdate) {
    if (this.engine) {
      this.onLogCallback("AI Engine already active in local memory. Skipping allocation.");
      return;
    }

    this.onLogCallback(`Initializing WebGPU Local AI Engine [Model: ${this.selectedModel}]...`);

    if (!navigator.gpu) {
      throw new Error("WebGPU is not supported or enabled in this browser.");
    }

    try {
      this.engine = await CreateMLCEngine(
        this.selectedModel,
        {
          initProgressCallback: (report) => {
            this.onLogCallback(`Loading: ${report.text}`);
            if (onProgressUpdate && typeof onProgressUpdate === "function") {
              onProgressUpdate(report.progress);
            }
          }
        }
      );
      this.onLogCallback("Local inference pipeline active.");
    } catch (error) {
      console.error("Initialization error:", error);
      this.onLogCallback(`Init failure: ${error.message || error}`);
      throw error;
    }
  }

  async extractSyllabus(rawText, totalDaysAvailable) {
    if (!this.engine) {
      throw new Error("AI Engine not initialized. Call initEngine() first.");
    }

    const filledUserPrompt = generateUserPrompt(rawText, totalDaysAvailable);
    this.onLogCallback("Running local extraction...");

    try {
      const chatCompletion = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: filledUserPrompt }
        ],
        response_format: {
          type: "json_object",
          schema: JSON.stringify(LocalEngineSchema)
        },
        temperature: 0.2
      });

      const rawJsonOutput = chatCompletion.choices[0].message.content;
      return JSON.parse(rawJsonOutput);
    } catch (error) {
      console.error("Extraction error:", error);
      this.onLogCallback(`Extraction failure: ${error.message || error}`);
      throw error;
    }
  }
}
