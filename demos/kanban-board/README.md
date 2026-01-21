# Kanban Board Demo

A project management kanban board demonstrating MCP Web integration with React's built-in state management.

![Kanban Board Demo](https://img.shields.io/badge/MCP-Web-blue) ![React](https://img.shields.io/badge/React-18.3.1-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1.11-blue)

## Overview

This demo showcases how to integrate React applications with an AI App like Claude Desktop through the Model Context Protocol (MCP) Web integration. It features a fully functional kanban board with drag-and-drop functionality, task management, and team collaboration features.

## Features

### 🎯 Core Functionality
- **Drag & Drop**: Move tasks between columns (To Do, In Progress, Review, Done)
- **Task Management**: Create, edit, and track tasks with priorities, types, and due dates
- **Team Collaboration**: Assign tasks to team members with avatar display
- **Filtering & Search**: Real-time task filtering and column-based filtering
- **Activity Logging**: Track all changes and actions on the board

### 🔧 MCP Integration
The demo exposes **18 different state variables** to Claude Desktop via MCP tools:

#### Primitive Values (4 tools)
- `board_title` - The kanban board title
- `filter_text` - Search filter for tasks
- `view_mode` - Board or list view toggle
- `selected_column` - Currently selected column filter

#### Arrays (3 tools) 
- `task_list` - Complete list of all tasks
- `team_members` - Team member information and roles
- `activity_log` - Recent project activity and changes

#### Objects with Schema Decomposition (3 tools)
- `board_settings` - Display and notification preferences (split into display/visibility/notifications)
- `user_preferences` - Sorting and display preferences (split into sorting/display/defaults)
- `project_metadata` - Project information and timeline (split into basic/timeline/ownership)

## Architecture

### Technology Stack
- **React 18.3** with TypeScript for the UI
- **TailwindCSS** for styling and responsive design
- **Zod** for schema validation and type safety
- **@mcp-web/core** for MCP integration
- **Vite** for build tooling and development server

### State Management
The demo uses React's built-in `useState` hooks for all state management, demonstrating how to integrate MCP without requiring additional state libraries like Jotai or Redux.

Each piece of state is exposed to MCP using the `useTool` hook:

```typescript
// Primitive state exposure
useTool({
  mcp,
  name: 'board_title',
  description: 'The title of the kanban board',
  value: boardTitle,
  setValue: setBoardTitle,
  valueSchema: z.string().min(1, 'Board title is required'),
});

// Array state exposure
useTool({
  mcp,
  name: 'task_list',
  description: 'Complete list of all tasks in the project',
  value: tasks,
  setValue: setTasks,
  valueSchema: TaskListSchema,
});

// Object state with decomposition
useTool({
  mcp,
  name: 'board_settings',
  description: 'Board display and notification settings',
  value: boardSettings,
  setValue: setBoardSettings,
  valueSchema: BoardSettingsSchema,
  valueSchemaSplit: boardSettingsSplitPlan, // Enables partial updates
});
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (for workspace management)
- Claude Desktop with MCP support

### Installation

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Start the development server**:
   ```bash
   pnpm dev
   ```
   The app will be available at `http://localhost:5173`

3. **Start the MCP bridge** (in a separate terminal):
   ```bash
   pnpm bridge
   ```
   The bridge server will start on ports 3001 (WebSocket) and 3002 (MCP)

### Claude Desktop Setup

Add this configuration to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "kanban-board": {
      "command": "npx",
      "args": ["@mcp-web/client"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3002",
        "AUTH_TOKEN": "your-auth-token-here"
      }
    }
  }
}
```

## Example LLM Commands

Once connected, you can control the kanban board through natural language commands in Claude Desktop:

### Task Management
```
"Create a new high-priority bug task assigned to Bob Smith with title 'Fix responsive layout issues'"

"Move all urgent tasks to the In Progress column"

"Show me all tasks assigned to Carol Davis"

"Mark all tasks in the Review column as completed"
```

### Board Configuration
```
"Change the board title to 'Sprint 23 Tasks'"

"Enable compact mode and hide task types"

"Sort tasks by due date in ascending order"

"Hide the Review column from the board"
```

### Project Settings
```
"Update the project deadline to March 15th, 2024"

"Change the project status to 'active'"

"Set the default task priority to 'high'"
```

### Data Analysis
```
"How many tasks are overdue?"

"What's the distribution of tasks by priority?"

"Show me recent activity on the board"

"Which team member has the most assigned tasks?"
```

## File Structure

```
src/
├── components/           # React components
│   ├── BoardHeader.tsx  # Top navigation and controls
│   ├── KanbanBoard.tsx  # Main board layout
│   ├── KanbanColumn.tsx # Individual columns
│   └── TaskCard.tsx     # Task display cards
├── data/
│   └── mockData.ts      # Sample data for demo
├── schemas/
│   └── index.ts         # Zod schemas and validation
├── types/
│   └── index.ts         # TypeScript type definitions
├── App.tsx              # Main app with MCP integration
├── index.tsx            # React entry point
└── index.css            # TailwindCSS imports
```

## Schema Decomposition

Complex objects are split into logical groups for easier LLM interaction:

**Board Settings** → `display`, `visibility`, `notifications`
**User Preferences** → `sorting`, `display`, `defaults`  
**Project Metadata** → `basic`, `timeline`, `ownership`

This allows commands like:
```
"Update display settings to show assignee avatars and hide tags"
"Set sorting preferences to priority descending"
"Change basic project info name to 'Q1 Planning'"
```

## Development

### Building for Production
```bash
pnpm build
```

### Linting and Formatting
```bash
pnpm lint
```

### Development Tips
- The app includes hot reload for instant feedback during development
- All state changes are automatically synchronized with Claude Desktop
- Mock data is provided to demonstrate various task types and states
- Drag & drop is implemented with native HTML5 APIs for better performance

## Contributing

This demo serves as a reference implementation for MCP Web integration patterns. Key areas for exploration:

- **State Management**: How to expose different types of React state to MCP
- **Schema Design**: Creating effective Zod schemas for complex data structures  
- **User Experience**: Balancing LLM control with direct user interaction
- **Type Safety**: Maintaining full TypeScript safety throughout the integration

## License

This project is part of the MCP Web integration system and follows the same licensing terms.
