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

### Key Points

- **URL Format**: `https://api.figma.com/v1/files/{fileId}/nodes?ids={nodeId}`
- **Auth Header**: `X-Figma-Token: {token}`
- **Node ID Format**: Convert hyphens to colons (e.g., `2158-22764` → `2158:22764`)
- **Token**: Use `FIGMA_TOKEN` from environment variables
