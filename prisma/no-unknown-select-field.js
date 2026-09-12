import path from "node:path";
import { parsePrismaSchema } from "./schema.js";

// Roots that a Prisma delegate call hangs off of in this repo: `prisma`, the
// transaction client `tx`, and the occasional `db` alias.
const PRISMA_ROOTS = new Set(["prisma", "tx", "db"]);

// Methods whose first argument accepts `select` / `include`.
const QUERY_METHODS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "create",
  "createManyAndReturn",
  "update",
  "updateManyAndReturn",
  "upsert",
  "delete"
]);

// Parse each schema dir once per process and memoize.
const schemaCache = new Map();
function getModels(schemaDir) {
  let models = schemaCache.get(schemaDir);
  if (!models) {
    models = parsePrismaSchema(schemaDir);
    schemaCache.set(schemaDir, models);
  }
  return models;
}

/** Resolve the model name from a delegate accessor like `prisma.estimate`. */
function modelNameFor(property) {
  if (property.type !== "Identifier") return null;
  return property.name.charAt(0).toUpperCase() + property.name.slice(1);
}

function getStaticKey(prop) {
  if (prop.type !== "Property" || prop.computed) return null;
  if (prop.key.type === "Identifier") return prop.key.name;
  if (prop.key.type === "Literal" && typeof prop.key.value === "string") return prop.key.value;
  return null;
}

/** Find a named property (`select`/`include`) whose value is an object literal. */
function findObjectProp(objectExpr, name) {
  for (const prop of objectExpr.properties) {
    if (getStaticKey(prop) === name && prop.value.type === "ObjectExpression") {
      return prop.value;
    }
  }
  return null;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `select`/`include` keys that are not fields on the Prisma model"
    },
    schema: [
      {
        type: "object",
        properties: {
          schemaDir: { type: "string" }
        },
        required: ["schemaDir"],
        additionalProperties: false
      }
    ],
    messages: {
      unknownField:
        "'{{field}}' is not a field on Prisma model '{{model}}'. Check your Prisma schema."
    }
  },

  create(context) {
    const options = context.options?.[0];
    if (!options?.schemaDir) return {};

    // Resolve schemaDir relative to the linted file's nearest backend root by
    // walking up from the file until the configured dir exists.
    const filename = context.filename ?? context.getFilename?.();
    const models = resolveModels(filename, options.schemaDir);
    if (!models) return {};

    function validateSelection(objectExpr, modelName) {
      const model = models[modelName];
      if (!model) return; // Unknown model — don't guess.

      for (const prop of objectExpr.properties) {
        const key = getStaticKey(prop);
        if (key === null) continue; // spread or computed — skip
        if (key === "_count") continue; // Prisma virtual aggregate field

        const field = model[key];
        if (!field) {
          context.report({
            node: prop.key,
            messageId: "unknownField",
            data: { field: key, model: modelName }
          });
          continue;
        }

        // Recurse into nested select/include on a relation field.
        if (field.relation && prop.value.type === "ObjectExpression") {
          const nestedSelect = findObjectProp(prop.value, "select");
          const nestedInclude = findObjectProp(prop.value, "include");
          if (nestedSelect) validateSelection(nestedSelect, field.relation);
          if (nestedInclude) validateSelection(nestedInclude, field.relation);
        }
      }
    }

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed) return;

        const method = callee.property.type === "Identifier" ? callee.property.name : null;
        if (!method || !QUERY_METHODS.has(method)) return;

        // The object the method is called on must be `<root>.<model>`.
        const delegate = callee.object;
        if (delegate.type !== "MemberExpression" || delegate.computed) return;

        const root = delegate.object;
        const rootName =
          root.type === "Identifier" ? root.name : root.type === "ThisExpression" ? "this" : null;
        if (!rootName || !PRISMA_ROOTS.has(rootName)) return;

        const modelName = modelNameFor(delegate.property);
        if (!modelName || !models[modelName]) return;

        const arg = node.arguments[0];
        if (!arg || arg.type !== "ObjectExpression") return;

        const select = findObjectProp(arg, "select");
        const include = findObjectProp(arg, "include");
        if (select) validateSelection(select, modelName);
        if (include) validateSelection(include, modelName);
      }
    };
  }
};

/**
 * `schemaDir` in config is relative to a backend workspace root. A single
 * oxlint run lints multiple workspaces, so resolve it by walking up from the
 * linted file to the first ancestor that contains the dir.
 */
function resolveModels(filename, schemaDir) {
  if (!filename) return null;
  let dir = path.dirname(filename);
  for (let i = 0; i < 30; i++) {
    const candidate = path.join(dir, schemaDir);
    try {
      const models = getModels(candidate);
      if (Object.keys(models).length > 0) return models;
    }
    catch {
      // dir doesn't exist here — keep walking up
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
