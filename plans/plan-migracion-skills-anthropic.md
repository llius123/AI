# Plan: Migración de Skills a Estándar Anthropic

Migración completa del sistema de skills actual al estándar de Anthropic Skills con cumplimiento de todas las mejores prácticas documentadas.

---

## Steps

### Phase 0: Preparación Técnica del Sistema (CRÍTICO)

**Antes de tocar cualquier skill, debemos preparar el sistema para el nuevo formato.**

**Step 0.1: Actualizar `index.ts` para soportar SKILL.md estándar**

El archivo `index.ts` actual tiene lógica específica para `westkill.md` en el root. Necesita actualizarse:

**Cambios en `index.ts`:**

```typescript
// Línea 64: Cambiar de:
if (entry === 'westkill.md') {

// A:
if (entry === 'constraining-responses') {
  const skillFile = join(entryPath, 'SKILL.md');
  if (existsSync(skillFile)) {
    const fileContent = readFileSync(skillFile, 'utf-8');
    const { content } = matter(fileContent);
    westkillContent = content;
    console.error(`🔒 WestKill loaded - will auto-apply to all skills`);
  }
}
```

**Y agregar import:**
```typescript
import { existsSync } from 'fs';
```

**Step 0.2: Estrategia para Westkill**

Westkill es un **caso especial**: es un "base constraint" que se inyecta automáticamente en todas las skills, no una herramienta invocable.

**Implementación:**
- Ubicación: `skills/constraining-responses/CONSTRAINTS.md`
- Sin frontmatter (no es un skill registrable)
- Solo contenido raw que se inyecta automáticamente
- `index.ts` se modifica para buscar este archivo específicamente

**Verify:** 
- `index.ts` compila sin errores (`npm run build` o `tsc`)
- El servidor MCP arranca correctamente
- Westkill constraints siguen aplicándose automáticamente

---

### Phase 1: Restructuración de Archivos (CRÍTICO)

**Step 1: Crear nueva estructura de carpetas**
- Renombrar `skills/plan/plan.md` → `skills/planning/SKILL.md`
- Renombrar `skills/write/write.md` → `skills/implementing-code/SKILL.md`
- Mover `skills/westkill.md` → `skills/constraining-responses/CONSTRAINTS.md` (no SKILL.md - ver Phase 0)
- Renombrar `skills/write-a-skill/write-a-skill.md` → `skills/creating-skills/SKILL.md`
- Renombrar `skills/figma/orchestrator.md` → `skills/processing-figma/SKILL.md`
- Mover sub-skills de figma a estructura plana o eliminar del sistema principal

**Verify**: `ls -la skills/*/` muestra cada skill en su carpeta con archivo SKILL.md

---

### Phase 2: Simplificación de Frontmatter (CRÍTICO)

**Step 2: Estandarizar frontmatter en todos los skills**

Para cada SKILL.md, mantener SOLO estos dos campos:
```yaml
---
name: {nombre-en-formato-gerundio}
description: "{qué hace}. Use when {cuándo usarlo}. Triggers: {palabras clave}."
---
```

**Caso Especial - Westkill/Constraints:**
`skills/constraining-responses/CONSTRAINTS.md` **NO lleva frontmatter** porque no es un skill registrable, es configuración del sistema que se inyecta automáticamente.

Eliminar campos no estándar:
- ❌ `category`
- ❌ `triggers`
- ❌ `tools`
- ❌ `parameters`
- ❌ `internal`

**Verify**: `grep -l "category:\|triggers:\|tools:\|parameters:\|internal:" skills/*/SKILL.md` debe retornar vacío

---

### Phase 3: Reescritura de Descripciones (CRÍTICO)

**Step 3: Reescribir descripciones según patrón Anthropic**

**Estructura requerida:**
```
{Qué hace el skill en 3-5 palabras}. Use when {escenarios específicos}. Triggers: {lista de palabras clave separadas por comas}.
```

**Cambios específicos:**

| Skill Actual | Nuevo Nombre | Nueva Descripción Anthropic |
|--------------|--------------|----------------------------|
| `plan` | `planning` | "Researches and creates detailed multi-step plans through clarification. Use when the user needs planning, strategy, a roadmap, or wants to understand how to approach a complex or unclear task before writing any code. Triggers: plan, outline, research, strategy, roadmap, how to." |
| `write` | `implementing-code` | "Autonomously implements features, fixes bugs, and refactors code with senior engineer standards. Use when the user asks to implement, build, create, fix, debug, or refactor — especially for multi-file changes that require scanning the codebase. Triggers: implement, build, create, execute, develop, code, fix, debug, refactor." |
| `write-a-skill` | `creating-skills` | "Creates new agent skills with correct structure, metadata, and routing-optimized descriptions. Use when the user wants to create, write, or build a new skill to extend agent capabilities. Triggers: create skill, write skill, new skill, build skill, skill development, make skill." |
| `figma` | `processing-figma` | "Runs complete Figma workflow in one command: fetch from Figma API, analyze, and save structured JSON. Use when the user provides a Figma URL and wants to process or extract design data without caring about individual steps. Triggers: Figma URL, process Figma, extract Figma, Figma to React, Figma components." |

**Nota sobre Westkill:** No incluir descripción Anthropic - Westkill se convierte en `CONSTRAINTS.md` sin frontmatter de skill (ver Phase 0).

**Verify**: Cada descripción está en tercera persona, incluye "Use when", y tiene < 1024 caracteres

---

### Phase 4: División de Skills Largos

**Step 4: Aplicar Progressive Disclosure**

**Skills que exceden 500 líneas y deben dividirse:**

**A. `figma/common/2-data-analyzer.md` (600 líneas)**
```
skills/analyzing-figma-data/
├── SKILL.md (overview: 80 líneas)
├── UI_STRUCTURE.md (sección 3.5 - tree traversal)
├── MAPPING_HEURISTICS.md (tablas de mapeo)
└── examples.md (casos de uso)
```

**B. `figma/edit/4-to-edit.md` (451 líneas)**
```
skills/comparing-figma-to-code/
├── SKILL.md (overview: 90 líneas)
├── VALUE_NORMALIZATION.md (tablas de conversión)
├── COMPONENT_RESOLUTION.md (estrategias de búsqueda)
└── examples.md
```

**C. `figma/create/3-to-plan.md` (444 líneas)**
```
skills/generating-plans-from-figma/
├── SKILL.md (overview: 85 líneas)
├── PRISMA_MAPPING.md (tablas de mapeo a Prisma)
├── HEURISTICS.md (detección de patrones)
└── examples.md
```

**Verify**: Ningún SKILL.md excede 500 líneas después del split

---

### Phase 5: Eliminación de Referencias Anidadas

**Step 5: Aplanar estructura de referencias**

**Problema actual:**
```
SKILL.md (figma/orchestrator.md)
  └── references: common/1-api-fetch.md
        └── could reference: more files...
```

**Solución:**
Todas las referencias deben estar en SKILL.md directamente:

```markdown
## Reference Files
- **API Fetching**: See [API_FETCH.md](API_FETCH.md) for HTTP patterns
- **Data Analysis**: See [DATA_ANALYSIS.md](DATA_ANALYSIS.md) for processing
- **UI Structure**: See [UI_STRUCTURE.md](UI_STRUCTURE.md) for tree traversal
- **Error Handling**: See [ERRORS.md](ERRORS.md) for troubleshooting
```

**Verify**: `grep -r "See \[" skills/*/ | grep -v "SKILL.md" | wc -l` debe ser 0

---

### Phase 6: Renombrado al Formato Gerundio

**Step 6: Aplicar naming convention Anthropic**

| Nombre Actual | Nombre Anthropic | Rationale |
|---------------|------------------|-----------|
| `plan` | `planning` | Gerundio de "plan" |
| `write` | `implementing-code` | Más descriptivo que "writing" |
| `westkill` | `constraining-responses` | Describe la función, no el nombre |
| `write-a-skill` | `creating-skills` | Acción + objeto |
| `figma_pipeline` | `processing-figma` | Qué hace + con qué |
| `figma_data_analyzer` | `analyzing-figma-data` | Gerundio completo |
| `figma_to_plan` | `generating-plans-from-figma` | Flujo completo descrito |
| `figma_to_edit` | `comparing-figma-to-code` | Acción específica |

**Verify**: `ls skills/` muestra solo nombres en formato gerundio con guiones

---

### Phase 7: Eliminación de Campos No Estándar del Contenido

**Step 7: Mover metadatos extras al cuerpo del documento**

**Formato actual (incorrecto):**
```yaml
---
name: plan
category: Planning
triggers: [plan, outline]
tools: [agent, search]
---
```

**Formato correcto:**
```yaml
---
name: planning
description: "..."
---

# Planning

## When to Use
Use this skill when:
- User needs a detailed action plan before starting work
- The task is complex and requires research
...

## Triggers
- plan
- outline
- research
- strategy
- roadmap
- how to

## Required Tools
- agent
- search
- read
- execute
```

**Verify**: Solo `name` y `description` en el frontmatter YAML

---

### Phase 8: Creación de Evaluaciones

**Step 8: Crear evaluaciones para cada skill**

**Estructura de evaluación por skill (3 mínimo):**

**A. Planning Skill:**
```json
{
  "skills": ["planning"],
  "query": "Plan how to add JWT authentication to my API",
  "files": [],
  "expected_behavior": [
    "Asks clarifying questions about user storage and token expiration",
    "Researches existing API structure",
    "Creates plan saved to plans/ directory",
    "Identifies edge cases like token refresh"
  ]
}
```

**B. Implementing Code Skill:**
```json
{
  "skills": ["implementing-code"],
  "query": "Fix the bug in src/components/Button.tsx where clicking doesn't work",
  "files": ["src/components/Button.tsx"],
  "expected_behavior": [
    "Scans the codebase to understand Button implementation",
    "Identifies root cause of the bug",
    "Fixes without TODO comments",
    "Verifies the fix works"
  ]
}
```

**C. Processing Figma Skill:**
```json
{
  "skills": ["processing-figma"],
  "query": "Process this Figma design: https://www.figma.com/design/ABC123/Test?node-id=1-2",
  "files": [],
  "expected_behavior": [
    "Extracts fileId and nodeId from URL",
    "Fetches data from Figma API",
    "Saves raw data to plans/",
    "Generates implementation plan"
  ]
}
```

**Verify**: Carpeta `evaluations/` creada con al menos 3 JSON files por skill

---

### Phase 9: Mejoras de Contenido Adicionales

**Step 9: Aplicar mejores prácticas de contenido**

**Para cada skill, verificar:**

1. **Concisión**: Eliminar explicaciones obvias (Claude ya sabe qué es un PDF, React, etc.)
2. **Terminología consistente**: Usar los mismos términos en todo el documento
3. **Ejemplos concretos**: Input/Output pairs, no descripciones abstractas
4. **Workflows con checklists**: Para tareas complejas, incluir checklist copiable
5. **Feedback loops**: Patrón "run validator → fix errors → repeat"

**Verify**: Revisión manual de cada SKILL.md contra checklist de Anthropic

---

### Phase 10: Actualización del Orchestrator e Index.ts

**Step 10.1: Actualizar `orchestrator.md` para reflejar nuevos nombres**

**Cambios necesarios:**
1. Actualizar rutas: `skills/plan/plan.md` → `skills/planning/SKILL.md`
2. Actualizar nombres en la sección "Available Skills"
3. Actualizar palabras de trigger si cambiaron
4. Verificar que el routing tree usa los nuevos nombres
5. Actualizar referencia a westkill: `skills/westkill.md` → `skills/constraining-responses/CONSTRAINTS.md`

**Verify**: `grep -n "plan/plan\|write/write\|westkill" orchestrator.md` retorna 0 coincidencias

**Step 10.2: Actualizar `index.ts` para nueva estructura de carpetas**

**Cambios necesarios:**
1. Línea 64: Cambiar búsqueda de `westkill.md` a carpeta `constraining-responses/CONSTRAINTS.md`
2. Verificar que el escaneo recursivo de archivos `.md` funciona con la nueva estructura
3. Confirmar que la validación de frontmatter (línea 86) funciona con solo `name` y `description`

**Código actualizado para index.ts:**
```typescript
// Modificar función discoverSkills():
function discoverSkills(): { skills: ParsedSkill[]; westkillContent: string | null } {
  const skills: ParsedSkill[] = [];
  let westkillContent: string | null = null;
  
  // 1. Scan skills directory
  const entries = readdirSync(SKILLS_DIR);
  
  for (const entry of entries) {
    const entryPath = join(SKILLS_DIR, entry);
    const stat = statSync(entryPath);
    
    // Check if this is constraining-responses folder with CONSTRAINTS.md
    if (entry === 'constraining-responses' && stat.isDirectory()) {
      const constraintsPath = join(entryPath, 'CONSTRAINTS.md');
      if (existsSync(constraintsPath)) {
        const fileContent = readFileSync(constraintsPath, 'utf-8');
        westkillContent = fileContent; // No frontmatter parsing, just raw content
        console.error(`🔒 WestKill loaded - will auto-apply to all skills`);
      }
      continue;
    }
    
    if (!stat.isDirectory()) {
      continue; // Skip non-directories (no more westkill.md at root)
    }
    
    // 2. Look for SKILL.md in each subdirectory
    const skillFile = join(entryPath, 'SKILL.md');
    if (!existsSync(skillFile)) {
      console.error(`⚠️  Skipping ${entry}: no SKILL.md found`);
      continue;
    }
    
    const fileContent = readFileSync(skillFile, 'utf-8');
    
    // 3. Parse frontmatter
    const { data: frontmatter, content } = matter(fileContent);
    
    // 4. Validate Anthropic standard: only name and description required
    if (!frontmatter.name || !frontmatter.description) {
      console.error(`⚠️  Skipping ${skillFile}: missing required frontmatter (name, description)`);
      continue;
    }
    
    // Parameters are optional in Anthropic standard, default to empty array
    skills.push({
      name: frontmatter.name,
      description: frontmatter.description,
      parameters: frontmatter.parameters || [],
      content,
      filePath: skillFile,
    });
  }
  
  return { skills, westkillContent };
}
```

**Verify:**
- `index.ts` compila sin errores
- El servidor MCP arranca y registra todas las skills
- Westkill constraints siguen aplicándose automáticamente

---

## Verify

### Checklist Final de Calidad Anthropic

- [ ] Todos los archivos se llaman `SKILL.md` (no `plan.md`, `write.md`, etc.)
- [ ] Estructura de carpetas: `skills/{nombre-gerundio}/SKILL.md`
- [ ] Frontmatter solo tiene `name` y `description`
- [ ] Descripciones en tercera persona con "Use when" + triggers
- [ ] Nombres en formato gerundio con guiones
- [ ] Ningún SKILL.md excede 500 líneas
- [ ] Referencias son de un solo nivel (no anidadas)
- [ ] 3+ evaluaciones creadas por skill
- [ ] Terminología consistente en cada skill
- [ ] Ejemplos concretos con input/output
- [ ] Workflows con checklists para tareas complejas
- [ ] Orchestrator actualizado con nuevas rutas

### Testing Checklist

- [ ] Probar routing con cada trigger word
- [ ] Verificar que skills se activan correctamente
- [ ] Testear con Claude Haiku (más restrictivo)
- [ ] Testear con Claude Sonnet
- [ ] Testear con Claude Opus
- [ ] Validar que las descripciones permiten descubrimiento correcto

---

## Notes

### Riesgos Identificados

1. **Breaking changes**: Los skills actuales dejarán de funcionar durante la migración
2. **Pérdida de metadatos**: Al eliminar category/triggers/tools del frontmatter, necesitamos asegurar que estén en el cuerpo
3. **Referencias rotas**: Sub-skills de figma que referencian entre sí
4. **Orchestrator desactualizado**: Rutas hardcodeadas que apuntan a ubicaciones antiguas
5. **Index.ts breaking change**: El sistema actual espera `westkill.md` en el root y parámetros en frontmatter
6. **Westkill constraints perdidos**: Si la migración de westkill falla, todas las skills perderán los límites de 3-4 líneas
7. **Compilación TypeScript**: Cambios en `index.ts` pueden romper el build si no se importa `existsSync` correctamente

### Mitigación

1. **Migración en branch**: Trabajar en feature branch `feat/anthropic-skills-migration`, merge cuando todo esté listo
2. **Backup**: Guardar copia de skills actuales y `index.ts` antes de empezar (`git checkout -b backup/pre-migration`)
3. **Referencias actualizadas**: Al mover archivos, actualizar TODOS los links (incluyendo orchestrator.md e index.ts)
4. **Testing incremental**: Probar cada skill individualmente antes de continuar
5. **Westkill prioritario**: Migrar westkill PRIMERO y verificar que constraints siguen funcionando antes de tocar otros skills
6. **Validación TypeScript**: Ejecutar `tsc --noEmit` después de modificar `index.ts`
7. **Rollback plan**: Mantener copia de `index.ts` original hasta confirmar que el nuevo funciona

### Tiempo Estimado (Actualizado)

| Phase | Tiempo Estimado | Prioridad | Notas |
|-------|-----------------|-----------|-------|
| 0. Preparación Técnica | 2 horas | **CRÍTICA** | Incluye actualizar index.ts primero |
| 1. Restructuración | 1 hora | CRÍTICA | Westkill primero, luego los demás |
| 2. Frontmatter | 2 horas | CRÍTICA | Validar que index.ts acepta solo name+description |
| 3. Descripciones | 2 horas | CRÍTICA | |
| 4. División de skills | 4 horas | Alta | |
| 5. Referencias | 2 horas | Alta | |
| 6. Renombrado | 30 min | Media | Ya incluido en Phase 1 |
| 7. Metadatos en cuerpo | 2 horas | Media | |
| 8. Evaluaciones | 3 horas | Media | Puede hacerse en paralelo |
| 9. Mejoras de contenido | 4 horas | Baja | |
| 10. Orchestrator + Index.ts | 2 horas | Alta | Verificación final |
| **Total** | **~24.5 horas** | | +3 horas por la complejidad de index.ts |

### Dependencias (Actualizadas)

```
Phase 0 (Preparación) 
    ↓ (bloquea)
Phase 1 (Westkill primero) 
    ↓ (bloquea)
Phase 2-9 (Otros skills en paralelo)
    ↓ (todas deben completarse)
Phase 10 (Orchestrator + Index.ts final)
    ↓
Testing completo
```

**Reglas críticas:**
- **Phase 0 DEBE completarse antes de Phase 1**: Sin index.ts actualizado, nada funcionará
- **Westkill DEBE migrarse PRIMERO en Phase 1**: Si falla, todo el sistema pierde constraints
- **Phase 4 y 5 pueden hacerse en paralelo** entre sí
- **Phase 8 (evaluaciones)** puede hacerse en cualquier momento DESPUÉS de Phase 1
- **Phase 10 debe ser la última**: Requiere que TODOS los archivos estén en ubicación final

### Archivos Críticos a Revisar

| Archivo | Por qué es crítico | Qué revisar |
|---------|-------------------|-------------|
| `index.ts` | Registra todas las skills | Lógica de descubrimiento, validación de frontmatter |
| `orchestrator.md` | Routing principal | Rutas hardcodeadas a skills |
| `skills/westkill.md` | Base constraints | Migración a CONSTRAINTS.md sin frontmatter |
| `skills/figma/orchestrator.md` | Sub-sistema complejo | Referencias internas entre skills de figma |

---

**Status**: Plan updated with technical details for index.ts and westkill
**Next step**: User approval → Start Phase 0 (Preparación Técnica con index.ts)
