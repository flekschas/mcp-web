# Eval: Code Tool vs Normal Tools

A within-subject evaluation comparing two approaches for AI agents to manipulate complex application state via MCP-Web:

| Condition | Description |
|-----------|-------------|
| **Normal tools** | LLM receives 20+ individual tools (get/set/add/delete) and uses standard tool calling |
| **Code tool** | LLM receives a single `code` tool and writes JavaScript that orchestrates those same functions |

## Study Design

- **Design**: Within-subject (each model completes both conditions on all test cases)
- **Independent variable**: Condition (normal-tools vs code-tool)
- **Primary measures**: Success (edit distance from golden state), wall-clock time
- **Secondary measures**: Number of tool calls, token consumption (input + output)
- **Success metric**: Approximate number of tool calls needed to reach the golden state from the model's end state, normalized to [0, 1]

### Models

| Model | Provider |
|-------|----------|
| Claude Opus 4.6 | Anthropic (native) |
| Claude Sonnet 4.6 | Anthropic (native) |
| GPT-5.2 | OpenAI (native) |
| Gemini 3.1 Pro | Google (native) |
| Kimi K2.5 | OpenRouter |
| MiniMax M2.5 | OpenRouter |
| GLM 5 | OpenRouter |
| Qwen 3.5 | OpenRouter |

### Test Apps

Each app defines a Zod schema that generates tools via `generateToolsForSchema()`, plus test cases as (initial state, prompt, golden state) triplets. Apps can also provide `extraTools` (e.g. search) beyond the schema-generated CRUD tools.

#### `project-manager`

Simple CRUD app with tasks, labels, milestones, comments, members, and view presets (24 tools). Test cases range from single add/set (1-2 calls) to multi-step workflows (6+ calls).

#### `higlass`

[HiGlass](https://higlass.io) genomic data visualization app (10 schema tools + 2 search tools). All 5 test cases start from a default view config and build published research figures using realistic natural-language prompts. The LLM must discover tilesets via `higlass_tileset_search` and gene coordinates via `higlass_gene_search` before configuring views and tracks.

| Test Case | Paper | Description |
|-----------|-------|-------------|
| `build-arabidopsis-centromere` | [Naish et al. 2021](https://resgen.io/paper-data/Naish%202021%20-%20Arabidopsis/views) | Single view with Arabidopsis sequence identity linear heatmap and chromosome labels |
| `build-t2t-dual-heatmap` | [T2T-Nurk et al. 2021](https://resgen.io/paper-data/T2T%20-%20Nurk%20et%20al.%202021/views) | Split center heatmap (strand + identity) of CHM13 chr9 centromeric satellite |
| `build-shh-cohesin-comparison` | [Rhodes et al. 2020](https://resgen.io/paper-data/Rhodes%20et%20al.%202020/views) | Two-panel comparison: 5 virtual 4C bar tracks + split Hi-C maps at the mouse Shh locus |
| `build-micro-c-multi-zoom` | [Krietenstein et al. 2019](https://resgen.io/paper-data/Krietenstein%20et%20al.%202019/views) | Three side-by-side Micro-C contact maps at progressively increasing zoom levels |
| `build-brain-chromatin` | [Corces et al. 2020](https://resgen.io/paper-data/Corces%20et%20al.%202020/views) | 7 cell-type ATAC-seq tracks + H3K27ac arcs (hg38) and PLAC-seq arcs (hg19), centered on PICALM |

## Setup

```bash
# From repo root
pnpm install

# Set API keys
export ANTHROPIC_API_KEY=...
export OPENAI_API_KEY=...
export GOOGLE_API_KEY=...
export OPENROUTER_API_KEY=...  # for kimi, minimax, glm, qwen
```

## Usage

```bash
# Preview run matrix without executing
npx tsx evals/code-vs-tools/src/cli.ts --dry-run

# Run a quick smoke test (1 model, 1 rep)
npx tsx evals/code-vs-tools/src/cli.ts \
  --models claude-sonnet-4.6 \
  --reps 1

# Run specific condition only
npx tsx evals/code-vs-tools/src/cli.ts \
  --models claude-sonnet-4.6 \
  --conditions normal-tools \
  --reps 1

# Full evaluation
npx tsx evals/code-vs-tools/src/cli.ts
```

### CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `--models <ids>` | all | Comma-separated model IDs |
| `--apps <names>` | all | Comma-separated app names |
| `--conditions <c>` | both | `normal-tools`, `code-tool`, or both |
| `--reps <n>` | 3 | Repetitions per test case |
| `--max-steps <n>` | 20 | Max ToolLoopAgent steps per run |
| `--timeout <ms>` | 120000 | Per-run timeout |
| `--output <dir>` | `results/` | Output directory |
| `--dry-run` | false | Print matrix without executing |

## Architecture

```
CLI (cli.ts)
 └─ Runner (runner.ts) — iterates models x conditions x apps x cases
     ├─ Normal tools (conditions/normal-tools.ts)
     │   ├─ zodSchemasToTools() → ToolDefinitionZod[]
     │   ├─ zodToolsToAiSdk() → AI SDK ToolSet
     │   └─ ToolLoopAgent.generate()
     │
     └─ Code tool (conditions/code-tool.ts)
         ├─ Playwright page with browser harness
         │   ├─ zodSchemasToTools() → ToolDefinitionZod[]
         │   └─ Real CodeTool (iframe sandbox)
         ├─ Single AI SDK tool proxying to page.evaluate()
         └─ ToolLoopAgent.generate()
```

The code-tool condition uses the **real `CodeTool` class** running in a Playwright browser, not a Node.js simulation. The browser harness (`browser/harness.ts`) sets up the CodeTool with wrapped tool handlers that log inner calls for metrics.

## Results

Results are written to `results/`:
- `<timestamp>.jsonl` — one `EvalRun` JSON per line (flushed after each run)
- `<timestamp>-summary.json` — aggregated stats by model x condition

## Adding Test Apps

Create a new file in `src/apps/` exporting a `TestApp`, then add it to `src/apps/index.ts`. See `src/apps/project-manager.ts` for the pattern. Design schemas so `generateToolsForSchema()` produces 20+ tools by including multiple arrays and records.
