export interface NoteTemplate {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name string for dynamic rendering or predefined
  content: string;
}

export interface TemplateCategory {
  id: string;
  title: string;
  templates: NoteTemplate[];
}

export const templateCategories: TemplateCategory[] = [
  {
    id: "work",
    title: "Work & Productivity",
    templates: [
      {
        id: "meeting-notes",
        title: "Meeting Notes",
        description: "Standard template for meeting agendas and action items.",
        icon: "Users",
        content: `# Meeting Notes

**Date:** {{date}}
**Attendees:** 

---

## 🎯 Objectives
- 

## 📝 Discussion
- 

## ✅ Action Items
- [ ] Action item 1
- [ ] Action item 2

## 📌 Next Steps
- 
`,
      },
      {
        id: "daily-standup",
        title: "Daily Standup",
        description: "Quick updates for your daily syncs.",
        icon: "ListChecks",
        content: `# Daily Standup

**Date:** {{date}}

## ⏪ Done Yesterday
- 

## ⏩ Doing Today
- 

## 🛑 Blockers
- 
`,
      },
    ],
  },
  {
    id: "project",
    title: "Project Management",
    templates: [
      {
        id: "prd",
        title: "Project Proposal (PRD)",
        description: "Outline problems, goals, and scope for a new project.",
        icon: "Briefcase",
        content: `# Project Proposal

## 📋 Problem Statement
[Describe the problem you are trying to solve]

## 🎯 Goals & Objectives
- 

## 📦 Scope
- **In Scope:**
- **Out of Scope:**

## 🗓 Timeline
- 

## 📈 Success Metrics
- 
`,
      },
      {
        id: "bug-report",
        title: "Bug Report",
        description: "Structured format for reporting software issues.",
        icon: "Bug",
        content: `# Bug Report: [Short Title]

## 📝 Description
[Brief description of the bug]

## 🌍 Environment
- **OS:** 
- **Browser/App Version:** 

## 🔄 Steps to Reproduce
1. 
2. 
3. 

## ❌ Expected Behavior
[What should have happened]

## ⚠️ Actual Behavior
[What actually happened]

## 🖼 Screenshots / Logs
[Attach screenshots or error logs here]
`,
      },
    ],
  },
  {
    id: "personal",
    title: "Personal & Writing",
    templates: [
      {
        id: "daily-journal",
        title: "Daily Journal",
        description: "A private space for thoughts, mood, and reflections.",
        icon: "BookHeart",
        content: `# Daily Journal - {{date}}

## 🎭 Mood Tracker
- [ ] Great 🌟
- [ ] Good ☀️
- [ ] Okay ⛅️
- [ ] Bad 🌧

## ✨ Highlights of the Day
- 

## 🧠 Brain Dump
[Write whatever is on your mind...]
`,
      },
      {
        id: "blog-post",
        title: "Blog Post Draft",
        description: "Structure your ideas before publishing online.",
        icon: "Feather",
        content: `# Blog Post: [Working Title]

**Target Audience:** 
**Keywords / SEO:** 

---

## 📑 Outline
1. **Introduction** (Hook & Thesis)
2. **Main Point 1**
3. **Main Point 2**
4. **Main Point 3**
5. **Conclusion** (Summary & Call to Action)

---

## ✍️ Content
[Start writing your draft here...]
`,
      },
    ],
  },
];
