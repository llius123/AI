import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { z } from "zod";
import matter from "gray-matter";

// ─── Configuration ───────────────────────────────────────────────────────────

const ROOT = new URL(".", import.meta.url).pathname;
const SKILLS_DIR = join(ROOT, "skills");

// ─── Types ──────────────────────────────────────────────────────────────────

interface SkillParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

interface SkillMetadata {
  name: string;
  description: string;
  parameters: SkillParameter[];
}

interface ParsedSkill extends SkillMetadata {
  content: string;
  filePath: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function skillResult(content: string) {
  return { content: [{ type: "text" as const, text: content }] };
}

function getZodType(type: string): z.ZodTypeAny {
  switch (type) {
    case "string": return z.string();
    case "number": return z.number();
    case "boolean": return z.boolean();
    case "url": return z.string().url();
    default: return z.string();
  }
}

// ─── Skill Discovery & Loading ──────────────────────────────────────────────

function discoverSkills(): ParsedSkill[] {
  const skills: ParsedSkill[] = [];
  
  // 1. Scan skills directory
  const entries = readdirSync(SKILLS_DIR);
  
  for (const entry of entries) {
    const entryPath = join(SKILLS_DIR, entry);
    const stat = statSync(entryPath);
    
    if (!stat.isDirectory()) continue;
    
    // 2. Look for .md files in each subdirectory
    // Skip subdirectories named 'internal/' - those are for orchestrator-internal use only
    const files = readdirSync(entryPath, { recursive: true }) as string[];
    const mdFiles = files.filter(f => f.endsWith(".md") && !f.includes("internal/"));
    
    for (const mdFile of mdFiles) {
      const filePath = join(entryPath, mdFile);
      const fileContent = readFileSync(filePath, "utf-8");
      
      // 3. Parse frontmatter
      const { data: frontmatter, content } = matter(fileContent);
      
      // 4. Validate required fields
      if (!frontmatter.name || !frontmatter.description || !Array.isArray(frontmatter.parameters)) {
        console.error(`⚠️  Skipping ${filePath}: missing required frontmatter`);
        continue;
      }
      
      skills.push({
        name: frontmatter.name,
        description: frontmatter.description,
        parameters: frontmatter.parameters,
        content,
        filePath,
      });
    }
  }
  
  return skills;
}

// ─── Skill Registration ───────────────────────────────────────────────────────

function registerSkill(server: McpServer, skill: ParsedSkill) {
  // Build Zod schema dynamically
  const schema: Record<string, z.ZodTypeAny> = {};
  
  for (const param of skill.parameters) {
    let validator = getZodType(param.type);
    if (!param.required) {
      validator = validator.optional();
    }
    schema[param.name] = validator.describe(param.description);
  }
  
  // Create generic handler
  const handler = async (params: Record<string, any>) => {
    const parts = [
      `# Skill: ${skill.name}\n`,
      skill.content,
      `\n---\n`,
      `## Execution parameters`,
    ];
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        parts.push(`- **${key}:** ${value}`);
      }
    }
    
    return skillResult(parts.join("\n"));
  };
  
  // Register with MCP server
  server.tool(skill.name, skill.description, schema, handler);
  console.error(`✅ Registered skill: ${skill.name}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const server = new McpServer({
    name: "mis-skills-repo",
    version: "1.0.0",
  });
  
  // Discover and register all skills
  const skills = discoverSkills();
  
  if (skills.length === 0) {
    console.error("⚠️  No skills found in", SKILLS_DIR);
  } else {
    console.error(`🔍 Found ${skills.length} skill(s)`);
    for (const skill of skills) {
      registerSkill(server, skill);
    }
  }
  
  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  const skillNames = skills.map(s => s.name).join(", ");
  console.error(
    `MCP Server running on STDIO — skills registered: ${skillNames || "none"}`,
  );
}

main().catch(console.error);
