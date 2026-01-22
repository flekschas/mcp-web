#!/usr/bin/env tsx

/**
 * AI-powered agent documentation review script.
 *
 * This script uses the Anthropic API to review agent documentation
 * and suggest updates based on changes to API reference docs.
 *
 * Environment variables:
 *   - ANTHROPIC_API_KEY: Required. Your Anthropic API key.
 *   - CHANGED_FILES: Optional. Newline-separated list of changed files.
 *
 * Output:
 *   - Modifies files in place: AGENTS.md, SKILL.md, examples.md
 *   - Writes summary to /tmp/review-summary.md
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

// Configuration
const REPO_ROOT = execSync('git rev-parse --show-toplevel', {
  encoding: 'utf-8',
}).trim();

const FILES = {
  // The skill that guides documentation updates
  agentDocsSkill: join(REPO_ROOT, 'agents/skills/mcp-web-agent-docs/SKILL.md'),

  // Files that can be edited by the AI
  agentsMd: join(REPO_ROOT, 'agents/AGENTS.md'),
  skillMd: join(REPO_ROOT, 'agents/skills/mcp-web/SKILL.md'),
  examplesMd: join(REPO_ROOT, 'agents/skills/mcp-web/examples.md'),

  // API reference files (read-only, for context)
  apiRefCore: join(REPO_ROOT, 'agents/skills/mcp-web/api-reference-core.md'),
  apiRefBridge: join(
    REPO_ROOT,
    'agents/skills/mcp-web/api-reference-bridge.md',
  ),
  apiRefClient: join(
    REPO_ROOT,
    'agents/skills/mcp-web/api-reference-client.md',
  ),
  apiRefIntegrations: join(
    REPO_ROOT,
    'agents/skills/mcp-web/api-reference-integrations.md',
  ),
  apiRefTools: join(REPO_ROOT, 'agents/skills/mcp-web/api-reference-tools.md'),
  apiRefDecompose: join(
    REPO_ROOT,
    'agents/skills/mcp-web/api-reference-decompose-zod-schema.md',
  ),
};

interface FileEdit {
  path: string;
  content: string;
}

interface ReviewResult {
  edits: FileEdit[];
  summary: string;
}

function readFile(path: string): string {
  if (!existsSync(path)) {
    console.warn(`Warning: File not found: ${path}`);
    return '';
  }
  return readFileSync(path, 'utf-8');
}

function getFileDiff(filepath: string): string {
  try {
    return execSync(`git diff HEAD~1 HEAD -- "${filepath}"`, {
      encoding: 'utf-8',
      cwd: REPO_ROOT,
    });
  } catch {
    return '';
  }
}

function getChangedFiles(): string[] {
  const envFiles = process.env.CHANGED_FILES;
  if (envFiles) {
    return envFiles.split('\n').filter(Boolean);
  }

  // Fallback: detect from git
  try {
    const output = execSync('git diff --name-only HEAD~1 HEAD', {
      encoding: 'utf-8',
      cwd: REPO_ROOT,
    });
    return output
      .split('\n')
      .filter((f) => f.includes('api-reference') || f.startsWith('docs/'));
  } catch {
    return [];
  }
}

function buildPrompt(changedFiles: string[]): string {
  // Load the agent-docs skill (this guides how to update docs)
  const agentDocsSkill = readFile(FILES.agentDocsSkill);

  // Load current state of editable files
  const currentAgentsMd = readFile(FILES.agentsMd);
  const currentSkillMd = readFile(FILES.skillMd);
  const currentExamplesMd = readFile(FILES.examplesMd);

  // Get diffs for changed files
  const diffs = changedFiles
    .map((file) => {
      const fullPath = join(REPO_ROOT, file);
      const diff = getFileDiff(fullPath);
      if (!diff) return null;
      return `### ${file}\n\`\`\`diff\n${diff}\n\`\`\``;
    })
    .filter(Boolean)
    .join('\n\n');

  // Load API reference files for full context (truncated if too long)
  const apiRefs = [
    { name: 'core', content: readFile(FILES.apiRefCore) },
    { name: 'bridge', content: readFile(FILES.apiRefBridge) },
    { name: 'client', content: readFile(FILES.apiRefClient) },
    { name: 'integrations', content: readFile(FILES.apiRefIntegrations) },
    { name: 'tools', content: readFile(FILES.apiRefTools) },
    { name: 'decompose', content: readFile(FILES.apiRefDecompose) },
  ]
    .map(({ name, content }) => {
      // Truncate very long files to avoid token limits
      const truncated =
        content.length > 20000
          ? content.slice(0, 20000) + '\n\n[... truncated ...]'
          : content;
      return `### api-reference-${name}.md\n${truncated}`;
    })
    .join('\n\n---\n\n');

  return `You are an expert technical writer reviewing documentation for the MCP-Web project.

## Your Task

Review the recent changes to the API reference documentation and determine if the following files need updates:

1. \`agents/AGENTS.md\` - High-level project overview (should be 50-100 lines)
2. \`agents/skills/mcp-web/SKILL.md\` - Detailed usage guide for MCP-Web
3. \`agents/skills/mcp-web/examples.md\` - Code examples

## Guidelines for Updates

${agentDocsSkill}

## Recent Changes (Diffs)

${diffs || 'No diffs available - reviewing current state only.'}

## Current API Reference Documentation

${apiRefs}

## Current Editable Files

### agents/AGENTS.md
\`\`\`markdown
${currentAgentsMd}
\`\`\`

### agents/skills/mcp-web/SKILL.md
\`\`\`markdown
${currentSkillMd}
\`\`\`

### agents/skills/mcp-web/examples.md
\`\`\`markdown
${currentExamplesMd}
\`\`\`

## Instructions

1. Analyze the diffs to understand what changed in the API
2. Check if the current AGENTS.md, SKILL.md, and examples.md accurately reflect the API
3. If updates are needed, provide the complete new content for each file that needs changes
4. Do NOT modify api-reference*.md files - those are auto-generated

Respond in the following JSON format:

\`\`\`json
{
  "analysis": "Brief explanation of what changed and why updates are/aren't needed",
  "edits": [
    {
      "path": "agents/AGENTS.md",
      "content": "... complete file content ..."
    }
  ],
  "summary": "Bullet points summarizing the changes made (for PR description)"
}
\`\`\`

If no changes are needed, return an empty edits array:

\`\`\`json
{
  "analysis": "The documentation is already up to date because...",
  "edits": [],
  "summary": "No changes needed."
}
\`\`\`

Important:
- Only include files in \`edits\` that actually need changes
- Provide the COMPLETE file content, not just the changed parts
- Keep AGENTS.md concise (50-100 lines)
- Ensure examples in examples.md are accurate and compile
- Use consistent terminology (MCPWeb, MCPWebBridge, etc.)`;
}

async function runReview(): Promise<ReviewResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const client = new Anthropic({ apiKey });
  const changedFiles = getChangedFiles();

  console.log('Changed files:', changedFiles);

  if (changedFiles.length === 0) {
    console.log('No relevant files changed. Skipping review.');
    return { edits: [], summary: 'No changes needed.' };
  }

  const prompt = buildPrompt(changedFiles);

  console.log('Sending request to Anthropic API...');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text content
  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from API');
  }

  // Parse JSON from response
  const jsonMatch = textContent.text.match(/```json\n([\s\S]*?)\n```/);
  if (!jsonMatch) {
    console.error('Response:', textContent.text);
    throw new Error('Could not parse JSON from response');
  }

  const result = JSON.parse(jsonMatch[1]) as {
    analysis: string;
    edits: FileEdit[];
    summary: string;
  };

  console.log('Analysis:', result.analysis);

  return {
    edits: result.edits,
    summary: result.summary,
  };
}

async function main() {
  try {
    const result = await runReview();

    if (result.edits.length === 0) {
      console.log('No documentation updates needed.');
      return;
    }

    console.log(`Applying ${result.edits.length} file edit(s)...`);

    // Apply edits
    for (const edit of result.edits) {
      const fullPath = join(REPO_ROOT, edit.path);
      console.log(`  Writing: ${edit.path}`);
      writeFileSync(fullPath, edit.content, 'utf-8');
    }

    // Write summary for PR body
    writeFileSync('/tmp/review-summary.md', result.summary, 'utf-8');

    console.log('Done! Summary written to /tmp/review-summary.md');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
