/**
 * Seed data for the todo demo app.
 *
 * Auto-loaded on first run (when localStorage is empty).
 * Provides realistic data for testing statistics and charts.
 */

import type { Project, Todo } from './src/types';

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
      id: 'proj-personal',
      title: 'Personal',
      pattern: 'pattern-dots',
      description: 'Reading, learning, and personal AI exploration',
      created_at: randomDate(28, 30).toISOString(),
    },
    {
      id: 'proj-mcp-web',
      title: 'MCP-Web',
      pattern: 'pattern-grid',
      description: 'Building AI-controllable web applications',
      created_at: randomDate(25, 28).toISOString(),
    },
    {
      id: 'proj-work',
      title: 'Work',
      pattern: 'pattern-diagonal',
      description: 'AI-native dashboards and data exploration',
      created_at: randomDate(20, 25).toISOString(),
    },
    {
      id: 'proj-genomics',
      title: 'Genomics',
      pattern: 'pattern-zigzag',
      description: 'Next-gen genome browser with AI superpowers',
      created_at: randomDate(15, 20).toISOString(),
    },
  ];

  return Object.fromEntries(projects.map((p) => [p.id, p]));
}

/**
 * Todo templates for realistic data.
 */
const TODO_TEMPLATES = {
  personal: [
    { title: 'Read "The Demon in the Machine"', description: 'Paul Davies on information, life, and physics' },
    { title: 'Read "Reality Is Not What It Seems"', description: 'Carlo Rovelli on quantum gravity and the nature of time' },
    { title: 'Study "Statistical Physics of Self-Replication"', description: 'Jeremy England\'s paper on thermodynamic origins of life' },
    { title: 'Read "Dissipative Adaptation in Driven Self-Assembly"', description: 'Jeremy England on how systems organize under energy flow' },
    { title: 'Set up OpenClaw locally', description: 'Robot learning framework - get development environment running' },
    { title: 'Explore OpenClaw documentation', description: 'Understand architecture and contribution guidelines' },
    { title: 'Watch Jeremy England lectures', description: 'YouTube talks on physics of life and self-organization' },
    { title: 'Read "Life\'s Ratchet"', description: 'Peter Hoffmann on molecular machines and the origins of life' },
    { title: 'Study active inference papers', description: 'Karl Friston\'s free energy principle' },
    { title: 'Explore Claude\'s system prompts', description: 'Learn from Anthropic\'s approach to AI alignment' },
    { title: 'Read "The Book of Why"', description: 'Judea Pearl on causality and AI reasoning' },
    { title: 'Set up local LLM with Ollama', description: 'Run models locally for experimentation' },
  ],
  mcpWeb: [
    { title: 'Add undo/redo support to state management', description: 'Track state history for AI reversibility' },
    { title: 'Implement optimistic updates pattern', description: 'Show immediate UI feedback before confirmation' },
    { title: 'Add batch tool execution', description: 'Let agents execute multiple actions atomically' },
    { title: 'Create debugging inspector panel', description: 'Visualize MCP messages and state changes in real-time' },
    { title: 'Write integration tests for bridge', description: 'Test WebSocket reconnection and message ordering' },
    { title: 'Add streaming response support', description: 'Progressive UI updates during long operations' },
    { title: 'Document best practices guide', description: 'Patterns for exposing state to AI agents effectively' },
    { title: 'Create React hooks for common patterns', description: 'useAIAction, useExposedState, etc.' },
    { title: 'Add TypeScript plugin for schema validation', description: 'Catch tool definition errors at compile time' },
    { title: 'Build example: AI-controlled canvas app', description: 'Demonstrate visual manipulation via MCP tools' },
    { title: 'Add connection health monitoring', description: 'Heartbeat and automatic reconnection strategies' },
    { title: 'Create VS Code extension', description: 'IntelliSense for MCP-Web tool definitions' },
    { title: 'Implement tool permission system', description: 'Let users approve/deny specific AI actions' },
    { title: 'Add analytics for tool usage', description: 'Track which tools AI agents use most' },
    { title: 'Create demo: collaborative AI editing', description: 'Multiple agents working on same document' },
  ],
  work: [
    { title: 'Prototype AI-native dashboard builder', description: 'Natural language to visualization pipeline' },
    { title: 'Design schema for dashboard components', description: 'JSON structure that AI can generate and modify' },
    { title: 'Build data exploration agent', description: 'AI that suggests interesting patterns in datasets' },
    { title: 'Create smart filter suggestions', description: 'AI recommends relevant filters based on data' },
    { title: 'Implement natural language queries', description: '"Show me sales by region last quarter"' },
    { title: 'Add anomaly detection to charts', description: 'Highlight unusual patterns automatically' },
    { title: 'Design AI-assisted chart selection', description: 'Recommend best visualization for data type' },
    { title: 'Build conversational data interface', description: 'Chat-based exploration of complex datasets' },
    { title: 'Create automated insight generation', description: 'AI summarizes key findings from dashboards' },
    { title: 'Implement smart drill-down', description: 'AI suggests which dimensions to explore' },
    { title: 'Add collaborative annotations', description: 'Team members + AI can annotate visualizations' },
    { title: 'Build report generation from dashboards', description: 'AI writes narrative summaries of data' },
    { title: 'Design intent-based dashboard creation', description: '"I want to understand customer churn"' },
    { title: 'Create data quality AI assistant', description: 'Detect and suggest fixes for data issues' },
    { title: 'Prototype voice-controlled analytics', description: 'Hands-free dashboard interaction' },
  ],
  inbox: [
    { title: 'Review Anthropic blog on Claude 3.5', description: 'New capabilities and safety research' },
    { title: 'Explore MCP specification updates', description: 'Check for new protocol features' },
    { title: 'Set up AI coding assistant comparison', description: 'Test Claude, GPT-4, and Gemini on same tasks' },
    { title: 'Research vector database options', description: 'Compare Pinecone, Weaviate, Chroma' },
    { title: 'Bookmark interesting AI papers', description: 'Organize reading list in Zotero' },
    { title: 'Try Claude\'s computer use feature', description: 'Experiment with desktop automation' },
    { title: 'Set up RSS feeds for AI news', description: 'Anthropic, OpenAI, DeepMind blogs' },
    { title: 'Organize AI bookmarks', description: 'Clean up browser bookmarks folder' },
    { title: 'Get ice cream with Claude', description: 'He\'s paying (in tokens)' },
    { title: 'Sort through all these todos', description: 'There are... a lot of them' },
  ],
  genomics: [
    { title: 'Prototype next-gen genome browser', description: 'Combine HiGlass ecosystem + GenomeSpy rendering + AI analysis' },
    { title: 'Explore GenomeSpy rendering engine', description: 'Smoothest genome browser rendering ever - GPU-accelerated WebGL magic' },
    { title: 'Integrate HiGlass track types', description: 'Reuse heatmaps, line plots, and interaction matrices' },
    { title: 'Build AI-powered variant annotation', description: 'Let Claude explain what that SNP actually does' },
    { title: 'Design Hi-C heatmap interactions', description: 'Zoom into chromatin loops with buttery smooth rendering' },
    { title: 'Test natural language genome queries', description: 'With MCP-Web this should just work! "Show me CTCF binding sites near TP53"' },
    { title: 'Create AI genome exploration agent', description: 'Automatically find interesting regulatory regions' },
    { title: 'Build comparative genomics view', description: 'Align multiple species with AI-highlighted conservation' },
    { title: 'Design 3D genome structure viewer...NOT', description: 'Visualize TADs and compartments in 3D (just kidding, 2D is hard enough)' },
    { title: 'Finally integrate Peax back into HiGlass', description: 'The AI peak caller from 2020 deserves a comeback tour' },
    { title: 'Add semantic search for genomic features', description: '"Find enhancers active in neural development"' },
    { title: 'Build genome annotation copilot', description: 'AI suggests relevant tracks as you navigate' },
    { title: 'Implement infinite canvas like GenomeSpy', description: 'Seamless zooming from chromosome to nucleotide' },
    { title: 'Add voice-controlled navigation', description: '"Zoom into the HoxA cluster"' },
    { title: 'Let Claude browse the genome for me', description: 'And find out why I keep forgetting where I put my phone' },
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
  const categories: Array<{ templates: typeof TODO_TEMPLATES.personal; projectId: string | null; count: number }> = [
    { templates: TODO_TEMPLATES.personal, projectId: 'proj-personal', count: 12 },
    { templates: TODO_TEMPLATES.mcpWeb, projectId: 'proj-mcp-web', count: 15 },
    { templates: TODO_TEMPLATES.work, projectId: 'proj-work', count: 12 },
    { templates: TODO_TEMPLATES.genomics, projectId: 'proj-genomics', count: 15 },
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

  // Add special self-referential checkers todos (always included)
  const checkersCreatedAt = randomDate(5, 7);
  const checkersCompletedAt = addRandomTime(checkersCreatedAt, 2, 6);

  // First game: completed
  todos.push({
    id: crypto.randomUUID(),
    title: 'Play checkers',
    description: 'Finally beat Claude at something',
    created_at: checkersCreatedAt.toISOString(),
    completed_at: checkersCompletedAt.toISOString(),
    due_at: null,
    project_id: null,
  });

  // Rematch: pending (Claude wants revenge)
  todos.push({
    id: crypto.randomUUID(),
    title: 'Play checkers again',
    description: 'Claude demanded a rematch',
    created_at: addRandomTime(checkersCompletedAt, 0.5, 2).toISOString(),
    completed_at: null,
    due_at: null,
    project_id: null,
  });

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
