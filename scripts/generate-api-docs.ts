/**
 * Generates concise API documentation from TypeScript source files.
 * Extracts only JSDoc comments, class/interface names, and method signatures.
 *
 * @example
 * ```bash
 * pnpm dlx tsx scripts/generate-api-docs.ts packages/core/src docs/core.md --title "Core API"
 * ```
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as ts from "typescript";

// Parse CLI arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: tsx generate-api-docs.ts <source-dir> <output-file> [--title <title>] [--description <desc>]");
  console.error("Example: tsx generate-api-docs.ts packages/core/src agents/skills/mcp-web/api-reference-core.md --title 'Core API'");
  process.exit(1);
}

const SRC_DIR = path.resolve(args[0]);
const OUTPUT_FILE = path.resolve(args[1]);

// Parse optional flags
let title = "API Reference";
let description = "";
for (let i = 2; i < args.length; i++) {
  if (args[i] === "--title" && args[i + 1]) {
    title = args[i + 1];
    i++;
  } else if (args[i] === "--description" && args[i + 1]) {
    description = args[i + 1];
    i++;
  }
}

interface DocEntry {
  name: string;
  kind: "class" | "interface" | "type" | "function" | "variable";
  description: string;
  typeParams?: string;
  extends?: string;
  members: MemberDoc[];
  category?: string;
  sourcePath?: string;
}

interface MemberDoc {
  name: string;
  kind: "property" | "method" | "accessor";
  signature: string;
  description: string;
  isStatic?: boolean;
}

function getJSDocComment(node: ts.Node): string {
  const jsDocComment = (node as any).jsDoc?.[0];

  if (!jsDocComment) return "";

  let comment = "";
  if (typeof jsDocComment.comment === "string") {
    comment = jsDocComment.comment;
  } else if (Array.isArray(jsDocComment.comment)) {
    comment = jsDocComment.comment
      .map((part: any) => (typeof part === "string" ? part : part.text || ""))
      .join("");
  }

  return comment.trim();
}

function getCategory(node: ts.Node): string | undefined {
  const tags = ts.getJSDocTags(node);
  const categoryTag = tags.find((tag) => tag.tagName.text === "category");
  if (categoryTag && typeof categoryTag.comment === "string") {
    return categoryTag.comment;
  }
  return undefined;
}

function getTypeParameters(node: ts.ClassDeclaration | ts.InterfaceDeclaration): string {
  if (!node.typeParameters || node.typeParameters.length === 0) return "";
  return `<${node.typeParameters.map((tp) => tp.name.text).join(", ")}>`;
}

function getHeritageClause(
  node: ts.ClassDeclaration | ts.InterfaceDeclaration
): string | undefined {
  if (!node.heritageClauses) return undefined;
  const extendsClause = node.heritageClauses.find(
    (hc) => hc.token === ts.SyntaxKind.ExtendsKeyword
  );
  if (extendsClause && extendsClause.types.length > 0) {
    return extendsClause.types[0].expression.getText();
  }
  return undefined;
}

function extractMethodSignature(
  method: ts.MethodDeclaration | ts.MethodSignature,
  sourceFile: ts.SourceFile
): string {
  const name = method.name.getText(sourceFile);
  const typeParams = method.typeParameters
    ? `<${method.typeParameters.map((tp) => tp.name.text).join(", ")}>`
    : "";

  const params = method.parameters
    .map((p) => {
      const paramName = p.name.getText(sourceFile);
      const optional = p.questionToken ? "?" : "";
      const type = p.type ? p.type.getText(sourceFile) : "any";
      return `${paramName}${optional}: ${type}`;
    })
    .join(", ");

  const returnType = method.type ? method.type.getText(sourceFile) : "void";

  return `${name}${typeParams}(${params}): ${returnType}`;
}

function extractPropertySignature(
  prop: ts.PropertyDeclaration | ts.PropertySignature,
  sourceFile: ts.SourceFile
): string {
  const name = prop.name.getText(sourceFile);
  const optional = prop.questionToken ? "?" : "";
  const type = prop.type ? prop.type.getText(sourceFile) : "any";
  return `${name}${optional}: ${type}`;
}

function extractAccessorSignature(
  accessor: ts.GetAccessorDeclaration,
  sourceFile: ts.SourceFile
): string {
  const name = accessor.name.getText(sourceFile);
  const returnType = accessor.type ? accessor.type.getText(sourceFile) : "any";
  return `get ${name}(): ${returnType}`;
}

function isExported(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function isPrivate(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword) ?? false;
}

function isPrivateName(name: string): boolean {
  return name.startsWith("#") || name.startsWith("_");
}

function processClass(
  node: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  relativePath: string
): DocEntry | null {
  if (!isExported(node) || !node.name) return null;

  const members: MemberDoc[] = [];

  for (const member of node.members) {
    // Skip private members
    if (isPrivate(member)) continue;
    if (
      ts.isPropertyDeclaration(member) ||
      ts.isMethodDeclaration(member) ||
      ts.isGetAccessor(member)
    ) {
      const memberName = member.name?.getText(sourceFile) || "";
      if (isPrivateName(memberName)) continue;
    }

    if (ts.isMethodDeclaration(member) && member.name) {
      const name = member.name.getText(sourceFile);
      members.push({
        name,
        kind: "method",
        signature: extractMethodSignature(member, sourceFile),
        description: getJSDocComment(member),
        isStatic: ts.canHaveModifiers(member)
          ? ts.getModifiers(member)?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword)
          : false
      });
    } else if (ts.isPropertyDeclaration(member) && member.name) {
      const name = member.name.getText(sourceFile);
      members.push({
        name,
        kind: "property",
        signature: extractPropertySignature(member, sourceFile),
        description: getJSDocComment(member)
      });
    } else if (ts.isGetAccessor(member) && member.name) {
      const name = member.name.getText(sourceFile);
      members.push({
        name,
        kind: "accessor",
        signature: extractAccessorSignature(member, sourceFile),
        description: getJSDocComment(member)
      });
    }
  }

  return {
    name: node.name.text,
    kind: "class",
    description: getJSDocComment(node),
    typeParams: getTypeParameters(node),
    extends: getHeritageClause(node),
    members,
    category: getCategory(node),
    sourcePath: relativePath
  };
}

function processInterface(
  node: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile,
  relativePath: string
): DocEntry | null {
  if (!isExported(node)) return null;

  const members: MemberDoc[] = [];

  for (const member of node.members) {
    if (ts.isMethodSignature(member) && member.name) {
      const name = member.name.getText(sourceFile);
      members.push({
        name,
        kind: "method",
        signature: extractMethodSignature(member, sourceFile),
        description: getJSDocComment(member)
      });
    } else if (ts.isPropertySignature(member) && member.name) {
      const name = member.name.getText(sourceFile);
      members.push({
        name,
        kind: "property",
        signature: extractPropertySignature(member, sourceFile),
        description: getJSDocComment(member)
      });
    }
  }

  return {
    name: node.name.text,
    kind: "interface",
    description: getJSDocComment(node),
    typeParams: getTypeParameters(node),
    extends: getHeritageClause(node),
    members,
    category: getCategory(node),
    sourcePath: relativePath
  };
}

function processTypeAlias(
  node: ts.TypeAliasDeclaration,
  sourceFile: ts.SourceFile,
  relativePath: string
): DocEntry | null {
  if (!isExported(node)) return null;

  const typeText = node.type.getText(sourceFile);

  return {
    name: node.name.text,
    kind: "type",
    description: getJSDocComment(node) || `Type alias: ${typeText}`,
    members: [],
    category: getCategory(node),
    sourcePath: relativePath
  };
}

function processFunction(
  node: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile,
  relativePath: string
): DocEntry | null {
  if (!isExported(node) || !node.name) return null;

  const typeParams = node.typeParameters
    ? `<${node.typeParameters.map((tp) => tp.name.text).join(", ")}>`
    : "";

  const params = node.parameters
    .map((p) => {
      const paramName = p.name.getText(sourceFile);
      const optional = p.questionToken ? "?" : "";
      const type = p.type ? p.type.getText(sourceFile) : "any";
      const shortType = type.length > 50 ? `${type.split("<")[0]}<...>` : type;
      return `${paramName}${optional}: ${shortType}`;
    })
    .join(", ");

  const returnType = node.type ? node.type.getText(sourceFile) : "void";
  const shortReturn = returnType.length > 50 ? `${returnType.split("<")[0]}<...>` : returnType;
  const signature = `${node.name.text}${typeParams}(${params}): ${shortReturn}`;

  return {
    name: node.name.text,
    kind: "function",
    description: getJSDocComment(node),
    members: [{ name: node.name.text, kind: "method", signature, description: "" }],
    category: getCategory(node),
    sourcePath: relativePath
  };
}

function processVariable(
  node: ts.VariableStatement,
  sourceFile: ts.SourceFile,
  relativePath: string
): DocEntry[] {
  if (!isExported(node)) return [];

  const entries: DocEntry[] = [];
  for (const decl of node.declarationList.declarations) {
    if (!ts.isIdentifier(decl.name)) continue;
    const name = decl.name.text;
    const type = decl.type ? decl.type.getText(sourceFile) : "unknown";

    entries.push({
      name,
      kind: "variable",
      description: getJSDocComment(node) || type,
      members: [],
      category: getCategory(node),
      sourcePath: relativePath
    });
  }
  return entries;
}

function processFile(filePath: string, projectRoot: string): DocEntry[] {
  const sourceCode = fs.readFileSync(filePath, "utf-8");
  const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

  // Calculate relative path from project root (e.g., "packages/generative-data/src/errors.ts")
  const relativePath = path.relative(projectRoot, filePath);

  const entries: DocEntry[] = [];

  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node)) {
      const entry = processClass(node, sourceFile, relativePath);
      if (entry) entries.push(entry);
    } else if (ts.isInterfaceDeclaration(node)) {
      const entry = processInterface(node, sourceFile, relativePath);
      if (entry) entries.push(entry);
    } else if (ts.isTypeAliasDeclaration(node)) {
      const entry = processTypeAlias(node, sourceFile, relativePath);
      if (entry) entries.push(entry);
    } else if (ts.isFunctionDeclaration(node)) {
      const entry = processFunction(node, sourceFile, relativePath);
      if (entry) entries.push(entry);
    } else if (ts.isVariableStatement(node)) {
      entries.push(...processVariable(node, sourceFile, relativePath));
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return entries;
}

function generateMarkdown(entries: DocEntry[], title: string, description: string): string {
  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push("");
  if (description) {
    lines.push(description);
    lines.push("");
  }

  // Group by category
  const categories = new Map<string, DocEntry[]>();
  for (const entry of entries) {
    const cat = entry.category || "Other";
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)?.push(entry);
  }

  // Sort categories: Core first, then Types, then Others, then Errors
  const categoryOrder = ["Core", "Types", "Utilities", "Other", "Errors"];
  const sortedCategories = [...categories.entries()].sort(([a], [b]) => {
    const aIdx = categoryOrder.indexOf(a);
    const bIdx = categoryOrder.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  for (const [category, catEntries] of sortedCategories) {
    lines.push(`## ${category}`);
    lines.push("");

    // Group by kind within category
    const classes = catEntries.filter((e) => e.kind === "class");
    const interfaces = catEntries.filter((e) => e.kind === "interface");
    const types = catEntries.filter((e) => e.kind === "type");
    const functions = catEntries.filter((e) => e.kind === "function");
    const variables = catEntries.filter((e) => e.kind === "variable");

    for (const entry of [...classes, ...interfaces, ...types, ...functions, ...variables]) {
      const kindLabel =
        entry.kind === "class"
          ? "Class"
          : entry.kind === "interface"
            ? "Interface"
            : entry.kind === "type"
              ? "Type"
              : entry.kind === "function"
                ? "Function"
                : "Variable";

      // Wrap name in backticks if it has type parameters to prevent Vitepress from parsing <T> as HTML
      const nameWithParams = entry.typeParams
        ? `\`${entry.name}${entry.typeParams}\``
        : entry.name;
      lines.push(`### ${nameWithParams}`);
      lines.push("");
      const sourceInfo = entry.sourcePath ? ` — \`${entry.sourcePath}\`` : "";
      lines.push(
        `*${kindLabel}*${entry.extends ? ` extends \`${entry.extends}\`` : ""}${sourceInfo}`
      );
      lines.push("");

      if (entry.description) {
        // For type aliases and variables without JSDoc, the description is just the type
        // Wrap these in code blocks to avoid angle bracket issues
        if (entry.description.startsWith("Type alias: ")) {
          lines.push("```ts");
          lines.push(entry.description.substring("Type alias: ".length));
          lines.push("```");
          lines.push("");
        } else if (entry.kind === "variable" && !entry.description.includes(" ")) {
          // Variable with just a type (no spaces = no JSDoc description)
          lines.push("```ts");
          lines.push(entry.description);
          lines.push("```");
          lines.push("");
        } else {
          // Regular JSDoc description
          lines.push(entry.description);
          lines.push("");
        }
      }

      // For classes and interfaces, list members with signatures
      if (entry.members.length > 0 && (entry.kind === "class" || entry.kind === "interface")) {
        const props = entry.members.filter((m) => m.kind === "property");
        const accessors = entry.members.filter((m) => m.kind === "accessor");
        const methods = entry.members.filter((m) => m.kind === "method");

        if (props.length > 0) {
          lines.push("**Properties:**");
          for (const prop of props) {
            lines.push("");
            lines.push("```ts");
            lines.push(prop.signature);
            lines.push("```");
            if (prop.description) {
              lines.push("");
              lines.push(prop.description);
            }
          }
          lines.push("");
        }

        if (accessors.length > 0) {
          lines.push("**Accessors:**");
          for (const acc of accessors) {
            lines.push("");
            lines.push("```ts");
            lines.push(acc.signature);
            lines.push("```");
            if (acc.description) {
              lines.push("");
              lines.push(acc.description);
            }
          }
          lines.push("");
        }

        if (methods.length > 0) {
          lines.push("**Methods:**");
          for (const method of methods) {
            const staticMark = method.isStatic ? " *(static)*" : "";
            lines.push("");
            lines.push("```ts");
            lines.push(method.signature + staticMark);
            lines.push("```");
            if (method.description) {
              lines.push("");
              lines.push(method.description);
            }
          }
          lines.push("");
        }
      }

      // For functions, show signature
      if (entry.kind === "function" && entry.members.length > 0) {
        lines.push("```ts");
        lines.push(entry.members[0].signature);
        lines.push("```");
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

// Main
const projectRoot = path.join(import.meta.dirname, "..");
const sourceFiles = fs
  .readdirSync(SRC_DIR)
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
  .map((f) => path.join(SRC_DIR, f));

const allEntries: DocEntry[] = [];
for (const file of sourceFiles) {
  allEntries.push(...processFile(file, projectRoot));
}

// Remove duplicates (same name exported from index.ts)
const seen = new Set<string>();
const uniqueEntries = allEntries.filter((entry) => {
  if (seen.has(entry.name)) return false;
  seen.add(entry.name);
  return true;
});

const markdown = generateMarkdown(uniqueEntries, title, description);

// Ensure output directory exists
fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, markdown);

console.log(`Generated ${OUTPUT_FILE}`);
console.log(`Total entries: ${uniqueEntries.length}`);
console.log(`Total lines: ${markdown.split("\n").length}`);
