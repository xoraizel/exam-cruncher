// frontend/js/engine/scheduler.js
// Port of src/engine/scheduler.py — deterministic schedule formatting engine

export class ScheduleEngine {
  constructor(syllabus) {
    this.syllabus = syllabus;
  }

  crunch() {
    const lines = [];
    const s = this.syllabus;

    lines.push(`${s.total_days}-Day Study Plan — ${s.subject_name}`);
    lines.push("This plan is made so you:");
    lines.push("  - Cover 100% of the syllabus");
    lines.push("  - Understand concepts without overload");
    lines.push("  - Build revision naturally");
    lines.push("  - Prepare for university-style theory exams");
    lines.push("");
    lines.push("Study time target:");
    lines.push("  - 2–3 hours daily is enough if done properly");
    lines.push("  - Spend: 60% understanding | 40% note-making + revision");
    lines.push("");
    lines.push("=".repeat(60));
    lines.push("");

    for (const module of s.modules) {
      lines.push(`MODULE: ${module.name}`);
      lines.push(`Days ${module.start_day}–${module.end_day}`);
      lines.push("-".repeat(40));

      for (const task of module.daily_tasks) {
        lines.push(`Day ${task.day}`);
        for (const topic of task.topics) {
          const prefix = topic.is_revision ? " [R] " : "  - ";
          lines.push(`${prefix}${topic.name}`);
        }
        if (task.focus_notes) {
          lines.push(`  * Focus: ${task.focus_notes}`);
        }
        lines.push("");
      }

      lines.push("=".repeat(60));
      lines.push("");
    }

    return lines.join("\n");
  }
}
