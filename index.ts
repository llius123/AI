import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
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

interface ParsedSkill {
  name: string;
  description: string;
  parameters: SkillParameter[];
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

function discoverSkills(): { skills: ParsedSkill[]; constraintsContent: string | null } {
  const skills: ParsedSkill[] = [];
  let constraintsContent: string | null = null;
  
  // 1. Scan skills directory
  const entries = readdirSync(SKILLS_DIR);
  
  for (const entry of entries) {
    const entryPath = join(SKILLS_DIR, entry);
    const stat = statSync(entryPath);
    
    // Check if this is constraining-responses folder with CONSTRAINTS.md
    if (entry === 'constraining-responses' && stat.isDirectory()) {
      const constraintsPath = join(entryPath, 'CONSTRAINTS.md');
      if (existsSync(constraintsPath)) {
        const fileContent = readFileSync(constraintsPath, 'utf-8');
        constraintsContent = fileContent;
        console.error(`🔒 Base constraints loaded - auto-applied to all skills`);
      }
      continue;
    }
    
    if (!stat.isDirectory()) {
      continue;
    }
    
    // 2. Look for SKILL.md in each subdirectory (Anthropic format)
    const skillFile = join(entryPath, 'SKILL.md');
    if (!existsSync(skillFile)) {
      console.error(`⚠️  Skipping ${entry}: no SKILL.md found`);
      continue;
    }
    
    const fileContent = readFileSync(skillFile, 'utf-8');
    
    // 3. Parse frontmatter
    const { data: frontmatter, content } = matter(fileContent);
    
    // 4. Validate Anthropic standard: only name and description required
    if (!frontmatter.name || !frontmatter.description) {
      console.error(`⚠️  Skipping ${skillFile}: missing required frontmatter (name, description)`);
      continue;
    }
    
    // Parameters are optional in Anthropic standard, default to empty array
    skills.push({
      name: frontmatter.name,
      description: frontmatter.description,
      parameters: frontmatter.parameters || [],
      content,
      filePath: skillFile,
    });
  }
  
  return { skills, constraintsContent };
}

// ─── Skill Registration ───────────────────────────────────────────────────────

function registerSkill(server: McpServer, skill: ParsedSkill, constraintsContent: string | null) {
  // Build Zod schema dynamically
  const schema: Record<string, z.ZodTypeAny> = {};
  
  for (const param of skill.parameters) {
    let validator = getZodType(param.type);
    if (!param.required) {
      validator = validator.optional();
    }
    schema[param.name] = validator.describe(param.description);
  }
  
  // Create generic handler with constraints prepended
  const handler = async (params: Record<string, any>) => {
    const parts = [
      constraintsContent ? '[Base constraints active]\n\n' + constraintsContent + '\n\n---\n\n' : '',
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
  console.error(`✅ Registered skill: ${skill.name}${constraintsContent ? ' [+constraints]' : ''}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const server = new McpServer({
    name: "mis-skills-repo",
    version: "1.0.0",
  });
  
  // Discover and register all skills
  const { skills, constraintsContent } = discoverSkills();
  
  if (skills.length === 0) {
    console.error("⚠️  No skills found in", SKILLS_DIR);
  } else {
    console.error(`🔍 Found ${skills.length} skill(s)`);
    for (const skill of skills) {
      registerSkill(server, skill, constraintsContent);
    }
  }
  
  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  const skillNames = skills.map(s => s.name).join(", ");
  console.error(
    `MCP Server running on STDIO — skills registered: ${skillNames || "none"}`,
  );
  
  // Base constraints status
  if (constraintsContent) {
    console.error(`🔒 Base constraints ACTIVE — auto-applied to all skill invocations`);
  } else {
    console.error(`⚠️  Base constraints NOT FOUND — skills will run without constraints`);
  }
}

main().catch(console.error);
