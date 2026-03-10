import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "fs";
import { z } from "zod";

// ─── Helpers ────────────────────────────────────────────────────────────────

const ROOT = new URL(".", import.meta.url).pathname;

function loadSkill(relativePath: string): string {
  try {
    return readFileSync(`${ROOT}skills/${relativePath}`, "utf-8");
  } catch {
    return `[Error: skill file not found at skills/${relativePath}]`;
  }
}

function skillResult(content: string) {
  return { content: [{ type: "text" as const, text: content }] };
}

// ─── Server ─────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "mis-skills-repo",
  version: "1.0.0",
});

// ─── Skill: plan ─────────────────────────────────────────────────────────────

server.tool(
  "plan",
  "Researches and creates detailed multi-step plans before implementation. Use when the user needs planning, strategy, a roadmap, or wants to understand how to approach a complex or unclear task before writing any code.",
  {
    task: z.string().describe("Describe the task or goal you want to plan"),
    context: z
      .string()
      .optional()
      .describe("Additional context, constraints, or relevant files/symbols"),
  },
  async ({ task, context }) => {
    const skill = loadSkill("plan/plan.md");
    const parts = [
      `# Skill: Plan\n`,
      skill,
      `\n---\n`,
      `## Task to plan\n${task}`,
      context ? `\n## Additional context\n${context}` : "",
    ];
    return skillResult(parts.join("\n"));
  },
);

// ─── Skill: write ────────────────────────────────────────────────────────────

server.tool(
  "write",
  "Autonomously implements features, fixes bugs, and refactors code with senior engineer standards. Use when the user asks to implement, build, create, fix, debug, or refactor — especially for multi-file changes that require scanning the codebase.",
  {
    task: z
      .string()
      .describe("What to implement, fix, or refactor — be specific"),
    plan: z
      .string()
      .optional()
      .describe(
        "Reference to an existing plan (from the plan skill) to execute, if any",
      ),
    context: z
      .string()
      .optional()
      .describe("Relevant file paths, symbols, or constraints"),
  },
  async ({ task, plan, context }) => {
    const skill = loadSkill("write/write.md");
    const parts = [
      `# Skill: Write\n`,
      skill,
      `\n---\n`,
      `## Task\n${task}`,
      plan ? `\n## Existing plan\n${plan}` : "",
      context ? `\n## Context\n${context}` : "",
    ];
    return skillResult(parts.join("\n"));
  },
);

// ─── Skill: write-a-skill ────────────────────────────────────────────────────

server.tool(
  "write_a_skill",
  "Meta-skill for creating new agent skills with the correct structure, metadata, and routing-optimised descriptions. Use when the user wants to create, write, or build a new skill for the orchestrator.",
  {
    skillName: z.string().describe("Name of the new skill to create"),
    purpose: z
      .string()
      .describe("What should this skill do? Describe its domain and goals"),
    triggers: z
      .string()
      .optional()
      .describe(
        "Keywords or phrases that should route to this skill (comma-separated)",
      ),
    examples: z
      .string()
      .optional()
      .describe("1-3 concrete example use cases for this skill"),
  },
  async ({ skillName, purpose, triggers, examples }) => {
    const skill = loadSkill("write-a-skill/write-a-skill.md");
    const parts = [
      `# Skill: Write-a-Skill\n`,
      skill,
      `\n---\n`,
      `## New skill to create`,
      `**Name:** ${skillName}`,
      `**Purpose:** ${purpose}`,
      triggers ? `**Triggers:** ${triggers}` : "",
      examples ? `\n## Examples\n${examples}` : "",
    ];
    return skillResult(parts.filter(Boolean).join("\n"));
  },
);

// ─── Skill: figma / pipeline ─────────────────────────────────────────────────

server.tool(
  "figma_pipeline",
  "Runs the complete Figma workflow in one command: fetch from Figma API → analyse → save structured JSON. Use when the user provides a Figma URL and wants to process or extract the design data without caring about the individual steps.",
  {
    figmaUrl: z
      .string()
      .url()
      .describe(
        "Full Figma design URL, e.g. https://www.figma.com/design/{fileId}/...?node-id={nodeId}",
      ),
    figmaToken: z
      .string()
      .describe("Figma personal access token — paste it directly in the chat"),
    forceRefresh: z
      .boolean()
      .default(false)
      .describe("Set to true to skip the cache and always fetch fresh data"),
  },
  async ({ figmaUrl, figmaToken, forceRefresh }) => {
    const orchestrator = loadSkill("figma/orchestrator.md");
    const pipeline = loadSkill("figma/pipeline.md");
    const parts = [
      `# Skill: Figma Pipeline\n`,
      `## Figma Domain Orchestrator\n`,
      orchestrator,
      `\n---\n`,
      `## Pipeline Skill\n`,
      pipeline,
      `\n---\n`,
      `## Execution parameters`,
      `- **URL:** ${figmaUrl}`,
      `- **Token:** ${figmaToken}`,
      `- **Force refresh:** ${forceRefresh}`,
    ];
    return skillResult(parts.join("\n"));
  },
);

// ─── Skill: figma / api-fetch ────────────────────────────────────────────────

server.tool(
  "figma_api_fetch",
  "Makes a direct call to the Figma REST API and returns the raw JSON response for a given file and node. Use when the user explicitly wants to fetch or get raw Figma API data without running the full pipeline.",
  {
    fileId: z
      .string()
      .describe(
        "Figma file ID extracted from the URL path (e.g. 3sZE6Ke3MSPwcdrhSLQkgG)",
      ),
    nodeId: z
      .string()
      .describe(
        "Figma node ID with colons, not hyphens (e.g. 2158:22764). Convert hyphens to colons if needed.",
      ),
    figmaToken: z
      .string()
      .describe("Figma personal access token — paste it directly in the chat"),
  },
  async ({ fileId, nodeId, figmaToken }) => {
    const skill = loadSkill("figma/api-fetch.md");
    const apiUrl = `https://api.figma.com/v1/files/${fileId}/nodes?ids=${nodeId}`;
    const parts = [
      `# Skill: Figma API Fetch\n`,
      skill,
      `\n---\n`,
      `## Execution parameters`,
      `- **fileId:** ${fileId}`,
      `- **nodeId:** ${nodeId}`,
      `- **API URL:** ${apiUrl}`,
      `- **Token:** ${figmaToken}`,
    ];
    return skillResult(parts.join("\n"));
  },
);

// ─── Skill: figma / data-analyzer ───────────────────────────────────────────

server.tool(
  "figma_data_analyzer",
  "Processes a raw Figma API JSON response and extracts structured design data (components, colours, typography, effects). Use when the user has a raw Figma API response and wants to parse, analyse, or structure it for code generation.",
  {
    apiResponseOrPath: z
      .string()
      .describe(
        "Either the raw Figma API JSON string or a file path pointing to a saved response",
      ),
    fileId: z
      .string()
      .optional()
      .describe("Figma file ID (used to populate metadata in the output)"),
    nodeId: z
      .string()
      .optional()
      .describe("Figma node ID (used to populate metadata in the output)"),
    sourceUrl: z
      .string()
      .optional()
      .describe("Original Figma URL (stored in metadata for traceability)"),
  },
  async ({ apiResponseOrPath, fileId, nodeId, sourceUrl }) => {
    const skill = loadSkill("figma/data-analyzer.md");
    const parts = [
      `# Skill: Figma Data Analyzer\n`,
      skill,
      `\n---\n`,
      `## Execution parameters`,
      `- **fileId:** ${fileId ?? "(not provided)"}`,
      `- **nodeId:** ${nodeId ?? "(not provided)"}`,
      `- **sourceUrl:** ${sourceUrl ?? "(not provided)"}`,
      `\n## API response / file path\n\`\`\`\n${apiResponseOrPath}\n\`\`\``,
    ];
    return skillResult(parts.join("\n"));
  },
);

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    "MCP Server running on STDIO — skills registered: plan, write, write_a_skill, figma_pipeline, figma_api_fetch, figma_data_analyzer",
  );
}

main().catch(console.error);
