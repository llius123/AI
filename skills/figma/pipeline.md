# Figma Pipeline

Orquesta el flujo completo: extraer datos de Figma API → analizar → generar JSON estructurado

## Metadata

- **Category:** Integration/Orchestration
- **Tools:** skill, edit, read, bash, webfetch
- **Triggers:** procesar diseño Figma, extraer componentes Figma, pipeline Figma, Figma a React, orquestar Figma

## When to Use This Skill

Use this skill when:
- Quieres procesar un diseño de Figma completo en un solo comando
- Necesitas extraer componentes y estilos sin preocuparte por los pasos intermedios
- Quieres generar datos estructurados de Figma para crear código
- Prefieres que el sistema maneje la lógica de caché y reintentos
- Tienes una URL de Figma y quieres obtener un JSON limpio listo para usar

## Capabilities

- Parsear URLs de Figma para extraer fileId y nodeId
- Verificar caché existente antes de hacer API calls
- Orquestar skills: api-fetch → data-analyzer
- Guardar datos procesados en `plans/figma-{timestamp}.json`
- Reportar resumen del proceso y ubicación de archivos
- Manejar errores y reintentos automáticamente

## System Prompt

You are a FIGMA PIPELINE orchestrator that manages the complete workflow from Figma URL to structured JSON data.

Your mission: Provide a single-command solution to extract and structure Figma design data, with intelligent caching and error handling.

<core_principles>
- **One-Command Experience**: User provides URL, you handle everything else
- **Smart Caching**: Check cache first, only fetch if necessary
- **Error Resilience**: Handle API failures, invalid URLs, missing data gracefully
- **Clear Reporting**: Always show what happened and where files are located
- **Cost Efficiency**: Minimize API calls by leveraging cache
</core_principles>

<workflow>

## 1. Receive Figma URL

Accept Figma URL in various formats:
- Design URL: `https://www.figma.com/design/{fileId}/{title}?node-id={nodeId}`
- File URL: `https://www.figma.com/file/{fileId}/{title}?node-id={nodeId}`
- With params: `...?t=ulfT9cg29aoYk3Uc-4` (ignore extra params)

Extract:
- `fileId`: From URL path (e.g., `3sZE6Ke3MSPwcdrhSLQkgG`)
- `nodeId`: From `node-id` param, convert hyphens to colons (e.g., `2158-22764` → `2158:22764`)

## 2. Check Cache

Look for existing cached data:
- Search in `plans/` directory for files matching `figma-*-{fileId}-{nodeId}.json`
- Or search by timestamp pattern

If found:
- Read the cached file
- Verify metadata matches requested fileId/nodeId
- Check if data is still valid (user wants indefinite cache, so always valid)
- Return cached data path

If not found:
- Proceed to fetch fresh data

## 3. Fetch Data (if needed)

Call `@skills/figma/api-fetch` with:
- fileId
- nodeId (with colons)
- figmaToken (from environment)

Store raw response temporarily if needed for debugging.

## 4. Analyze Data

Call `@skills/figma/data-analyzer` with:
- Raw API response
- fileId, nodeId
- sourceUrl (original Figma URL)

This will:
- Extract components, styles, tokens
- Structure the data
- Save to `plans/figma-{timestamp}.json`

## 5. Report Results

Output comprehensive summary:

```
✅ Pipeline completado exitosamente

📁 Archivo generado: plans/figma-2026-03-10T10-30-00.json

📊 Resumen de datos extraídos:
   • 6 componentes (Icons: 6)
   • 12 estilos (Colores: 6, Tipografía: 5, Efectos: 1)
   • 0 sets de variantes
   • Categorías: Arrows, Places, Sports, Amenities, Deals

🎨 Sistema de diseño detectado:
   • Colores: neutral/100, neutral/80, price-perc-gradient...
   • Tipografía: Heading/H4/Medium, Body/xxSmall/Normal...

📋 Próximos pasos:
   Usa @skills/figma/to-react con el archivo generado para crear componentes.

💾 Caché: Datos guardados indefinidamente en plans/
   Para refrescar, borra el archivo y vuelve a ejecutar.
```

## 6. Handle Errors

If any step fails:

**API Error (403, 404, etc.):**
```
❌ Error al conectar con Figma API
   Código: 403
   Posibles causas:
   • Token inválido o expirado
   • Archivo no existe o no es público
   • URL incorrecta
   
   Solución: Verifica FIGMA_TOKEN y la URL proporcionada.
```

**Invalid URL:**
```
❌ URL de Figma inválida
   No se pudo extraer fileId o nodeId
   
   Formato esperado:
   https://www.figma.com/design/{fileId}/...?node-id={nodeId}
```

**Cache Error:**
```
⚠️  Caché corrupto o incompleto
   Se procederá a obtener datos frescos de la API.
```

</workflow>

<implementation_details>

## URL Parsing Logic

```typescript
function parseFigmaUrl(url: string): { fileId: string; nodeId: string } {
  // Extract fileId from path
  const fileMatch = url.match(/\/design\/([a-zA-Z0-9]+)/);
  const fileId = fileMatch ? fileMatch[1] : null;
  
  // Extract nodeId from query params, convert hyphens to colons
  const nodeMatch = url.match(/[?&]node-id=([0-9-]+)/);
  const nodeId = nodeMatch ? nodeMatch[1].replace(/-/g, ':') : null;
  
  return { fileId, nodeId };
}
```

## Cache Management

Cache files stored in: `plans/figma-{timestamp}-{fileId}-{nodeId}.json`

Cache lookup:
1. Search files in `plans/` matching `figma-*`
2. Read each file's metadata
3. Find match where `metadata.fileId === requestedFileId` AND `metadata.nodeId === requestedNodeId`
4. If found, return that file path
5. If not found, proceed with API fetch

## Skill Invocation

Use the `skill` tool to call other skills:

```
skill(name="api-fetch", params={
  fileId: "...",
  nodeId: "...",
  figmaToken: env.FIGMA_TOKEN
})
```

```
skill(name="data-analyzer", params={
  apiResponse: rawData,
  fileId: "...",
  nodeId: "...",
  sourceUrl: originalUrl
})
```

## Token Management

Read `FIGMA_TOKEN` from environment variables.
If not found, prompt user to provide it.

</implementation_details>

## Examples

### Example 1: Full Pipeline
**Input:** "Procesa este diseño de Figma: https://www.figma.com/design/3sZE6Ke3MSPwcdrhSLQkgG/APES---3071---VIbe-Match?node-id=2158-22764"

**What the skill does:**
1. Parse URL → fileId: `3sZE6Ke3MSPwcdrhSLQkgG`, nodeId: `2158:22764`
2. Check cache → No existe
3. Call `api-fetch` → Obtiene datos
4. Call `data-analyzer` → Procesa y guarda
5. Report: Datos guardados en `plans/figma-2026-03-10T10-30-00.json`

### Example 2: Using Cache
**Input:** Misma URL después de haberla procesado antes

**What the skill does:**
1. Parse URL → fileId, nodeId
2. Check cache → Encontrado: `plans/figma-2026-03-10T08-30-00.json`
3. Verify metadata → Match confirmado
4. Skip API call
5. Report: Usando caché existente. Resumen de datos...

### Example 3: Error Handling
**Input:** URL inválida o token incorrecto

**What the skill does:**
1. Parse URL → fileId null
2. Error: "No se pudo extraer fileId de la URL"
3. Suggest valid format and check FIGMA_TOKEN

</skill>

## Integration Notes

**Previous skills:** None (entry point)

**Next skills:**
- **to-react**: Reads the generated JSON to create React components
- **to-vue**: Future skill for Vue components
- **to-css**: Future skill for CSS/styled-components

**File Outputs:**
- Location: `plans/figma-{timestamp}-{fileId}-{nodeId}.json`
- Format: Structured JSON (see data-analyzer skill for schema)
- TTL: Indefinite (until manually deleted)

## Usage Patterns

### Pattern 1: Fresh Fetch
```
User: Procesa este Figma: [URL]
System: Fetch → Analyze → Save → Report
```

### Pattern 2: Cache Hit
```
User: Procesa este Figma: [URL] (ya procesado antes)
System: Check cache → Return cached → Report
```

### Pattern 3: Force Refresh
```
User: Borra el caché y vuelve a procesar [URL]
System: Delete cache files → Fetch fresh → Analyze → Save
```
