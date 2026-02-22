# AI Orchestrator

My personal AI skills orchestrator - intelligently routes tasks to specialized AI agents.

## What is This?

A collection of specialized AI skills (agents) in pure Markdown format that can be used from any IDE or AI tool. Instead of remembering which prompt to use for each task, the orchestrator intelligently selects the right skill for you.

## Philosophy

- **100% Markdown** - No code, no dependencies, no installation
- **Portable** - Works in any IDE that supports AI agents (Cursor, Windsurf, Cline, etc.)
- **Simple** - Just text files that you read and use
- **Modular** - Each skill is independent and focused on one thing
- **Extensible** - Adding a new skill = creating a new .md file

## Quick Start

### Using the Orchestrator

1. **Open your IDE** (Cursor, Windsurf, Cline, or any AI-enabled editor)

2. **Load the orchestrator** as your AI agent/prompt:
   - Point it to `orchestrator.md`
   - Or copy/paste the contents

3. **Ask it to do something:**
   ```
   "I need to add authentication to my API"
   ```

4. **The orchestrator will:**
   - Analyze your request
   - Decide if a specialized skill is needed
   - Route to the appropriate skill (or handle it directly)
   - Execute and return results

### Using Skills Directly

You can also use skills directly without the orchestrator:

1. Open the skill file (e.g., `skills/plan.md`)
2. Load it as your AI agent
3. Work directly with that specialized agent

## Current Skills

### plan
**Location:** `skills/plan/plan.md`

**What it does:** Researches and creates detailed, actionable multi-step plans

**When to use:**
- You need a strategy before implementing
- Requirements are unclear and need research
- The task is complex with potential edge cases
- You want to identify blockers before starting

**Example:**
```
"I need to add JWT authentication to my REST API"

The plan skill will:
→ Research your existing API structure
→ Ask clarifying questions
→ Identify edge cases and blockers
→ Create a detailed implementation plan
→ Iterate with you until approved
```

## Project Structure

```
D:\Proyectos\AI/
├── skills/
│   └── plan/
│       └── plan.md          # Planning skill
│
├── orchestrator.md          # Main orchestrator agent
├── README.md                # This file
└── TODO.md                  # Implementation checklist
```

## How It Works

### Architecture

```
User Request
     ↓
orchestrator.md (analyzes request)
     ↓
Decides: Direct answer OR Use skill
     ↓
If skill needed: Reads skills/[name]/[name].md
     ↓
Executes skill's System Prompt
     ↓
Returns result to user
```

### Skill Format

Each skill is a Markdown file with standard headers:

- `# SkillName` - The skill's name
- `## Metadata` - Category, triggers, tools, handoffs
- `## When to Use This Skill` - Criteria for when to use it
- `## Capabilities` - What the skill can do
- `## System Prompt` - The actual prompt that gets executed
- `## Examples` - Real-world usage examples

This standard format makes skills:
- Easy to read for humans and AI
- Parseable for future automation
- Self-documenting

## Adding New Skills

When you need a new specialized skill:

1. **Create a new folder and file** in `skills/` directory:
   ```
   skills/your-skill-name/
   └── your-skill-name.md
   ```

2. **Use the standard format** (see existing skills for reference)

3. **Update orchestrator.md:**
   - Add the skill to the "Available Skills" section
   - Add routing logic for when to use it

4. **Test it:**
   - Load the orchestrator
   - Try a request that should trigger your new skill
   - Verify it routes correctly

**That's it!** No compilation, no installation, no configuration.

## Compatible IDEs/Tools

This orchestrator works with any IDE or tool that can:
- Read Markdown files
- Use them as AI agent prompts
- Access file system to read skills

**Known compatible:**
- Cursor
- Windsurf
- Cline
- Claude Desktop (with file access)
- Any custom AI tool that reads prompts from files

## Use Cases

### Planning & Architecture
- "Plan how to refactor this monolith into microservices"
- "Outline the steps to add real-time features to my app"
- "Research and plan a migration from REST to GraphQL"

### Future Skills (coming soon)
- **implement** - Feature implementation
- **debug** - Debugging assistance
- **test** - Test generation
- **refactor** - Code refactoring
- **document** - Documentation generation
- **review** - Code review

## FAQ

### Do I need to install anything?
No. Just Markdown files. Works immediately.

### Can I use this without the orchestrator?
Yes! You can use any skill directly by loading its .md file.

### How do I share a skill with others?
Just copy the .md file. It's portable and self-contained.

### Can I modify the skills?
Absolutely! They're just Markdown files. Edit them to fit your needs.

### Does this work offline?
The skills themselves are offline. But when the AI executes them, it needs an internet connection to access the AI model (Claude, GPT, etc.).

### Why not use MCP or build a CLI?
Simplicity. This approach:
- Works everywhere immediately
- No maintenance burden
- No version conflicts
- No installation steps
- Maximum portability

If you need MCP or CLI later, you can always build adapters on top of these Markdown skills.

## Roadmap

### Phase 1 (Current)
- ✅ Orchestrator
- ✅ Plan skill
- ✅ Documentation

### Phase 2 (Next)
- [ ] Skill template for easy creation
- [ ] More specialized skills (implement, debug, test, refactor)
- [ ] Improved routing logic

### Phase 3 (Future)
- [ ] Skill categories and organization
- [ ] Auto-discovery of skills
- [ ] Skill composition (chaining multiple skills)
- [ ] Community skill sharing

## Contributing

This is a personal project, but if you want to:
- Suggest improvements
- Share your own skills
- Report issues

Feel free to open an issue or submit a pull request.

## License

Do whatever you want with this. It's just Markdown files.

## Philosophy & Design Principles

1. **YAGNI** (You Aren't Gonna Need It) - Only build what's needed now
2. **Simplicity over features** - Markdown beats code
3. **Portability over integration** - Works everywhere beats works perfectly in one place
4. **Text over tools** - Files beat frameworks
5. **Humans first** - If a human can't read it easily, it's wrong

---

**Questions? Issues? Ideas?**

The orchestrator is designed to grow organically. Start simple, add skills as you need them, keep it portable.