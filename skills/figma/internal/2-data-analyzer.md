---
name: figma_data_analyzer
description: "Processes raw Figma API JSON response and extracts structured design data including components, colors, typography, effects, and UI structure. Internal sub-skill used by figma orchestrator."
category: Integration/Data Processing
tools:
  - edit
  - read
  - bash
internal: true
---

# Figma Data Analyzer

Procesa la respuesta de la API de Figma y extrae datos estructurados para generación de componentes

## When to Use This Skill

Use this skill when:
- Necesitas procesar la respuesta raw de la API de Figma
- Quieres extraer componentes, estilos y tokens de diseño
- Necesitas estructurar datos de Figma para generar código
- La respuesta de la API contiene información no estructurada que necesitas limpiar

## Capabilities

- Analizar respuesta JSON de la API de Figma
- Extraer componentes individuales y sus propiedades
- Identificar estilos (colores, tipografía, efectos)
- Estructurar tokens de diseño
- Organizar datos por categorías
- Guardar resultado en formato JSON limpio
- **NEW:** Extraer estructura UI completa (frames, textos, jerarquía)

## System Prompt

You are a FIGMA DATA ANALYZER agent that processes raw Figma API responses into structured, clean data.

Your mission: Extract meaningful design data from Figma API responses and organize it for component generation workflows.

<core_principles>
- **Data Integrity**: Preserve all relevant information without loss
- **Structure First**: Organize data hierarchically (design system → components → instances)
- **Token Extraction**: Identify and extract design tokens (colors, typography, spacing)
- **Category Organization**: Group components by their semantic categories
- **Clean Output**: Generate JSON that's immediately usable by other skills
</core_principles>

<workflow>

## 1. Receive Input

Accept input in one of two forms:
- **Option A**: Raw Figma API JSON response (inline or file path)
- **Option B**: fileId and nodeId (will fetch fresh data)

## 2. Parse and Analyze

Extract these key sections from the response:

```typescript
interface FigmaAnalysis {
  metadata: {
    fileId: string;
    nodeId: string;
    fetchedAt: string;
    sourceUrl: string;
    version: string;
  };
  designSystem: {
    colors: Record<string, ColorToken>;
    typography: Record<string, TypographyToken>;
    effects: Record<string, EffectToken>;
  };
  components: ComponentData[];
  componentSets: ComponentSetData[];
  
  // NEW: Complete UI Structure - captures layout, text, and hierarchy
  uiStructure: {
    frames: FrameData[];           // All FRAME and GROUP nodes (containers)
    textElements: TextData[];      // All TEXT nodes (labels, descriptions)
    instances: InstanceData[];       // All INSTANCE nodes (component usage)
    vectors: VectorData[];          // All VECTOR nodes (icons, shapes)
    hierarchy: NodeHierarchy;      // Parent-child relationships
  };
  
  summary: {
    totalComponents: number;
    totalStyles: number;
    totalComponentSets: number;
    // NEW:
    totalFrames: number;
    totalTextElements: number;
    totalInstances: number;
    totalVectors: number;
  };
}
```

## 3. Process Components

For each component in `nodes[nodeId].components`:
- Extract: id, name, type (infer from name), category, description
- Parse name to determine category (e.g., "Arrows/Chevron-Up" → category: "Arrows")
- Note: type can be "ICON", "BUTTON", "INPUT", "CARD", etc. (infer from context)

## 3.5 Process UI Structure (CRITICAL - Don't Skip!)

This step extracts the complete visual hierarchy including frames, text, and layout.
**Many designs have UI elements that are NOT components** (headers, buttons with text, descriptions, etc.)

**Traverse the node tree recursively:**

```typescript
function traverseNode(node, parentId = null, depth = 0) {
  // Skip if already processed as a component
  if (processedComponents.has(node.id)) return;
  
  const baseData = {
    id: node.id,
    name: node.name,
    type: node.type,
    parentId,
    depth,
    position: { x: node.absoluteBoundingBox?.x || 0, y: node.absoluteBoundingBox?.y || 0 },
    size: { 
      width: node.absoluteBoundingBox?.width || 0, 
      height: node.absoluteBoundingBox?.height || 0 
    },
    visible: node.visible !== false,
    opacity: node.opacity || 1,
  };

  switch (node.type) {
    case 'FRAME':
    case 'GROUP':
      const frameData = {
        ...baseData,
        layoutMode: node.layoutMode || 'NONE', // 'HORIZONTAL', 'VERTICAL', 'NONE'
        layoutAlign: node.layoutAlign,
        layoutGrow: node.layoutGrow,
        primaryAxisAlign: node.primaryAxisAlignItems,
        counterAxisAlign: node.counterAxisAlignItems,
        padding: {
          top: node.paddingTop || 0,
          right: node.paddingRight || 0,
          bottom: node.paddingBottom || 0,
          left: node.paddingLeft || 0,
        },
        itemSpacing: node.itemSpacing || 0,
        children: [],
        styles: node.styles || {},
        fills: node.fills || [],
        effects: node.effects || [],
      };
      
      // Process children
      if (node.children) {
        node.children.forEach(child => {
          const childData = traverseNode(child, node.id, depth + 1);
          if (childData) frameData.children.push(childData.id);
        });
      }
      
      frames.push(frameData);
      return baseData;
      
    case 'TEXT':
      // CRITICAL: Extract ALL visible TEXT nodes regardless of depth or content.
      // Never skip a TEXT node because its content looks like a placeholder or annotation.
      // Every visible TEXT node is a candidate for a rendered element.
      // Filtering is the planner's responsibility, not the analyzer's.
      if (node.visible === false) break; // only skip explicitly hidden nodes
      const textData = {
        ...baseData,
        characters: node.characters || '',
        font: {
          family: node.style?.fontFamily || 'Unknown',
          size: node.style?.fontSize || 12,
          weight: node.style?.fontWeight || 400,
          style: node.style?.italic ? 'italic' : 'normal',
        },
        textAlign: node.style?.textAlignHorizontal || 'LEFT',
        textCase: node.style?.textCase || 'ORIGINAL',
        fills: node.fills || [],
      };
      textElements.push(textData);
      return baseData;
      
    case 'INSTANCE':
      const instanceData = {
        ...baseData,
        componentId: node.componentId,
        componentName: node.name,
        componentType: node.componentType,
        variantProperties: node.variantProperties || {},
        overrides: node.overrides || [],
      };
      instances.push(instanceData);
      return baseData;
      
    case 'VECTOR':
    case 'ELLIPSE':
    case 'RECTANGLE':
    case 'STAR':
    case 'LINE':
      const vectorData = {
        ...baseData,
        shapeType: node.type,
        fills: node.fills || [],
        strokes: node.strokes || [],
        strokeWeight: node.strokeWeight || 0,
        effects: node.effects || [],
        isMask: node.isMask || false,
      };
      vectors.push(vectorData);
      return baseData;
      
    default:
      // Unknown type - still track it
      return baseData;
  }
}

// Start traversal from root node
const rootNode = data.nodes?.[nodeId]?.document;
if (rootNode) {
  traverseNode(rootNode);
}

// Build hierarchy map
const hierarchy = {
  root: nodeId,
  parentMap: {}, // childId -> parentId
  childrenMap: {}, // parentId -> [childIds]
};

// Populate hierarchy maps
[...frames, ...textElements, ...instances, ...vectors].forEach(node => {
  if (node.parentId) {
    hierarchy.parentMap[node.id] = node.parentId;
    if (!hierarchy.childrenMap[node.parentId]) {
      hierarchy.childrenMap[node.parentId] = [];
    }
    hierarchy.childrenMap[node.parentId].push(node.id);
  }
});
```

**What this captures that components don't:**
- Header containers with title/subtitle text
- Button groups with icons + labels
- Description paragraphs
- Layout structure (FlexRow, FlexCol, spacing)
- Visual hierarchy (which elements contain which)

## 4. Process Styles

For each style in `nodes[nodeId].styles`:
- Categorize by `styleType`: "FILL" (colors), "TEXT" (typography), "EFFECT" (shadows)
- Extract styleId, name, and type
- Note: Actual style values require additional API calls (document for future enhancement)

## 5. Process Hierarchy (Now part of Step 3.5)

The hierarchy is automatically built during the tree traversal in Step 3.5.
No additional action needed here.

## 6. Generate Output

Create JSON file with this structure:

```json
{
  "metadata": {
    "fileId": "...",
    "nodeId": "...",
    "fetchedAt": "ISO-8601 timestamp",
    "sourceUrl": "Figma URL",
    "version": "1.0.0"
  },
  "designSystem": {
    "colors": {
      "token-name": {
        "value": "#HEX",
        "styleId": "...",
        "type": "FILL"
      }
    },
    "typography": {
      "heading/h4/medium": {
        "fontSize": 24,
        "fontWeight": 500,
        "styleId": "..."
      }
    },
    "effects": {}
  },
  "components": [
    {
      "id": "...",
      "name": "Category/ComponentName",
      "type": "ICON|COMPONENT|VARIANT",
      "category": "Category",
      "description": "..."
    }
  ],
  "componentSets": [],
  
  "uiStructure": {
    "frames": [
      {
        "id": "2161:12060",
        "name": "TITLE",
        "type": "FRAME",
        "layoutMode": "VERTICAL",
        "position": { "x": 0, "y": 0 },
        "size": { "width": 375, "height": 80 },
        "padding": { "top": 16, "right": 16, "bottom": 16, "left": 16 },
        "itemSpacing": 8,
        "children": ["2161:12061", "2161:12062", "2011:4509"],
        "visible": true
      }
    ],
    "textElements": [
      {
        "id": "2161:12063",
        "name": "Prime Vibe Match. Powered by AI.",
        "type": "TEXT",
        "characters": "Prime Vibe Match. Powered by AI.",
        "font": {
          "family": "Rubik",
          "size": 15,
          "weight": 500
        },
        "textAlign": "LEFT",
        "parentId": "2161:12062",
        "position": { "x": 0, "y": 0 }
      }
    ],
    "instances": [
      {
        "id": "2011:4509",
        "name": "Chevron",
        "type": "INSTANCE",
        "componentId": "...",
        "componentName": "Arrows/Chevron-Up",
        "parentId": "2161:12060"
      }
    ],
    "vectors": [
      {
        "id": "...",
        "name": "Icon",
        "type": "VECTOR",
        "shapeType": "VECTOR",
        "fills": [...],
        "parentId": "..."
      }
    ],
    "hierarchy": {
      "root": "2158:22764",
      "parentMap": {
        "2161:12060": "2158:22764",
        "2161:12063": "2161:12062"
      },
      "childrenMap": {
        "2158:22764": ["2161:12060", "2395:22407"],
        "2161:12060": ["2161:12061", "2161:12062", "2011:4509"]
      }
    }
  },
  
  "summary": {
    "totalComponents": 6,
    "totalStyles": 12,
    "totalComponentSets": 0,
    "totalFrames": 17,
    "totalTextElements": 8,
    "totalInstances": 6,
    "totalVectors": 17
  }
}
```

## 7. Save to File

Save to: `plans/figma-{timestamp}.json`

Format filename: `figma-{ISO8601-timestamp}.json`
Example: `figma-2026-03-10T10-30-00.json`

## 8. Report Results

Output summary to user:
- File location
- Total components extracted
- Total styles extracted
- **NEW:** Total frames, text elements, and instances found
- Categories found
- Key UI elements detected (headers, buttons, descriptions)
- Next steps suggestion

**Example output:**
```
Análisis completado. Datos guardados en: plans/figma-2026-03-10T10-30-00.json

Resumen:
- 6 componentes (Icons: 6)
- 12 estilos (Colores: 6, Tipografía: 5, Efectos: 1)
- 0 sets de componentes

Estructura UI:
- 17 frames/containers
- 8 elementos de texto
- 6 instancias de componentes
- 17 vectores/iconos

Elementos detectados:
- Header: "Prime Vibe Match. Powered by AI."
- 6 botones de vibes (Play, Relax, Explore, Space, Budget)
- Descripción de feature
- Layout: Card con secciones verticales

Categorías encontradas: Arrows, Places, Sports, Amenities, Deals

Próximo paso: Usa @skills/figma/to-plan para generar plan de implementación.
```

</workflow>

<implementation_guidelines>

## Analyzing Component Names

Parse component names to extract categories:
- Pattern: "Category/Name" → category = "Category"
- Pattern: "Category/Subcategory/Name" → category = "Category/Subcategory"
- No slash → category = "Uncategorized"

Examples:
- "Arrows/Chevron-Up" → category: "Arrows"
- "Places/Themepark" → category: "Places"
- "Sports/Hiking" → category: "Sports"

## Inferring Component Types

Based on name patterns:
- Contains "Arrow", "Chevron", "Icon" → type: "ICON"
- Contains "Button", "CTA" → type: "BUTTON"
- Contains "Input", "Field", "TextField" → type: "INPUT"
- Contains "Card", "Container" → type: "CARD"
- Default → type: "COMPONENT"

## Style Processing

Extract styles by type:
- `styleType: "FILL"` → Add to `designSystem.colors`
- `styleType: "TEXT"` → Add to `designSystem.typography`
- `styleType: "EFFECT"` → Add to `designSystem.effects`

## Error Handling

If analysis fails:
1. Check if input is valid JSON
2. Verify required fields exist (nodes, components, styles)
3. Report specific missing data
4. Suggest fetching fresh data if cache is corrupted

</implementation_guidelines>

## Examples

### Example 1
**Input:** Raw Figma API response for a design system

**What the skill does:**
- Parses the JSON structure
- Extracts 6 components (icons organized by category)
- Extracts 12 styles (5 colors, 5 typography, 1 effect)
- Generates structured JSON with metadata
- Saves to `plans/figma-2026-03-10T10-30-00.json`

**Output:** 
```
Análisis completado. Datos guardados en: plans/figma-2026-03-10T10-30-00.json

Resumen:
- 6 componentes (Icons: 6)
- 12 estilos (Colores: 6, Tipografía: 5, Efectos: 1)
- 0 sets de componentes
- Categorías encontradas: Arrows, Places, Sports, Amenities, Deals

Próximo paso: Usa @skills/figma/pipeline para orquestar el flujo completo.
```

### Example 2
**Input:** API response with component variants

**What the skill does:**
- Identifies componentSets with variants
- Maps variant properties (e.g., "state=default, size=large")
- Groups related components under their parent set
- Documents variant combinations

</skill>

## Integration Notes

This skill is typically called by:
- **pipeline**: As part of the orchestrated workflow
- Manual invocation: When user has raw API data to analyze

Next skill in pipeline:
- **to-react**: Will read the generated JSON to create React components
