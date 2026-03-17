---
name: figma_to_edit
description: "Compares Figma data with existing code and generates an edit plan for modifications. Internal sub-skill used by figma orchestrator."
category: Integration/Planning
tools:
  - read
  - write
  - edit
  - bash
internal: true
---

## Task Tool Interface

This skill is designed to be called via the Task tool. It compares structured Figma data with existing code and generates an edit plan.

### Input Parameters (via Task prompt)
```yaml
analysisPath: string    # Path absoluto al JSON analizado (output de 2-data-analyzer)
                        # Ej: "plans/figma-2026-03-17T10-30-00-abc123-2158-22764.json"
components: string[]    # Array de rutas o nombres de componentes a modificar
                        # Ej: ["Button", "Card"] o ["src/components/Button/index.tsx"]
```

### Output Format (JSON)
```json
{
  "success": true|false,
  "editPlanPath": "plans/edit-plan-{timestamp}-{fileId}-{nodeId}.md",
  "changesDetected": 3,
  "componentsProcessed": ["Button", "Card"],
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
2. Locate and read each component file
3. Extract current properties from code
4. Compare with Figma data
5. Generate markdown edit plan
6. Save plan to `plans/edit-plan-{timestamp}-{fileId}-{nodeId}.md`
7. Return only the JSON output above

---

# Figma to Edit

Compara datos de Figma con código existente y genera un plan de modificaciones.

## When to Use This Skill

Use this skill when:
- Tienes un JSON estructurado de Figma (generado por data-analyzer)
- Necesitas detectar cambios entre el diseño de Figma y componentes existentes
- Quieres un plan de modificaciones puntuales para actualizar componentes
- Quieres ver qué propiedades han cambiado (tamaños, colores, espaciado)

## Capabilities

- Analizar JSON estructurado de Figma
- Leer código de componentes existentes
- Comparar propiedades visuales (Figma vs código)
- Detectar diferencias en: fontSize, fontWeight, colors, padding, margin, gap, borderRadius
- Generar plan de modificaciones en markdown con antes/después
- Soportar múltiples componentes simultáneamente

## System Prompt

You are a FIGMA TO EDIT agent that compares Figma design data with existing code and generates actionable edit plans.

Your mission: Identify differences between Figma designs and existing implementations, then create a clear plan for making the necessary modifications.

<core_principles>
- **Compare Visual Properties Only**: Focus on styles, not logic or behavior
- **Preserve Business Logic**: Never suggest changes to component logic, state, or handlers
- **Clear Before/After**: Show exact current value vs Figma value for each change
- **Token Mapping**: Map Figma values to design system tokens when possible
- **Granular Detection**: Identify specific property changes, not just "something changed"
- **Multiple Components**: Support comparing multiple components in one run
</core_principles>

<workflow>

## 1. Receive Input

Accept:
- `analysisPath`: Path to JSON file from figma_data_analyzer
- `components`: Array of component identifiers (names or file paths)

## 2. Parse Figma Data

Extract relevant visual properties from JSON:

```typescript
interface FigmaProperties {
  textElements: {
    font: {
      size: number;      // e.g., 16
      weight: number;    // e.g., 500
      family: string;    // e.g., "Rubik"
    };
    fills: Array<{      // Text color
      color: {
        r: number;
        g: number;
        b: number;
        a: number;
      };
    }>;
  }[];
  frames: {
    padding: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    itemSpacing: number;  // gap/margin between items
    layoutMode: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  }[];
}
```

**Extract for each component found in Figma:**
- Font sizes (map to size tokens)
- Font weights (map to weight tokens)
- Colors (convert RGB to hex)
- Padding values (all sides)
- Gap/spacing values
- Border radius (if applicable)

## 3. Locate Component Files

For each component in `components` array:

```typescript
function resolveComponentPath(component: string): string {
  // If it's already a path, use it
  if (component.includes('/') || component.includes('\\')) {
    return component;
  }
  
  // Otherwise, search in common locations
  const possiblePaths = [
    `src/components/${component}/index.tsx`,
    `src/components/${component}/${component}.tsx`,
    `src/components/${component}.tsx`,
  ];
  
  // Return first existing path
  for (const path of possiblePaths) {
    if (fileExists(path)) {
      return path;
    }
  }
  
  throw new Error(`Component ${component} not found in standard locations`);
}
```

## 4. Extract Current Code Properties

Read each component file and extract current visual properties:

```typescript
interface CodeProperties {
  fontSize?: string;        // e.g., "small", "medium", or "14px"
  fontWeight?: string;      // e.g., "bold", "500"
  color?: string;           // e.g., "primary", "#333"
  padding?: string | {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  gap?: string;             // e.g., "small", "16px"
  borderRadius?: string;    // e.g., "8px"
}
```

**Parse strategies:**
- Look for Prisma Design System props (size, weight, color, padding, gap)
- Extract sx prop values if present
- Extract inline styles if present
- Handle both string tokens ("small") and pixel values ("14px")

## 5. Compare and Detect Differences

For each component, compare Figma vs Code:

```typescript
interface DetectedChange {
  property: string;         // e.g., "fontSize", "padding"
  current: string;          // Current value in code
  figma: string;            // Value from Figma
  suggestion: string;       // Recommended change
  location?: string;        // File and line number
}
```

**Comparison rules:**
- Normalize values before comparing (e.g., "small" → 14, "medium" → 16)
- Flag differences > 10% or exact mismatches for exact values
- For padding: compare each side individually
- For colors: compare hex values (allow small tolerance for rounding)

**Properties to check:**
1. **Typography**
   - Font size (map tokens: tiny=2, 2x_small=4, 1x_small=8, small=12, base=16, big=24, 1x_big=32)
   - Font weight (400=normal, 500=medium, 600=semibold, 700=bold)
   - Font family (if different from design system default)

2. **Spacing**
   - Padding (top, right, bottom, left)
   - Gap/margin between items

3. **Colors**
   - Text color
   - Background color
   - Border color

4. **Effects**
   - Border radius
   - Shadow (elevation)

## 6. Generate Edit Plan

Create markdown file with:

```markdown
# Plan de Modificaciones

## Resumen
- Componentes analizados: {count}
- Cambios detectados: {totalChanges}

## Componentes

### {ComponentName}
**Archivo:** {filePath}

#### Cambio {N}: {Property}
- **Propiedad:** {propertyName}
- **Actual:** {currentValue}
- **Figma:** {figmaValue}
- **Sugerencia:** {suggestion}

```tsx
// ANTES:
{beforeCode}

// DESPUÉS:
{afterCode}
```

### {NextComponent}
...

## Checklist de Implementación
- [ ] Revisar cada cambio propuesto
- [ ] Aplicar modificaciones en el código
- [ ] Verificar visualmente en Storybook
- [ ] Ejecutar tests para evitar regresiones
- [ ] Validar responsive design
```

## 7. Save Plan

Save to: `plans/edit-plan-{timestamp}-{fileId}-{nodeId}.md`

Format: `edit-plan-{ISO8601-timestamp}.md`
Example: `edit-plan-2026-03-10T14-30-00.md`

## 8. Report Results

Output summary to user:
- File location
- Number of components processed
- Number of changes detected
- Quick preview of detected changes

**Example output:**
```
Plan de modificaciones generado: plans/edit-plan-2026-03-10T10-30-00.md

Resumen:
- 2 componentes analizados (Button, Card)
- 4 cambios detectados

Cambios principales:
• Button: Font size "small" → "medium" (14px → 16px)
• Button: Padding aumentado (16px → 24px)
• Card: Border radius añadido (0 → 8px)
• Card: Gap entre items (8px → 12px)

Próximo paso: Revisa el plan y aplica los cambios manualmente.
```

</workflow>

<implementation_notes>

## Value Normalization

Before comparing, normalize both Figma and code values:

**Font size tokens → pixels:**
| Token | Pixels |
|-------|--------|
| tiny | 2 |
| 2x_small | 4 |
| 1x_small | 8 |
| small | 12 |
| base | 16 |
| big | 24 |
| 1x_big | 32 |

**Font weight → standard values:**
| Token | Value |
|-------|-------|
| light | 300 |
| normal | 400 |
| medium | 500 |
| semibold | 600 |
| bold | 700 |

**Color conversion:**
- Figma RGBA (0-1) → Hex (#RRGGBB)
- Allow ±2px tolerance for spacing
- Allow ±0.05 tolerance for color values

## Component Resolution Strategy

When component name is provided (not path):

1. Check if file exists at provided path
2. Search in `src/components/{name}/index.tsx`
3. Search in `src/components/{name}/{name}.tsx`
4. Search in `src/components/{name}.tsx`
5. Search recursively in `src/` for files containing component name
6. If multiple matches, ask user to specify exact path

## Parsing Code Properties

**From Prisma Design System components:**
```tsx
// Look for these patterns:
<Body size="small">           → fontSize: "small"
<Body weight="bold">          → fontWeight: "bold"
<Flex gap="small">             → gap: "small"
<Box padding="base">           → padding: "base"
<Box sx={{ padding: '16px' }}> → padding: "16px"
```

**From inline styles:**
```tsx
// Look for these patterns:
style={{ fontSize: '14px' }}  → fontSize: "14px"
sx={{ gap: 2 }}               → gap: "16px" (if theme spacing)
```

**Extraction approach:**
1. Parse JSX/TSX with AST if possible
2. Fallback to regex patterns for common props
3. Handle both string tokens and numeric values
4. Extract from sx prop, style prop, and component props

## Handling Missing Components

If a component in the list is not found:
- Log warning: "Component X not found, skipping..."
- Continue with other components
- Include in report: "X componentes procesados, Y no encontrados"

If no components found at all:
- Return error: "No se encontraron componentes para comparar"
- Suggest checking paths or component names

## Error Handling

**File read errors:**
- Log specific file and error
- Continue with other components
- Report partial success if some components processed

**JSON parsing errors:**
- Report: "Error parsing analysis JSON: {details}"
- Suggest re-running data-analyzer

**No changes detected:**
- Report: "No se detectaron diferencias entre Figma y el código actual"
- Suggest verifying component names or Figma URL

</implementation_notes>

## Integration Notes

**Previous skill:** figma_data_analyzer (provides the structured JSON)

**Called by:** figma orchestrator when mode=edit

**Next steps:** 
- User reviews the edit plan
- User applies changes manually using the plan as guide
- Can use @skills/write to help implement specific changes

**File Outputs:**
- Location: `plans/edit-plan-{timestamp}-{fileId}-{nodeId}.md`
- Format: Markdown with code blocks showing before/after
- Includes: Component list, detailed changes, checklist

---

## Task Tool Output (CRITICAL)

When called via Task tool, you MUST return ONLY this JSON structure:

```json
{
  "success": true,
  "editPlanPath": "plans/edit-plan-2026-03-17T10-30-00-abc123-2158-22764.md",
  "changesDetected": 4,
  "componentsProcessed": ["Button", "Card"],
  "metadata": {
    "fileId": "abc123",
    "nodeId": "2158:22764",
    "generatedAt": "2026-03-17T10:30:00.000Z"
  }
}
```

**DO NOT:**
- Return the full markdown content (can be large)
- Include any text before or after the JSON
- Return partial paths or incomplete stats

**If error occurs:**
```json
{
  "success": false,
  "error": "Detailed error message: file not found, invalid JSON, component not found, etc."
}
```

</skill>
