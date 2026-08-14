import fs from "node:fs";
import path from "node:path";

/**
 * Parse a directory of `.prisma` model files into a model -> field map.
 *
 * The map shape is:
 *   { [ModelName]: { [fieldName]: { relation: string | null } } }
 * where `relation` is the target model name for relation fields, or null for
 * scalar / enum fields. This lets the lint rule both verify a key exists and,
 * for nested `select`/`include`, follow a relation to the next model.
 *
 * Parsing is intentionally line-based rather than a full Prisma grammar: the
 * schema files in this repo are plain `model`/`enum` blocks with one field per
 * line (`name Type modifiers`). Block attributes (`@@...`) and field attributes
 * are ignored.
 */
export function parsePrismaSchema(schemaDir) {
  const files = fs.readdirSync(schemaDir).filter(f => f.endsWith(".prisma"));

  // First pass: collect declared model names so we can classify a field's type
  // as a relation (-> model) vs a scalar/enum (-> null).
  const modelNames = new Set();
  const fileContents = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(schemaDir, file), "utf8");
    fileContents.push(content);
    for (const match of content.matchAll(/^\s*model\s+(\w+)\s*\{/gm)) {
      modelNames.add(match[1]);
    }
  }

  const models = {};
  for (const content of fileContents) {
    parseModelsFromContent(content, models, modelNames);
  }

  return models;
}

function parseModelsFromContent(content, models, modelNames) {
  const lines = content.split("\n");
  let currentModel = null;

  for (const rawLine of lines) {
    const line = stripComment(rawLine).trim();
    if (line === "") continue;

    const modelStart = line.match(/^model\s+(\w+)\s*\{/);
    if (modelStart) {
      currentModel = modelStart[1];
      models[currentModel] = {};
      continue;
    }

    // A non-model block declaration (enum/type/view/datasource/generator) opens
    // with a trailing `{`. Require the brace so a *field* named `type`,
    // `view`, etc. (e.g. `type ListItem? @relation(...)`) isn't mistaken for a
    // block start. Only meaningful when not already inside a model.
    if (currentModel === null) {
      continue;
    }
    if (/^(enum|type|view|datasource|generator)\s+\w+\s*\{/.test(line)) {
      currentModel = null;
      continue;
    }

    if (line === "}") {
      currentModel = null;
      continue;
    }

    // Skip block-level and field attributes (@@index, @@unique, @id, ...).
    if (line.startsWith("@")) continue;

    // Field line: `name Type[?|[]] @attr...`
    const fieldMatch = line.match(/^(\w+)\s+(\w+)/);
    if (!fieldMatch) continue;

    const [, fieldName, typeName] = fieldMatch;
    const relation = modelNames.has(typeName) ? typeName : null;
    models[currentModel][fieldName] = { relation };
  }
}

function stripComment(line) {
  // Prisma uses `//` line comments. Schema field lines don't contain string
  // literals with `//`, so cutting at the first `//` is safe here.
  const idx = line.indexOf("//");
  return idx === -1 ? line : line.slice(0, idx);
}
