---
name: figma-data-analyzer
description: "Processes raw Figma API JSON response and extracts structured design data including components, colors, typography, effects, and UI structure. Use when you have raw Figma JSON and need to extract structured data for component generation."
---

## Task Tool Interface

This skill is designed to be called via the Task tool. It reads raw Figma data from a file path and returns structured analysis results.

### Input Parameters (via Task prompt)
```yaml
backupPath: string  # Absolute path to raw JSON file (output from figma-api-fetch)
                      # e.g., "plans/figma-raw-2026-03-17T10-30-00-abc123-2158-22764.json"
```

### Output Format (JSON)
```json
{
  "success": true|false,
  "analysisPath": "plans/figma-2026-03-17T10-30-00-abc123-2158-22764.json",
  "summary": {
    "totalComponents": 12,
    "totalStyles": 8,
    "totalFrames": 15,
    "totalTextElements": 24,
    "categories": ["Arrows", "Places", "Sports"]
  },
  "metadata": {
    "fileId": "abc123",
    "nodeId": "2158:22764",
    "analyzedAt": "2026-03-17T10:30:00.000Z"
  },
  "error": "error message (only if success=false)"
}
```

### Behavior
1. Read raw JSON from backupPath
2. Analyze and extract structured data (components, styles, UI structure)
3. Save structured result to `plans/figma-{timestamp}-{fileId}-{nodeId}.json`
4. Return only the JSON output above (DO NOT include the full analysis data)

---

# Figma Data Analyzer

Processes Figma API response and extracts structured data for component generation

## When to Use This Skill

Use this skill when:
- You need to process the raw Figma API response
- You want to extract components, styles, and design tokens
- You need to structure Figma data for code generation
- The API response contains unstructured information that needs cleaning

## Capabilities

- Analyze Figma API JSON response
- Extract individual components and their properties
- Identify styles (colors, typography, effects)
- Structure design tokens
- Organize data by categories
- Save result in clean JSON format
- Extract complete UI structure (frames, text, hierarchy)

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
  
  // Complete UI Structure - captures layout, text, and hierarchy
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
- Parse name to determine category (e.g. "Arrows/Chevron-Up" → category: "Arrows")
- Note: type can be "ICON", "BUTTON", "INPUT", "CARD", etc. (infer from context)
- **Add component ID to processedComponents Set to avoid re-processing during traversal**
  ```typescript
  processedComponents.add(component.id);
  ```

## 3.5 Process UI Structure (CRITICAL - Don't Skip!)

This step extracts the complete visual hierarchy including frames, text, and layout.
**Many designs have UI elements that are NOT components** (headers, buttons with text, descriptions, etc.)

**Traverse the node tree recursively:**

**IMPORTANT: Initialize the Set before calling traverseNode:**
```typescript
const processedComponents = new Set();
```

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
- Total frames, text elements, and instances found
- Categories found
- Key UI elements detected (headers, buttons, descriptions)
- Next steps suggestion

**Example output:**
```
Analysis completed. Data saved to: plans/figma-2026-03-10T10-30-00.json

Summary:
- 6 components (Icons: 6)
- 12 styles (Colors: 6, Typography: 5, Effects: 1)
- 0 component sets

UI Structure:
- 17 frames/containers
- 8 text elements
- 6 component instances
- 17 vectors/icons

Elements detected:
- Header: "Prime Vibe Match. Powered by AI."
- 6 vibe buttons (Play, Relax, Explore, Space, Budget)
- Feature description
- Layout: Card with vertical sections

Categories found: Arrows, Places, Sports, Amenities, Deals

Next step: Use @figma-to-plan to generate implementation plan.
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
Analysis completed. Data saved to: plans/figma-2026-03-10T10-30-00.json

Summary:
- 6 components (Icons: 6)
- 12 styles (Colors: 6, Typography: 5, Effects: 1)
- 0 component sets
- Categories found: Arrows, Places, Sports, Amenities, Deals

Next step: Use @figma-to-plan to generate implementation plan.
```

### Example 2
**Input:** API response with component variants

**What the skill does:**
- Identifies componentSets with variants
- Maps variant properties (e.g., "state=default, size=large")
- Groups related components under their parent set
- Documents variant combinations

## Integration Notes

This skill is typically called by:
- **processing-figma**: As part of the orchestrated workflow
- Manual invocation: When user has raw API data to analyze

Next skill in pipeline:
- **figma-to-plan**: Will read the generated JSON to create implementation plan

---

## Task Tool Output (CRITICAL)

When called via Task tool, you MUST return ONLY this JSON structure:

```json
{
  "success": true,
  "analysisPath": "plans/figma-2026-03-17T10-30-00-abc123-2158-22764.json",
  "summary": {
    "totalComponents": 12,
    "totalStyles": 8,
    "totalFrames": 15,
    "totalTextElements": 24,
    "categories": ["Arrows", "Places", "Sports", "Amenities"]
  },
  "metadata": {
    "fileId": "abc123",
    "nodeId": "2158:22764",
    "analyzedAt": "2026-03-17T10:30:00.000Z"
  }
}
```

**DO NOT:**
- Return the full analysis JSON (can be 100KB+)
- Include any text before or after the JSON
- Return partial paths or incomplete summaries

**If error occurs:**
```json
{
  "success": false,
  "error": "Detailed error message: file not found, invalid JSON, missing required fields, etc."
}
```
