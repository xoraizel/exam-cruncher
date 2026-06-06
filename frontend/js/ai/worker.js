// frontend/js/ai/worker.js
import { WorkerMLCEngineHandler, MLCEngine } from "https://esm.run/@mlc-ai/web-llm";

// Log immediately to confirm the browser successfully spun up this thread
console.log("[WebLLM Worker] Background thread spawned and operational.");

// Instantiate the core structural execution context
const engine = new MLCEngine();
const handler = new WorkerMLCEngineHandler(engine);

/**
 * Intercept inbound control threads and forward them directly
 * down into WebLLM pipeline layers.
 */
self.onmessage = (msg) => {
  handler.onmessage(msg);
};