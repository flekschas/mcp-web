# Kanban Board Demo Scenarios

This document outlines the key demo scenarios that showcase the MCP Web integration capabilities of the kanban board application.

## Overview: 4 Story Beats

The kanban board demo is designed to showcase these four key value propositions:

1. **AI Onboarding** - AI can understand and help navigate any web application  
2. **AI Configuration** - AI can modify application settings and preferences
3. **AI Analytics** - AI can analyze data and provide insights
4. **Multi-MCP Integration** - Multiple MCP servers enable new workflows

## Story Beat #1: AI Onboarding

**Scenario:** AI assistant helps a new user understand and navigate the kanban board

**Demo Flow:**
1. User asks: "How does this kanban board work?"
2. AI accesses `help_tutorial_content` tool and provides guided walkthrough
3. AI explains the interface: board/list/stats views, filters, team members
4. AI demonstrates task creation by accessing `task_list` and showing examples

**Key MCP Tools Used:**
- `help_tutorial_content` - Tutorial system content
- `view_mode` - Switch between different view modes
- `task_list` - Show example tasks
- `team_members` - Explain team member roles

## Story Beat #2: AI Configuration  

**Scenario:** AI assistant configures the board based on user preferences

**Demo Flow:**
1. User says: "I prefer dark mode and want to hide completed tasks"
2. AI updates `board_settings` to set `theme: 'dark'`
3. AI modifies `user_preferences` to hide done column: `hiddenColumns: ['done']`
4. AI shows the updated interface reflecting the changes
5. User asks to sort tasks by priority, AI updates `sortBy: 'priority'`

**Key MCP Tools Used:**
- `board_settings` - Theme, visibility, layout preferences  
- `user_preferences` - Sorting, grouping, default values
- All settings persist automatically via localStorage

## Story Beat #3: AI Analytics

**Scenario:** AI provides insights and recommendations based on project data

**Demo Flow:**
1. Switch to Stats view to see data visualizations
2. User asks: "What insights can you provide about our project?"
3. AI accesses `project_statistics` and analyzes:
   - Completion rates, overdue tasks, team workload
   - Status and priority distributions
   - Performance trends and bottlenecks
4. AI uses `team_performance_analysis` to identify:
   - Who's overloaded vs underutilized  
   - Which types of tasks are taking longest
5. AI provides actionable recommendations

**Key MCP Tools Used:**
- `project_statistics` - Comprehensive project metrics
- `team_performance_analysis` - Team workload and efficiency
- `bottleneck_analysis` - Performance and workflow issues
- Observable Plot charts provide visual context

## Story Beat #4: Multi-MCP Integration ⭐

**Scenario:** Cross-system workflow combining Google Drive and kanban board

**Demo Flow:**
1. **Setup:** AI explains the multi-MCP scenario
   - Accesses `multi_mcp_workflow_demo` to show workflow steps
   
2. **Fetch Meeting Notes:** 
   - AI searches Google Drive: "Find our weekly sync meeting notes"
   - Uses `google_drive_search_results` to locate documents
   - Accesses `google_drive_meeting_document` for content
   
3. **Extract Action Items:**
   - AI analyzes the meeting notes content  
   - Uses `extracted_action_items` to identify 9 action items
   - Shows parsed tasks with assignees, due dates, priorities
   
4. **Import to Kanban:**
   - AI imports tasks using `import_tasks_result` 
   - Creates tasks in current project with proper metadata
   - Updates activity log to track the import
   
5. **Update Project Timeline:**
   - AI accesses project metadata to update deadline
   - Uses `update_project_result` based on meeting decisions
   - Shows updated project timeline: February 10 → February 15

**Key MCP Tools Used:**
- `google_drive_meeting_document` - Meeting notes content
- `extracted_action_items` - Parsed action items from meeting
- `import_tasks_result` - Import workflow results
- `current_project_metadata` - Project timeline updates
- `activity_log` - Track cross-system operations

**Multi-MCP Value Proposition:**
- **Single AI Assistant** accesses multiple systems seamlessly
- **Cross-System Workflows** that weren't possible before
- **Automatic Data Synchronization** between Google Drive and kanban
- **Context Preservation** across different applications

## Complete Story Demo Script

### Scene 1: Initial Setup
"Hi! I'm Claude and I can help you manage this kanban board. Let me show you around..."

### Scene 2: Personalization  
"Let me customize this for your preferences. I see you like dark interfaces..."

### Scene 3: Insights
"Looking at your project data, I notice some interesting patterns..."

### Scene 4: Multi-System Magic
"Now for something really powerful - I can pull action items from your Google Drive meeting notes and automatically create tasks here. Let me demonstrate..."

## Technical Implementation Notes

### Project Management Layer
- **Multi-Project Support:** Switch between different projects
- **localStorage Persistence:** All data persists across sessions
- **Project Metadata:** Name, description, deadlines, status tracking

### Mock Google Drive Integration
- **Realistic Meeting Notes:** Detailed weekly sync with action items
- **AI Parsing Simulation:** Extracts structured action items
- **Cross-System Data Flow:** Google Drive → AI Analysis → Kanban Tasks

### MCP Tool Architecture
- **68 Total MCP Tools** covering all functionality
- **Proper Schema Validation** with Zod for type safety  
- **Value/SetValue Pattern** for state management
- **Function-Based Tools** for complex operations

### Observable Plot Integration
- **4 Chart Types:** Status distribution, priority breakdown, task age, team workload
- **Real-Time Data:** Charts update with current project data
- **Export Ready:** Statistical data exposed to AI for analysis

## Testing the Demo

1. **Build and Run:**
   ```bash
   pnpm run build
   pnpm run dev
   ```

2. **Access MCP Tools:**
   - Use Claude Desktop with MCP client configured
   - All 68 tools should be available for AI interaction
   - Test cross-system workflow with multi_mcp_workflow_demo

3. **Verify Scenarios:**
   - Test each story beat independently
   - Ensure data persists across page reloads  
   - Validate multi-project switching works
   - Confirm Google Drive integration simulation

The demo showcases a complete MCP Web integration with realistic cross-system workflows that demonstrate the future of AI-powered application interaction.