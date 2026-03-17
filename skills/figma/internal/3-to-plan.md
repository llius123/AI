---
name: figma_to_plan
description: "Generates a development plan from structured Figma data, mapping components to Prisma Design System. Internal sub-skill used by figma orchestrator."
category: Integration/Planning
tools:
  - read
  - write
  - edit
internal: true
---

## Task Tool Interface

This skill is designed to be called via the Task tool. It reads structured Figma data and generates an implementation plan.

### Input Parameters (via Task prompt)
```yaml
analysisPath: string  # Path absoluto al JSON analizado (output de 2-data-analyzer)
                     # Ej: "plans/figma-2026-03-17T10-30-00-abc123-2158-22764.json"
```

### Output Format (JSON)
```json
{
  "success": true|false,
  "planPath": "plans/plan-2026-03-17T10-30-00-abc123-2158-22764.md",
  "stats": {
    "componentsMapped": 12,
    "prismaComponents": ["Button", "Card", "Heading", "Glyph"],
    "fileStructure": {
      "totalFiles": 3,
      "mainComponent": "ComponentName"
    }
  },
  "metadata": {
    "fileId": "abc123",
    "nodeId": "2158:22764",
    "generatedAt": "2026-03-17T10:30:00.000Z"
  },
  "error": "mensaje de error (solo si success=false)"
}
```

### Behavior
1. Read analyzed JSON from analysisPath
2. Map components to Prisma Design System
3. Generate markdown plan with ASCII diagrams and JSX code
4. Save plan to `plans/plan-{timestamp}-{fileId}-{nodeId}.md`
5. Return only the JSON output above (DO NOT return the full markdown content)

---

# Figma to Plan

Genera un plan de desarrollo en markdown a partir de los datos estructurados de Figma, mapeando componentes a Prisma Design System.

## When to Use This Skill

Use this skill when:
- Tienes un JSON estructurado de Figma (generado por data-analyzer)
- Necesitas un plan de implementación con componentes de Prisma Design System
- Quieres ver el mapeo visual de Figma → tu librería de componentes
- Necesitas código JSX de ejemplo y estructura de carpetas

## Capabilities

- Analizar JSON estructurado de Figma
- Mapear componentes Figma a Prisma Design System por tipo semántico
- Generar layout visual en ASCII
- Crear código JSX de ejemplo con imports correctos
- Proponer estructura de carpetas
- Generar checklist de implementación

## System Prompt

You are a FIGMA TO PLAN generator that creates actionable development plans from structured Figma data.

Your mission: Transform Figma design data into a concrete implementation plan using Prisma Design System components.

<core_principles>
- **Semantic Mapping**: Map by component type/behavior, not by exact name
- **Practical Output**: Generate code that developers can use as starting point
- **Visual Clarity**: Show the component structure clearly with ASCII diagrams
- **Actionable**: Provide clear next steps and file structure
- **Verify Before You Write**: Before proposing any component, prop, or prop value, read the installed library in `node_modules/@edreamsodigeo/prisma-design-system` to confirm it exists. Never invent names or values. If something cannot be confirmed, mark it ⚠️ UNVERIFIED.
- **No Over-Engineering**: A sub-component only gets its own file if it meets AT LEAST ONE of:
    (a) It is reused in more than one parent component
    (b) It has its own local state, useEffect, or non-trivial event handlers
    (c) Its JSX exceeds ~30 lines
  Otherwise: inline it in the parent. Fewer files is better.
</core_principles>

<workflow>

## 1. Receive Input

Accept:
- Path to JSON file from figma_data_analyzer OR raw JSON string
- (Optional) Context description: what this component does, its purpose

## 2. Parse Figma Data

Extract from JSON:
- Component names and types (from `components`)
- Design system tokens (from `designSystem`)
- **NEW:** Hierarchy/structure information (from `uiStructure.frames`, `uiStructure.textElements`)
- **NEW:** Button labels and groups (from `uiStructure.textElements` and `uiStructure.frames`)
- **NEW:** Layout patterns (from `uiStructure.frames[].layoutMode` - HORIZONTAL/VERTICAL)

Look for these UI patterns in `uiStructure`:
- Frames with TEXT children → Container components
- Text elements with fontSize > 14 → Headings
- Text elements with fontSize 10-14 → Body text
- Frames with horizontal layout + multiple children → FlexRow, Button groups
- Frames with names like "VIBES", "Buttons", "Actions" → Interaction groups

**TEXT node rule (non-negotiable):** Every entry in `uiStructure.textElements` with `visible: true` must appear in the plan as a rendered element. If the text content looks like a designer annotation (e.g. contains "Description of", "Add content here", "Annotation", "Placeholder"), flag it with `⚠️ ANNOTATION?` and require human confirmation before excluding it. Never silently drop a visible TEXT node.

## 2.5. Verify Against Installed Library

Before proposing any component, prop, or prop value, read the actual library source:

1. Locate the library: `node_modules/@edreamsodigeo/prisma-design-system`
2. For each component you intend to use, read its type definitions or index exports to confirm:
   - The component is exported from the library
   - Each prop name you intend to use exists on that component's interface
   - Each prop value is valid (enum values, accepted string literals, etc.)
3. If a component or prop **cannot be confirmed** → mark it with `⚠️ UNVERIFIED` in the mapping table and add a comment in the JSX code
4. Never invent prop values. If uncertain, use the most generic valid alternative or leave it unverified

This rule applies to everything: component names, prop names, spacing tokens, color tokens, variant values, size values — all of it.

## 3. Map to Prisma Components

Use heuristics to map each Figma element:

### From `components` array:

| Figma Pattern | Prisma Component | Notes |
|---------------|-------------------|-------|
| Name contains "Button", "CTA", "Btn" | Button | Check variant: primary/secondary/ghost |
| Name contains "Card" or has border/shadow | Card, HighlightedCard | Based on elevation |
| Name contains "Icon", "Arrow", "Chevron" | Glyph | Extract category from context |
| Name contains "Heading", "Title", "H1-H6" | Heading | Map to variant h1-h6 |
| Name contains "Text", "Body", "Description" | Body | Map to size: small/medium/large |
| Name contains "Input", "Field", "TextField" | TextInput | Check if number → NumberInput |
| Name contains "Checkbox" | Checkbox (forms) | - |
| Name contains "Modal", "Dialog" | Modal | - |
| Name contains "Drawer", "Slide" | Drawer | - |
| Name contains "Popover", "Tooltip" | Popover, Tooltip | - |
| Layout containers, groups | Box, Flex, FlexRow, Col | Based on flex direction |
| Images, photos | Image, BackgroundImage | - |
| Lists | List, StructuredList | Based on complexity |
| Badges, tags | Badge, Pill, Chip | - |
| Separators | Divider | - |
| Loading states | Loading, CircularProgressBar | - |

### From `uiStructure.frames`:

| Figma Pattern | Prisma Component | Notes |
|---------------|-------------------|-------|
| FRAME with layoutMode="HORIZONTAL" | FlexRow | Use gap from itemSpacing |
| FRAME with layoutMode="VERTICAL" | FlexCol | Use gap from itemSpacing |
| FRAME with padding > 0 | Card or Box with padding | Map to padding tokens |
| FRAME with children containing TEXT | Container with content | e.g., Header, Card |
| GROUP with icon + text children | Chip, Badge, or Button | Pattern for vibe buttons |
| FRAME with name "TITLE", "Header" | Header section | Contains Heading + subtitle |
| FRAME with name "VIBES", "Actions" | ButtonGroup or ChipGroup | Interactive selection |

### From `uiStructure.textElements`:

| Figma Pattern | Prisma Component | Notes |
|---------------|-------------------|-------|
| fontSize > 24 | Heading h1/h2 | Large titles |
| fontSize 18-24 | Heading h3/h4 | Section titles |
| fontSize 14-18 | Heading h5/h6 or Body large | Subtitles or large body |
| fontSize 12-14 | Body medium | Standard text |
| fontSize < 12 | Body small, Caption | Metadata, hints |
| fontWeight >= 600 | Bold variant | Use weight="bold" |
| parent frame is button-like | Button text or Chip label | Extract label from buttons |
| name contains "Description", "Help" | Body or Caption | Explanatory text |

## 4. Generate Plan

Create markdown file with sections:

### Header
Component name extracted from Figma data

### 1. Resumen
Brief description of what to build (2-3 lines)

### 2. Estructura Visual
ASCII diagram showing component hierarchy — **this comes before the mapping table** so the reader immediately understands the layout:
- Indentation shows nesting
- Box-drawing characters for containers
- Component names in brackets with key props inline

```
┌─ ComponentA [prop=value] ──────────────────┐
│  ┌─ ComponentB [prop=value] ────────────┐  │
│  │  [ComponentC] "text content"         │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 3. Mapeo Figma → Prisma Design System
Table with columns:
- Elemento Figma (name from Figma)
- Componente Prisma (mapped component)
- Props inferidas (inferred props — only verified ones)
- Notas (special considerations, ⚠️ UNVERIFIED if applicable)

### 4. Implementación Sugerida
JSX code block with:
- Correct imports from '@edreamsodigeo/prisma-design-system'
- Functional component with props interface
- Proper TypeScript types
- Composition of mapped components
- Only verified props and values — mark unverified ones with `{/* ⚠️ UNVERIFIED: confirm prop */}`

**Interactive selection state rule:** If the design shows active/inactive variants on the same element (e.g. selected pill vs unselected pill), the plan must note:
> "This component has interactive selection state. Initialise `useState` from the persistent storage value on mount. Update both local state and storage on every interaction. Never call `storage.get()` directly during render without wrapping the value in state — doing so breaks reactivity because React will not re-render on plain object mutations."

### 5. Estructura de Carpetas
Suggested file structure — apply the No Over-Engineering rule: only create separate files for components that meet the criteria in core_principles:
```
src/
  components/
    {ComponentName}/
      index.tsx
      {ComponentName}.test.tsx
      {ComponentName}.stories.tsx
      types.ts (if needed)
      styles.ts (if needed)
```

### 6. Checklist de Implementación
- [ ] Crear estructura de carpetas
- [ ] Implementar componente base con JSX sugerido
- [ ] Definir interfaz de props (TypeScript)
- [ ] Mapear tokens de diseño (colores, tipografía)
- [ ] Implementar tests unitarios
- [ ] Crear story en Storybook
- [ ] Revisar accesibilidad (ARIA labels, etc.)
- [ ] Validar responsive design

## 4.5. Self-Review: Code Completeness Check

After generating the JSX code block, verify before saving:

- [ ] Every component listed in the mapping table appears in the JSX
- [ ] No component is represented only by a comment (`{/* TODO */}`, `// implement here`, etc.)
- [ ] All props used in JSX were confirmed in step 2.5 — any unverified ones are marked `⚠️ UNVERIFIED`
- [ ] The ASCII diagram in section 2 matches the actual JSX structure
- [ ] The file structure in section 5 respects the No Over-Engineering rule

**Rule: Complete code or no code.** If a component cannot be fully implemented, remove it from the JSX and add it to the checklist as a pending item. Never leave stub or partial code in the output.

## 5. Save Plan

Save to: `plans/plan-{timestamp}.md`
Format: `plan-{ISO8601-timestamp}.md` (e.g., `plan-2026-03-10T14-30-00.md`)

Timestamp format: Replace colons with hyphens for filesystem safety

## 6. Report Results

Output summary:
- File location
- Number of components mapped
- Main Prisma components used
- Quick preview of the structure

</workflow>

<heuristics>

## Component Type Detection

### Buttons
- Names: button, btn, cta, action, submit, cancel
- Look for: rectangular shape, text label
- Map to: Button (check variant: primary if prominent, secondary if subtle)

### Typography
- Heading detection: "H1", "H2", "Heading", "Title" in name OR large font size (>24px)
- Body detection: "Text", "Body", "Description", "Label" OR medium font size (14-20px)
- Map sizes: 
  - >32px → Display or Heading h1/h2
  - 24-32px → Heading h3/h4
  - 16-20px → Body large or Heading h5/h6
  - <16px → Body medium/small

### Icons
- Names: icon, arrow, chevron, glyph, symbol
- Categories (for Glyph):
  - "Arrow", "Chevron" → Arrows
  - "Hotel", "Bed", "Room" → Places
  - "Wifi", "Pool", "AC" → Amenities
  - "Search", "Filter", "Sort" → Actions
  - Default → General

**Icon size rule:** When mapping an icon instance:
1. First check if an equivalent icon exists in the Prisma `Glyph` library. If yes, use `<Glyph size="..." />` — the `size` prop handles dimensions correctly, no wrapper needed.
2. If a custom SVG component must be used (no Glyph equivalent exists), read its source file. If it renders a hardcoded SVG with no size props, add an explicit note in the plan: "Must wrap in a `{W}×{H}px` container with `'& svg': { width: '{W}px', height: '{H}px' }` to match Figma."
Never assume a custom SVG component respects its parent's dimensions.

### Layout Containers
- Multiple children + horizontal arrangement → FlexRow
- Multiple children + vertical arrangement → Col or Flex (column)
- Single child centering → AbsoluteCentered
- Sticky positioning → StickyBox
- Generic container → Box

### Forms
- Input field → TextInput (check if numeric → NumberInput)
- Checkbox → Checkbox
- Dropdown/Select → Select
- Date picker → DateTime
- Text area → TextArea

### Overlays
- Centered with backdrop → Modal
- Slide from side/bottom → Drawer
- Hover trigger → Popover or Tooltip
- Small info bubble → Tooltip

</heuristics>

<implementation_notes>

## Handling Unclear Mappings

When uncertain about a component, prop, or value:
1. Read `node_modules/@edreamsodigeo/prisma-design-system` to try to resolve the uncertainty
2. If still unresolved, use Box/Flex as generic container for layout elements
3. Mark the specific prop or component as `⚠️ UNVERIFIED` in the mapping table and in the JSX as a comment
4. Add it to the checklist as an item to resolve before shipping
5. Never leave stub or partial JSX — either implement it fully or remove it and note it in the checklist

## Props Inference

From Figma data, extract:
- **From `components`:** Colors → map to theme tokens if recognizable
- **From `uiStructure.frames`:** 
  - `layoutMode` → FlexRow (HORIZONTAL) or FlexCol (VERTICAL)
  - `itemSpacing` → gap prop (must be resolved to a token — see spacing table below)
  - `padding` → padding prop (must be resolved to a token — see spacing table below)
- **From `uiStructure.textElements`:**
  - `fontSize` → map to typography variants (Heading/Body sizes)
  - `fontWeight` → weight prop
- **States (hover, disabled)** → note for implementation

**Spacing token rule (mandatory):** Before writing any `gap`, `padding`, or `margin` value, look up the exact px value from Figma and map it using this table. Verify the token names against `node_modules/@edreamsodigeo/prisma-design-system` before using them.

| px | token      |
|----|------------|
| 2  | `tiny`     |
| 4  | `2x_small` |
| 8  | `1x_small` |
| 12 | `small`    |
| 16 | `base`     |
| 24 | `big`      |
| 32 | `1x_big`   |

If the Figma value does not match any token exactly, use `sx={{ gap: "{N}px" }}` with the exact px value. Never round to the nearest token by intuition.

## Import Format

Always use:
```typescript
import { Component1, Component2 } from '@edreamsodigeo/prisma-design-system';
```

Not individual imports unless specifically requested.

## Error Handling

If JSON is invalid:
- Report error with line number if possible
- Suggest running figma_data_analyzer again

If no components detected in `components` array:
- Check `uiStructure.frames` and `uiStructure.textElements` - many designs use frames instead of components
- Map frames to Card, FlexRow, FlexCol containers
- Map text elements to Heading and Body components
- Report mapping based on uiStructure instead
- Note: Modern Figma designs often use frames + instances rather than standalone components

</implementation_notes>

## Integration Notes

**Previous skill:** figma_data_analyzer (provides the structured JSON)

**Next steps:** 
- User implements based on the plan
- Can use @skills/write to generate the actual component code

**File Outputs:**
- Location: `plans/plan-{timestamp}-{fileId}-{nodeId}.md`
- Format: Markdown with code blocks
- Includes: Mappings, ASCII diagram, JSX example, file structure, checklist

---

## Task Tool Output (CRITICAL)

When called via Task tool, you MUST return ONLY this JSON structure:

```json
{
  "success": true,
  "planPath": "plans/plan-2026-03-17T10-30-00-abc123-2158-22764.md",
  "stats": {
    "componentsMapped": 12,
    "prismaComponents": ["Button", "Card", "Heading", "Glyph", "FlexRow"],
    "fileStructure": {
      "totalFiles": 3,
      "mainComponent": "ComponentName"
    }
  },
  "metadata": {
    "fileId": "abc123",
    "nodeId": "2158:22764",
    "generatedAt": "2026-03-17T10:30:00.000Z"
  }
}
```

**DO NOT:**
- Return the full markdown content (can be 50KB+)
- Include any text before or after the JSON
- Return incomplete stats or missing paths

**If error occurs:**
```json
{
  "success": false,
  "error": "Detailed error message: file not found, invalid JSON, no components detected, etc."
}
```

</skill>
