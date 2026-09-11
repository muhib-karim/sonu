import i18next from "eslint-plugin-i18next";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        // Type-aware linting. Required by `no-floating-promises`, which needs
        // the checker to know whether an expression is a `Promise`. The
        // `projectService` variant resolves the right tsconfig per file (src vs
        // vite config) without hardcoding paths.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      i18next,
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      // Catch text in JSX that should be translated
      "i18next/no-literal-string": [
        "error",
        {
          markupOnly: true, // Only check JSX content, not all strings
          ignoreAttribute: [
            "className",
            "style",
            "type",
            "id",
            "name",
            "key",
            "data-*",
            "aria-*",
          ], // Ignore common non-translatable attributes
        },
      ],

      // Raw `invoke()` bypasses the typed command surface in `@/bindings`.
      //
      // It is also a correctness trap: `invoke` *rejects* on a backend error,
      // while the generated `commands.*` wrappers *resolve* `{ status: "error" }`.
      // Mixing the two means error handling that works in one place silently
      // does nothing in the other. Always use `commands.*`, and unwrap the
      // result with `unwrapResult` from `@/lib/utils/result`.
      //
      // `convertFileSrc` and the other helpers from the same module are fine —
      // only `invoke` is restricted.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@tauri-apps/api/core",
              importNames: ["invoke"],
              message:
                "Use the typed `commands.*` from @/bindings instead of raw invoke(), and unwrap the result with `unwrapResult` from @/lib/utils/result.",
            },
          ],
        },
      ],

      // An un-awaited promise loses its rejection. In this codebase that is
      // especially costly: settings writes and IPC calls both fail by
      // *resolving* an error result, and if nobody awaits them the failure is
      // discarded and the UI reports success. `void` is accepted as an explicit
      // opt-out where fire-and-forget is genuinely intended.
      "@typescript-eslint/no-floating-promises": [
        "error",
        { ignoreVoid: true, ignoreIIFE: false },
      ],
      // Returning a promise where a callback expects one is the same class of
      // bug (e.g. an async `onClick` handler that is never awaited).
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },

  // The generated bindings are the one place allowed to call `invoke` directly.
  {
    files: ["src/bindings.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];
