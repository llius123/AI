---
name: figma-api-fetch
description: "Fetches raw data from Figma API for a given file and node. Use when you need to get fresh data from Figma API."
---

## Task Tool Interface

This skill is designed to be called via the Task tool. It accepts input parameters and returns a structured JSON response.

### Input Parameters (via Task prompt)
```yaml
fileId: string      # Figma file ID (e.g., "3sZE6Ke3MSPwcdrhSLQkgG")
nodeId: string      # Node ID (e.g., "2158:22764")
figmaToken: string  # Figma authentication token
```

### Output Format (JSON)
```json
{
  "success": true|false,
  "backupPath": "plans/figma-raw-{timestamp}-{fileId}-{nodeId}.json",
  "metadata": {
    "fileId": "...",
    "nodeId": "...",
    "fetchedAt": "ISO-8601-timestamp",
    "apiUrl": "https://api.figma.com/v1/files/..."
  },
  "error": "error message (only if success=false)"
}
```

### Behavior
1. Validate input parameters
2. Make HTTP request to Figma API
3. Save raw response to `plans/figma-raw-{timestamp}-{fileId}-{nodeId}.json`
4. Return only the JSON output above (DO NOT return the full data object)

---

# Figma API Fetch

How to fetch from Figma API

## How to Call Figma API

### Basic Fetch Pattern

```typescript
const apiUrl = `https://api.figma.com/v1/files/${fileId}/nodes?ids=${nodeId}`;

const response = await fetch(apiUrl, {
  method: "GET",
  headers: {
    "X-Figma-Token": figmaToken,
  },
});

const data = await response.json();

// Components are at: data.nodes[nodeId].components
const components = data.nodes?.[nodeId]?.components || {};
```

### Save Raw Backup (CRITICAL)

Always save the raw Figma API response before any processing:

```typescript
import fs from 'fs';
import path from 'path';

// Generate timestamp for unique filename
const timestamp = new Date().toISOString().replace(/:/g, '-');
const backupFilename = `figma-raw-${fileId}-${nodeId}-${timestamp}.json`;
const backupPath = path.join('plans', backupFilename);

// Ensure plans directory exists
if (!fs.existsSync('plans')) {
  fs.mkdirSync('plans', { recursive: true });
}

// Save raw response
fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

console.log(`Raw backup saved to: ${backupPath}`);
```

**Why this matters:**
- If analysis fails, you can retry without re-fetching from API
- Figma API has rate limits; backups prevent unnecessary requests
- Debugging is easier with the original data preserved
- Other skills can access the raw data if needed

**Return both data and backup path:**
```typescript
return {
  data,
  backupPath,
  metadata: {
    fileId,
    nodeId,
    fetchedAt: timestamp,
    apiUrl
  }
};
```

### Key Points

- **URL Format**: `https://api.figma.com/v1/files/{fileId}/nodes?ids={nodeId}`
- **Auth Header**: `X-Figma-Token: {token}`
- **Node ID Format**: Convert hyphens to colons (e.g., `2158-22764` → `2158:22764`)
- **Token**: Use `FIGMA_TOKEN` from environment variables

## Task Tool Output (CRITICAL)

When called via Task tool, you MUST return ONLY this JSON structure:

```json
{
  "success": true,
  "backupPath": "plans/figma-raw-2026-03-17T10-30-00-abc123-2158-22764.json",
  "metadata": {
    "fileId": "abc123",
    "nodeId": "2158:22764",
    "fetchedAt": "2026-03-17T10:30:00.000Z",
    "apiUrl": "https://api.figma.com/v1/files/abc123/nodes?ids=2158:22764"
  }
}
```

**DO NOT:**
- Return the full `data` object from the API (it can be 1-10 MB)
- Include any text before or after the JSON
- Return partial data or incomplete paths

**If error occurs:**
```json
{
  "success": false,
  "error": "Detailed error message describing what went wrong"
}
```
