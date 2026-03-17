# Plan: Extender Figma Orchestrator con Modo Edición

## Resumen

Añadir parámetro `mode` al orquestador de Figma para soportar dos flujos: creación de componentes nuevos y modificación de componentes existentes basándose en diferencias detectadas en Figma.

**Reorganización de estructura:**
- `common/`: Skills compartidos entre ambos modos
  - `1-api-fetch` - Obtiene datos de Figma API
  - `2-data-analyzer` - Analiza y estructura datos
- `create/`: Skills específicos para modo create
  - `3-to-plan` - Genera plan de implementación completo
- `edit/`: Skills específicos para modo edit
  - `4-to-edit` - Genera plan de modificaciones (usamos 4 para dejar hueco por si necesitamos añadir más skills entre 2 y 4)

**Parámetros adicionales:**
- `mode`: "create" (default) | "edit" - Define el tipo de flujo
- `components` (solo modo edit): Array de rutas o nombres de componentes a modificar

---

## Nueva Estructura de Carpetas

```
skills/figma/
├── orchestrator.md              (actualizado con mode parameter)
├── common/
│   ├── 1-api-fetch.md            (movido desde internal/)
│   └── 2-data-analyzer.md        (movido desde internal/)
├── create/
│   └── 3-to-plan.md              (movido desde internal/)
└── edit/
    └── 4-to-edit.md              (nuevo skill)
```

---

## Arquitectura del Flow

**Numeración consistente:** Los skills están numerados 1-4 de forma única en todo el sistema, no por flow. Esto permite insertar skills intermedios sin renumerar.

```
Usuario proporciona: Figma URL + Token + Mode (+ components si mode=edit)
                           ↓
              /skills/figma/orchestrator.md
                           ↓
              ├─ Mode=create → Flow create
              │              (common/1 → common/2 → create/3)
              └─ Mode=edit → Flow edit
                             (common/1 → common/2 → edit/4)
```

**Fases del Flow:**

| Phase | Skill | Modo Create | Modo Edit |
|-------|-------|-------------|-----------|
| 1 | common/1-api-fetch | ✅ | ✅ |
| 2 | common/2-data-analyzer | ✅ | ✅ |
| 3 | create/3-to-plan | ✅ | ❌ |
| 4 | edit/4-to-edit | ❌ | ✅ |

**Outputs:**
- **Modo create:** Plan de implementación nuevo (markdown)
- **Modo edit:** Plan de modificaciones puntuales (markdown)

---

## Steps de Implementación

### 1. Crear Nuevas Carpetas

```bash
mkdir -p skills/figma/common
mkdir -p skills/figma/create
mkdir -p skills/figma/edit
```

### 2. Mover Skills Existentes

| Skill Actual | Nueva Ubicación | Número |
|--------------|----------------|--------|
| `internal/1-api-fetch.md` | `common/1-api-fetch.md` | 1 |
| `internal/2-data-analyzer.md` | `common/2-data-analyzer.md` | 2 |
| `internal/3-to-plan.md` | `create/3-to-plan.md` | 3 |

**Nota:** Los skills se mueven sin modificaciones. Solo cambia su ubicación física.

### 3. Actualizar Orchestrator con Nuevas Rutas y Parámetros

**Archivo:** `skills/figma/orchestrator.md`

**Añadir parámetros en frontmatter:**
```yaml
parameters:
  - name: figmaUrl
    type: url
    required: true
  - name: figmaToken
    type: string
    required: true
  - name: mode
    type: string
    description: "create | edit - Default: create"
    required: false
  - name: components
    type: array
    items: string
    description: "Rutas o nombres de componentes a modificar (solo modo edit)"
    required: false
```

**Actualizar workflow:**
- Reemplazar rutas `internal/` por `common/`, `create/` o `edit/` según corresponda
- Añadir lógica de enrutamiento basada en `mode`
- Mantener numeración 1-2-3 para create, 1-2-4 para edit

### 4. Crear Skill: edit/4-to-edit

**Archivo:** `skills/figma/edit/4-to-edit.md`

**Propósito:** Comparar datos de Figma con código existente y generar plan de modificaciones.

**Entrada:**
- `analysisPath`: Path al JSON analizado (de common/2-data-analyzer)
- `components`: Array de rutas o nombres de componentes

**Lógica:**
1. Para cada componente en `components`:
   - Si es ruta: leer archivo directamente
   - Si es nombre: buscar en `src/components/{nombre}/index.tsx`
2. Extraer propiedades actuales del código (tamaños, colores, espaciado)
3. Comparar con datos de Figma
4. Generar lista de diferencias
5. Crear plan de modificaciones

**Salida (JSON para Task tool):**
```json
{
  "success": true,
  "editPlanPath": "plans/edit-plan-{timestamp}.md",
  "changesDetected": 3,
  "componentsProcessed": ["Button", "Card"]
}
```

**Contenido del plan generado (archivo markdown):**
El skill genera un archivo markdown con:
- Lista de componentes a modificar
- Cambios detectados con antes/después
- Checklist de implementación

Ejemplo de contenido:
```markdown
# Plan de Modificaciones

## Componentes a Modificar
- Button (src/components/Button/index.tsx)

## Cambios Detectados

### Button - Cambio 1: Font Size
- **Propiedad:** size
- **Actual:** "small"
- **Figma:** "medium" (16px)
- **Acción:** Cambiar de "small" a "medium"

```tsx
// ANTES:
<Body size="small">{label}</Body>

// DESPUÉS:
<Body size="medium">{label}</Body>
```

## Checklist
- [ ] Aplicar cambio de font size
- [ ] Verificar en Storybook
```

**Reglas de comparación:**
- Comparar solo propiedades visuales presentes en ambos (Figma y código)
- Detectar: fontSize, fontWeight, colors, padding, margin, gap, borderRadius
- Ignorar nuevos elementos que solo existen en Figma
- Mantener lógica de negocio existente

### 5. Actualizar Ejemplos en Orchestrator

**Archivo:** `skills/figma/orchestrator.md`

Añadir ejemplo de modo edición:

```markdown
### Example: Modo Edición
**Input:** "Modifica el Button según este Figma: https://..."

**Action:**
1. Parse URL
2. mode=edit, components=["Button"]
3. Phase 1: common/1-api-fetch
4. Phase 2: common/2-data-analyzer
5. Phase 4: edit/4-to-edit → compara + genera plan
6. Report: "✅ Plan de modificaciones generado en {editPlanPath}"
```

### 6. Eliminar Carpeta internal (Post-implementación)

Una vez verificado que todo funciona, eliminar `skills/figma/internal/` vacía.

---

## Archivos a Modificar/Crear

| Acción | Archivo | Detalle |
|--------|---------|---------|
| **Crear carpetas** | `skills/figma/common/` | Skills compartidos |
| **Crear carpetas** | `skills/figma/create/` | Skills de creación |
| **Crear carpetas** | `skills/figma/edit/` | Skills de edición |
| **Mover** | `common/1-api-fetch.md` | Desde `internal/` (sin cambios) |
| **Mover** | `common/2-data-analyzer.md` | Desde `internal/` (sin cambios) |
| **Mover** | `create/3-to-plan.md` | Desde `internal/` (sin cambios) |
| **Crear** | `edit/4-to-edit.md` | Nuevo skill |
| **Modificar** | `orchestrator.md` | Añadir params mode/components, actualizar rutas, añadir tabla de fases |
| **Eliminar** | `internal/` | Después de verificar migración |

---

## Notas de Implementación

1. **Numeración única:** Skills numerados 1-4 globalmente, no por flow
2. **Hueco intencional:** El salto de 2 a 4 en modo edit permite añadir skills intermedios (3, 3.5, etc.) si es necesario
3. **No aplicar cambios automáticamente:** El modo edit solo genera plan markdown para revisión manual
4. **Components flexible:** Puede ser ruta absoluta, relativa, o nombre de componente
5. **Múltiples componentes:** Soportar array para modificar varios a la vez
6. **Backward compatibility:** mode=create es el default
7. **Diff inteligente:** Comparar valores normalizados (ej: mapear "small"→14px)

---

## Verificación Post-implementación

- [ ] **Modo create (1-2-3):** Genera plan completo correctamente
- [ ] **Modo edit (1-2-4):** Detecta cambios y genera plan de modificaciones
- [ ] **Rutas actualizadas:** Orchestrator referencia correctamente common/, create/, edit/
- [ ] **Numeración correcta:** Todos los skills tienen su número único
- [ ] **Carpeta internal:** Vacía y lista para eliminar
