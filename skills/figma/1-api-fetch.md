# Figma API Fetch

Cómo hacer fetch a la API de Figma

## Metadata

- **Category:** Integration/API
- **Tools:** webfetch, websearch

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
