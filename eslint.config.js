import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        test: "readonly",
        xit: "readonly",
        xdescribe: "readonly",
        fit: "readonly",
        fdescribe: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
      "template-curly-spacing": ["error", "never"],
      "arrow-spacing": "error",
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
      indent: ["error", 2],
      "no-trailing-spaces": "error",
      "eol-last": "error",
    },
  },
  {
    files: ["**/*.test.js", "**/__tests__/**/*.js"],
    rules: {
      "no-console": "off",
      "no-import-assign": "off",
    },
  },
];
