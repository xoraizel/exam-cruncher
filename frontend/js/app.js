// frontend/js/app.js
import { LocalInferenceEngine } from './ai/inference.js';

// DOM Element Selectors
const consoleLog = document.getElementById('status-console');
const outputArea = document.getElementById('output-area');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const syllabusInput = document.getElementById('syllabus-input');
const daysInput = document.getElementById('days-input');

/**
 * Appends stream lines into our simulated UI terminal console
 * and forces auto-scrolling to the latest log item.
 */
function updateConsole(msg) {
    if (consoleLog) {
        consoleLog.innerText += `\n> ${msg}`;
        consoleLog.scrollTop = consoleLog.scrollHeight;
    } else {
        consoleLog.innerText = `> ${msg}`;
    }
}

/**
 * Main Application Orchestration Pipeline
 */
export async function startCrunchPipeline() {
    const rawText = syllabusInput ? syllabusInput.value.trim() : "";
    const days = daysInput ? parseInt(daysInput.value, 10) : 0;

    // 1. Validation Checks
    if (!rawText) {
        alert("Please paste your raw syllabus text before running execution.");
        return;
    }
    if (isNaN(days) || days <= 0) {
        alert("Please enter a valid number of days remaining until your exam.");
        return;
    }

    // 2. Clear previous UI state
    if (outputArea) outputArea.style.display = "none";
    consoleLog.innerText = "> Initializing Client-Side Pipeline...";
    
    // 3. Reveal and reset progress bar components
    if (progressContainer && progressBar) {
        progressContainer.style.display = "block";
        progressBar.style.width = "0%";
        progressBar.style.backgroundColor = "var(--accent-color, #3b82f6)"; // Reset back to theme primary blue
    }
    
    try {
        // 4. Instantiate local model loader
        const aiEngine = new LocalInferenceEngine(updateConsole);
        
        // 5. Fire initialization and feed progress directly to the visual bar width
        await aiEngine.initEngine((progressDecimal) => {
            const percentage = Math.round(progressDecimal * 100);
            if (progressBar) {
                progressBar.style.width = `${percentage}%`;
            }
        });
        
        // Smoothly fade out progress bar container shortly after hitting 100%
        setTimeout(() => {
            if (progressContainer) progressContainer.style.display = "none";
        }, 1000);

        // 6. Execute local structural AI extraction
        const extractedJson = await aiEngine.extractSyllabus(rawText, days);
        updateConsole("AI structural extraction contract fulfilled successfully.");
        updateConsole("Passing structured payload to Deterministic Algorithmic Crunch Engine...");

        // 7. Update UI to present the resulting output container
        if (outputArea) {
            outputArea.style.display = "block";
            outputArea.innerText = `--- Dynamic Plan Generated Successfully ---\n\nSubject Detected: ${extractedJson.subject_name || "Unknown Course"}\nTarget Framework: ${days} Days\n\n[Syllabus layout structures parsed successfully inside local cache browser instances. Passing data payload to custom template calculation layer...]`;
            outputArea.scrollTop = 0;
        }
        
    } catch (err) {
        // Handle failure vectors (e.g., Browser lacks WebGPU support, model download interrupted)
        updateConsole(`Runtime Exception: ${err.message}`);
        
        if (progressBar) {
            progressBar.style.width = "100%";
            progressBar.style.backgroundColor = "#ef4444"; // Changes progress bar into a warning red signaling failure
        }
        console.error("Pipeline breakdown details:", err);
    }
}

// Automatically bind the pipeline process to your crunch button once the DOM finishes loading
document.addEventListener("DOMContentLoaded", () => {
    const crunchButton = document.getElementById("crunch-btn"); // Ensure your html button has id="crunch-btn"
    if (crunchButton) {
        crunchButton.addEventListener("click", startCrunchPipeline);
    }
});