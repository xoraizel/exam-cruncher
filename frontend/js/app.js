// frontend/js/app.js
import { BrainManager } from './ai/BrainManager.js';
import { ScheduleEngine } from './engine/scheduler.js';

const consoleLog = document.getElementById('status-console');
const outputArea = document.getElementById('output-area');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const syllabusInput = document.getElementById('syllabus-input');
const daysInput = document.getElementById('days-input');
const crunchBtn = document.getElementById('crunch-btn');

function updateConsole(msg) {
  if (consoleLog) {
    consoleLog.innerText += `\n> ${msg}`;
    consoleLog.scrollTop = consoleLog.scrollHeight;
  }
}

function setProgress(percent, color) {
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
    if (color) progressBar.style.backgroundColor = color;
  }
}

function validateSyllabusData(data) {
  if (!data || !data.subject_name || !Array.isArray(data.modules)) {
    throw new Error("AI returned invalid data structure. Missing subject_name or modules.");
  }
  for (const mod of data.modules) {
    if (!mod.name || !Array.isArray(mod.daily_tasks)) {
      throw new Error(`Module "${mod.name || 'unnamed'}" is missing daily_tasks.`);
    }
  }
  return true;
}

async function startCrunchPipeline() {
  const rawText = syllabusInput ? syllabusInput.value.trim() : "";
  const days = daysInput ? parseInt(daysInput.value, 10) : 0;

  if (!rawText) {
    alert("Please paste your raw syllabus text before running.");
    return;
  }
  if (isNaN(days) || days <= 0) {
    alert("Please enter a valid number of days.");
    return;
  }

  // Reset UI
  if (outputArea) outputArea.style.display = "none";
  consoleLog.innerText = "> Starting Exam Cruncher pipeline...";
  if (progressContainer && progressBar) {
    progressContainer.style.display = "block";
    setProgress(5, "var(--accent-color)");
  }
  crunchBtn.disabled = true;
  crunchBtn.textContent = "Crunching...";

  try {
    const brain = new BrainManager(updateConsole);
    updateConsole("Routing through AI extraction tier...");

    const extractedData = await brain.getSyllabusData(rawText, days, (progressDecimal) => {
      const pct = Math.round(5 + progressDecimal * 90);
      setProgress(pct);
    });

    updateConsole("Validating extracted data contract...");
    validateSyllabusData(extractedData);
    extractedData.total_days = days;

    setProgress(95);
    updateConsole("Running deterministic schedule crunch engine...");

    const engine = new ScheduleEngine(extractedData);
    const compiledPlan = engine.crunch();

    setProgress(100);
    setTimeout(() => {
      if (progressContainer) progressContainer.style.display = "none";
    }, 800);

    if (outputArea) {
      outputArea.style.display = "block";
      outputArea.innerText = compiledPlan;
      outputArea.scrollTop = 0;
    }
    updateConsole("Schedule generated successfully.");

  } catch (err) {
    updateConsole(`Error: ${err.message}`);
    setProgress(100, "#ef4444");
    console.error("Pipeline error:", err);
  } finally {
    crunchBtn.disabled = false;
    crunchBtn.textContent = "Initialize & Crunch Plan";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (crunchBtn) crunchBtn.addEventListener("click", startCrunchPipeline);
});
