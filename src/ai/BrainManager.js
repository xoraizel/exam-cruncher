// src/ai/BrainManager.js
import { SyllabusSchema } from './schema.js';

export class BrainManager {
    /**
     * @param {Object} userKeys - Object containing the required client tokens
     * @param {string} [userKeys.GROQ_API_KEY]
     * @param {string} [userKeys.GEMINI_API_KEY]
     */
    constructor(userKeys = {}) {
        // Core Cloud providers list defining sequential order of fallback execution
        this.providers = ['GROQ', 'GEMINI'];
        this.currentProviderIndex = 0;
        this.keys = userKeys;
    }

    /**
     * Main Entry Point called when a student hits "Generate Schedule"
     * * @param {string} rawText - Unstructured syllabus copy-pasted block
     * @param {number} totalDays - Remaining calendar timeframe until the exam day
     * @returns {Promise<Object>} Structurally validated syllabus object matching schema contract
     */
    async getSyllabusData(rawText, totalDays) {
        // Reset the balancing cycle counter to start fresh from the first choice
        this.currentProviderIndex = 0;

        try {
            // 1. Try cloud providers invisibly first (Groq -> Gemini fallback)
            return await this.attemptCloudParse(rawText, totalDays);
        } catch (error) {
            console.warn("Cloud parsing network tier fully exhausted. Reason:", error.message);
            
            // 2. Clear failover safety check: Intercept with warning pop-up
            // BEFORE executing heavy local compute routines inside the client engine.
            const userAgreed = await this.promptUserForLocalInference();
            if (userAgreed) {
                return await this.launchLocalEngine(rawText, totalDays);
            } else {
                throw new Error("Analysis safely halted by explicit user preference.");
            }
        }
    }

    /**
     * Loops through available cloud resources recursively without throwing errors out to the UI
     */
    async attemptCloudParse(text, days) {
        if (this.currentProviderIndex >= this.providers.length) {
            throw new Error("All aggregated free-tier API services hit rate limits or downtime.");
        }

        const provider = this.providers[this.currentProviderIndex];
        console.log(`[BrainManager] Routing analysis stream to cloud link: ${provider}...`);

        try {
            let optimizedJson;
            if (provider === 'GROQ') {
                optimizedJson = await this.callGroqAPI(text, days);
            } else if (provider === 'GEMINI') {
                optimizedJson = await this.callGeminiAPI(text, days);
            }
            
            console.log(`[BrainManager] Execution succeeded via ${provider}. Parsing complete.`);
            return optimizedJson;
        } catch (apiError) {
            console.error(`[BrainManager] Provider target ${provider} failed. Escalating up the tier chain...`);
            
            // Increment fallback cursor array pointer and trigger tail-recursion retry
            this.currentProviderIndex++;
            return await this.attemptCloudParse(text, days);
        }
    }

    /**
     * Connects directly to Groq's high-speed completion layer
     */
    async callGroqAPI(text, days) {
        const apiKey = this.keys.GROQ_API_KEY;
        if (!apiKey) throw new Error("API Key for Groq is not configured.");

        // Using llama-3.3-70b-versatile for exceptional JSON schema tracking
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
                        content: "You are a professional academic coordinator. You must break down raw text syllabi into a clear modular timeline format structure following the provided JSON schema definitions perfectly." 
                    },
                    { 
                        role: "user", 
                        content: `Extract modules from this raw text block:\n\n${text}\n\nOptimize parameters calculation considering an active study plan target of exactly ${days} total days.` 
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
            throw new Error(`Groq edge response returned invalid status code: ${response.status}`);
        }

        const result = await response.json();
        return JSON.parse(result.choices[0].message.content);
    }

    /**
     * Connects directly to Google's high-context native Gemini layer
     */
    async callGeminiAPI(text, days) {
        const apiKey = this.keys.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API Key for Gemini is not configured.");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Extract modules from this raw text block:\n\n${text}\n\nOptimize parameters calculation considering an active study plan target of exactly ${days} total days.` }]
                }],
                systemInstruction: {
                    parts: [{ text: "You are a professional academic coordinator. You must break down raw text syllabi into a clear modular timeline format structure following the provided JSON schema definitions perfectly." }]
                },
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: SyllabusSchema.schema
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini edge response returned invalid status code: ${response.status}`);
        }

        const result = await response.json();
        return JSON.parse(result.candidates[0].content.parts[0].text);
    }

    /**
     * Displays a non-blocking explicit prompt UI dialog to shield browser VRAM/RAM 
     */
    async promptUserForLocalInference() {
        return new Promise((resolve) => {
            const userConsent = confirm(
                "⚠️ Free Cloud Server Paths Busy!\n\n" +
                "Our remote parsing streams are handling maximum load or limits are hit. " +
                "To process your data right now, we can boot a sandboxed Local WebLLM Engine directly in your browser tab.\n\n" +
                "Would you like to turn on Local Device Processing? (This utilizes your local VRAM/RAM until the parsing completes)"
            );
            resolve(userConsent);
        });
    }

    /**
     * Safely runs local on-device machine tasks once allowed by user
     */
    async launchLocalEngine(text, days) {
        console.log("[BrainManager] Triggering Local engine initialization under explicit user approval.");
        
        // This is where your client-side model engine pipeline triggers (e.g., Transformers.js / WebLLM)
        // For testing the step hook-up, returning mock architecture data structured exactly like our contract:
        return {
            subject: "Fallback Class (Processed On-Device)",
            chapters: [
                { 
                    name: "Local Core Module 1", 
                    estimatedHours: 4, 
                    difficulty: 3, 
                    priority_weight: 7, 
                    confidence_score: 0.9 
                }
            ]
        };
    }
}