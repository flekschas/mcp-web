/**
 * Generates all API documentation with a customizable output directory.
 *
 * @example
 * ```bash
 * pnpm dlx tsx scripts/generate-all-api-docs.ts docs/
 * pnpm dlx tsx scripts/generate-all-api-docs.ts agents/skills/mcp-web/
 * ```
 */

import { spawnSync } from "node:child_process";
import * as path from "node:path";

// Parse CLI arguments
const args = process.argv.slice(2);
if (args.length < 1) {
	console.error(
		"Usage: tsx generate-all-api-docs.ts <output-dir> [--prefix <prefix>]",
	);
	console.error(
		"Examples:",
	);
	console.error(
		'  tsx generate-all-api-docs.ts docs/api/',
	);
	console.error(
		'  tsx generate-all-api-docs.ts agents/skills/mcp-web/ --prefix "api-reference-"',
	);
	process.exit(1);
}

const OUTPUT_DIR = args[0];

// Parse optional --prefix flag
let filePrefix = "";
const prefixIndex = args.indexOf("--prefix");
if (prefixIndex !== -1 && args[prefixIndex + 1]) {
	filePrefix = args[prefixIndex + 1];
}

// Package configurations: [source-dir, filename-base, title]
const packages: Array<[string, string, string]> = [
	["packages/core/src", "core", "MCP-Web Core API"],
	["packages/bridge/src", "bridge", "MCP-Web Bridge API"],
	["packages/client/src", "client", "MCP-Web Client API"],
	["packages/app/src", "app", "MCP-Web Apps API"],
	[
		"packages/decompose-zod-schema/src",
		"decompose-zod-schema",
		"MCP-Web Decompose Zod Schema API",
	],
	[
		"packages/integrations/react/src",
		"integrations",
		"MCP-Web React Integration API",
	],
	["packages/tools/src", "tools", "MCP-Web Tools API"],
	["packages/mcpb/src", "mcpb", "MCP-Web MCPB Bundle API"],
];

// Generate docs for each package
for (const [sourceDir, fileBase, title] of packages) {
	const outputFile = `${filePrefix}${fileBase}.md`;
	const outputPath = path.join(OUTPUT_DIR, outputFile);

	console.log(`\nGenerating ${outputPath}...`);

	const result = spawnSync(
		"tsx",
		[
			"scripts/generate-api-docs.ts",
			sourceDir,
			outputPath,
			"--title",
			title,
		],
		{
			stdio: "inherit",
		},
	);

	if (result.status !== 0) {
		console.error(`Failed to generate ${outputPath}`);
		process.exit(1);
	}
}

console.log("\n✓ All API documentation generated successfully");
