/**
 * Seed data for the todo demo app.
 *
 * Auto-loaded on first run (when localStorage is empty).
 * Provides realistic data for testing statistics and charts.
 */

import type { Project, Todo } from './types';

// Storage keys (must match states.ts)
const STORAGE_KEYS = ['todos', 'projects', 'theme', 'sortBy', 'sortOrder', 'showCompleted', 'view'];

/**
 * Clear all demo data from localStorage.
 * Call from browser console: window.clearDemoData()
 */
export function clearDemoData(): void {
  for (const key of STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
  console.log('[Demo] Cleared localStorage. Reload to populate seed data.');
}

/**
 * Check if this is the first run (no todos in localStorage).
 */
export function isFirstRun(): boolean {
  return localStorage.getItem('todos') === null;
}

/**
 * Generate a random date within a range (days ago from now).
 */
function randomDate(minDaysAgo: number, maxDaysAgo: number): Date {
  const now = Date.now();
  const minMs = minDaysAgo * 24 * 60 * 60 * 1000;
  const maxMs = maxDaysAgo * 24 * 60 * 60 * 1000;
  const randomMs = minMs + Math.random() * (maxMs - minMs);
  return new Date(now - randomMs);
}

/**
 * Add random hours/minutes to a date.
 */
function addRandomTime(date: Date, minHours: number, maxHours: number): Date {
  const hoursToAdd = minHours + Math.random() * (maxHours - minHours);
  return new Date(date.getTime() + hoursToAdd * 60 * 60 * 1000);
}

/**
 * Generate seed projects.
 */
function generateProjects(): Record<string, Project> {
  const projects: Project[] = [
    {
      id: 'proj-work',
      title: 'Work Tasks',
      pattern: 'pattern-grid',
      description: 'Professional tasks and deadlines',
      created_at: randomDate(28, 30).toISOString(),
    },
    {
      id: 'proj-personal',
      title: 'Personal',
      pattern: 'pattern-dots',
      description: 'Personal errands and goals',
      created_at: randomDate(25, 28).toISOString(),
    },
    {
      id: 'proj-side',
      title: 'Side Project',
      pattern: 'pattern-diagonal',
      description: 'Weekend coding project',
      created_at: randomDate(20, 25).toISOString(),
    },
  ];

  return Object.fromEntries(projects.map((p) => [p.id, p]));
}

/**
 * Todo templates for realistic data.
 */
const TODO_TEMPLATES = {
  work: [
    { title: 'Review quarterly report', description: 'Check numbers and send to finance' },
    { title: 'Update project documentation', description: 'Add new API endpoints' },
    { title: 'Schedule team sync', description: 'Discuss roadmap priorities' },
    { title: 'Code review for PR #142', description: null },
    { title: 'Fix production bug', description: 'User reported login issues' },
    { title: 'Prepare presentation slides', description: 'For Friday meeting' },
    { title: 'Update dependencies', description: 'Security patches needed' },
    { title: 'Write unit tests', description: 'Coverage for new features' },
    { title: 'Onboard new team member', description: 'Setup access and intro meetings' },
    { title: 'Performance optimization', description: 'Database query improvements' },
    { title: 'Client meeting prep', description: 'Review requirements doc' },
    { title: 'Deploy staging release', description: null },
    { title: 'Update API rate limits', description: 'Per product request' },
    { title: 'Review security audit', description: 'Address flagged items' },
    { title: 'Refactor auth module', description: 'Improve error handling' },
  ],
  personal: [
    { title: 'Grocery shopping', description: 'Weekly essentials' },
    { title: 'Schedule dentist appointment', description: null },
    { title: 'Pay utility bills', description: 'Due by end of month' },
    { title: 'Call mom', description: null },
    { title: 'Renew gym membership', description: 'Check for discounts' },
    { title: 'Clean apartment', description: 'Deep clean kitchen' },
    { title: 'Plan weekend trip', description: 'Research hiking trails' },
    { title: 'Buy birthday gift', description: 'For Sarah' },
    { title: 'Return Amazon package', description: 'Wrong size' },
    { title: 'Book flight tickets', description: 'Summer vacation' },
    { title: 'Organize closet', description: null },
    { title: 'Fix leaky faucet', description: 'Or call plumber' },
  ],
  side: [
    { title: 'Setup CI/CD pipeline', description: 'GitHub Actions workflow' },
    { title: 'Design landing page', description: 'Figma mockups' },
    { title: 'Implement auth flow', description: 'OAuth2 with Google' },
    { title: 'Write README', description: 'Installation and usage' },
    { title: 'Add dark mode', description: 'Theme toggle component' },
    { title: 'Database schema design', description: 'User and content tables' },
    { title: 'Setup monitoring', description: 'Error tracking and analytics' },
    { title: 'Mobile responsive fixes', description: 'Test on various devices' },
    { title: 'Add search feature', description: 'Full-text search' },
    { title: 'Performance profiling', description: 'Lighthouse audit' },
  ],
  inbox: [
    { title: 'Reply to email from John', description: null },
    { title: 'Research new laptop', description: 'Compare models' },
    { title: 'Backup photos', description: 'To cloud storage' },
    { title: 'Cancel unused subscription', description: null },
    { title: 'Update resume', description: 'Add recent projects' },
    { title: 'Learn TypeScript generics', description: 'Read documentation' },
    { title: 'Organize bookmarks', description: null },
    { title: 'Review bank statements', description: 'Check for errors' },
  ],
};

/**
 * Generate seed todos with realistic timestamps.
 */
function generateTodos(_projects: Record<string, Project>): Todo[] {
  const todos: Todo[] = [];

  // Helper to pick random items from array
  const pickRandom = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  // Generate todos for each category
  const categories: Array<{ templates: typeof TODO_TEMPLATES.work; projectId: string | null; count: number }> = [
    { templates: TODO_TEMPLATES.work, projectId: 'proj-work', count: 15 },
    { templates: TODO_TEMPLATES.personal, projectId: 'proj-personal', count: 12 },
    { templates: TODO_TEMPLATES.side, projectId: 'proj-side', count: 10 },
    { templates: TODO_TEMPLATES.inbox, projectId: null, count: 8 },
  ];

  for (const { templates, projectId, count } of categories) {
    const selected = pickRandom(templates, Math.min(count, templates.length));

    for (const template of selected) {
      // Created 1-30 days ago
      const createdAt = randomDate(1, 30);

      // ~67% are completed
      const isCompleted = Math.random() < 0.67;

      // Completion time: 1 hour to 14 days after creation
      let completedAt: Date | null = null;
      if (isCompleted) {
        // Varied completion times for interesting charts
        const completionTimeHours = Math.random() < 0.3
          ? Math.random() * 24 // 30% same day (0-24 hours)
          : Math.random() < 0.6
            ? 24 + Math.random() * 72 // 30% 1-4 days
            : 96 + Math.random() * 240; // 40% 4-14 days
        completedAt = addRandomTime(createdAt, completionTimeHours * 0.8, completionTimeHours * 1.2);
        
        // Don't complete in the future
        if (completedAt > new Date()) {
          completedAt = addRandomTime(new Date(), -24, -1);
        }
      }

      // ~70% have due dates
      const hasDueDate = Math.random() < 0.7;
      let dueAt: Date | null = null;
      if (hasDueDate) {
        // Due date: 1-14 days after creation
        const daysAfterCreation = 1 + Math.random() * 13;
        dueAt = new Date(createdAt.getTime() + daysAfterCreation * 24 * 60 * 60 * 1000);
      }

      todos.push({
        id: crypto.randomUUID(),
        title: template.title,
        description: template.description,
        created_at: createdAt.toISOString(),
        completed_at: completedAt?.toISOString() ?? null,
        due_at: dueAt?.toISOString() ?? null,
        project_id: projectId,
      });
    }
  }

  return todos;
}

/**
 * Initialize seed data in localStorage.
 * Only runs if localStorage is empty.
 */
export function initializeSeedData(): boolean {
  if (!isFirstRun()) {
    return false;
  }

  const projects = generateProjects();
  const todos = generateTodos(projects);

  localStorage.setItem('projects', JSON.stringify(projects));
  localStorage.setItem('todos', JSON.stringify(todos));

  console.log(`[Demo] Initialized seed data: ${todos.length} todos, ${Object.keys(projects).length} projects`);
  return true;
}
