/**
 * Generates the API reference pages for the docs site.
 *
 * @example
 * ```bash
 * pnpm dlx tsx scripts/generate-all-api-docs.ts docs/api/
 * ```
 */

import { spawnSync } from "node:child_process";
import * as path from "node:path";

const OUTPUT_DIR = process.argv[2];
if (!OUTPUT_DIR) {
	console.error("Usage: tsx generate-all-api-docs.ts <output-dir>");
	process.exit(1);
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
	const outputPath = path.join(OUTPUT_DIR, `${fileBase}.md`);

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
