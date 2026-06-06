// frontend/js/ai/inference.js
import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";
import { SYSTEM_PROMPT, generateUserPrompt } from "./prompt_manager.js";

export class LocalInferenceEngine {
    constructor(onLogCallback) {
        this.engine = null;
        this.onLogCallback = onLogCallback || console.log;
        
        // VRAM CAP FIX: Downsized from 3B to 1.5B parameter model to fit comfortably 
        // within standard integrated graphics processing card context boundaries.
        this.selectedModel = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
    }

    async initEngine(onProgressUpdate) {
        // MEMORY LEAK GUARD: Prevents stacking duplicate model copies in VRAM if triggered repeatedly
        if (this.engine) {
            this.onLogCallback("AI Engine already active in local graphics memory. Skipping allocation.");
            return;
        }

        this.onLogCallback(`Initializing WebGPU Local AI Engine [Model: ${this.selectedModel}]...`);

        if (!navigator.gpu) {
            this.onLogCallback("CRITICAL ERROR: WebGPU is not supported or enabled in this browser.");
            return;
        }

        try {
            this.engine = await CreateMLCEngine(
                this.selectedModel,
                { 
                    initProgressCallback: (report) => {
                        this.onLogCallback(`Loading Model Shards: ${report.text}`);
                        if (onProgressUpdate && typeof onProgressUpdate === "function") {
                            onProgressUpdate(report.progress);
                        }
                    } 
                }
            );
            this.onLogCallback("Success! Local Inference Pipeline successfully active inside browser cache.");
        } catch (error) {
            console.error("PIPELINE EXCEPTION DURING INITIALIZATION:", error);
            this.onLogCallback(`Initialization Failure: ${error.message || error}`);
            throw error;
        }
    }

    async extractSyllabus(rawText, totalDaysAvailable) {
        if (!this.engine) {
            throw new Error("AI Engine not initialized yet. Call initEngine() first.");
        }

        const filledUserPrompt = generateUserPrompt(rawText, totalDaysAvailable);
        this.onLogCallback("Analyzing text structure and reasoning workload complexity...");

        // STRUCTURAL REINFORCEMENT: Explicit structural map targeting your custom sorting logic templates
        const syllabusSchema = {
            type: "object",
            properties: {
                chapters: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            difficulty: { type: "string" },  // Expects values like "Easy", "Medium", "Hard"
                            timeEstimate: { type: "number" } // Numeric processing score for sorting algorithms
                        },
                        required: ["name", "difficulty", "timeEstimate"]
                    }
                }
            },
            required: ["chapters"]
        };

        try {
            const chatCompletion = await this.engine.chat.completions.create({
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: filledUserPrompt }
                ],
                response_format: { 
                    type: "json_object", 
                    // CRITICAL BINDING FIX: The parsing compiler strict-requires this argument 
                    // to be stringified. Passing an unstringified JS object triggers a native crash.
                    schema: JSON.stringify(syllabusSchema) 
                },
                temperature: 0.2
            });

            const rawJsonOutput = chatCompletion.choices[0].message.content;
            return JSON.parse(rawJsonOutput);
        } catch (error) {
            console.error("PIPELINE EXCEPTION DURING TEXT EXTRACTION:", error);
            this.onLogCallback(`Extraction Failure: ${error.message || error}`);
            throw error;
        }
    }
}