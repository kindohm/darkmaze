import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ClassDeclaration",
          message: "Classes not allowed. Use functions and arrow functions.",
        },
        {
          selector: "ClassExpression",
          message: "Classes not allowed. Use functions and arrow functions.",
        },
        {
          selector: "FunctionDeclaration",
          message:
            "Use arrow functions instead of function declarations.",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: ["**/dist/**", "**/node_modules/**"],
  }
);
