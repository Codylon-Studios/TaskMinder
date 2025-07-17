// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "frontend/dist/",
      "frontend/src/vendor/",
      "backend/dist/",
      "venv/",
      "node_modules/",
      "dist/",
      "build/",
      "coverage/",
      "docs/",
      ".github/",
      "db_backups/",
      "docker_secrets/"
    ]
  },

  eslint.configs.recommended,
  tseslint.configs.recommended,

  {
    languageOptions: {
      globals: {
        ...globals.node
      }
    },

    rules: {
      "semi": ["error", "always"],
      "indent": ["error", 2],
      "brace-style": ["error", "stroustrup"],
      "comma-dangle": ["error", "never"],
      "arrow-parens": ["error", "as-needed"],
      "quotes": ["error", "double", { avoidEscape: true }],
      "max-len": ["error", { "code": 150 }],
      "comma-spacing": ["error", { "before": false, "after": true }],
      "eqeqeq": ["error", "always"],
      "@typescript-eslint/explicit-function-return-type": ["error", { "allowExpressions": true }],
      "complexity": ["error", 10],
      "max-depth": ["error", 4],
      "no-warning-comments": [
        "warn",
        {
          "terms": ["TODO", "FIXME"],
          "location": "anywhere"
        }
      ]
    }
  },

  {
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off"
    }
  }
);
