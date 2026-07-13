import tseslint from "typescript-eslint";

const brandStyleRules = {
  "no-restricted-syntax": [
    "error",
    {
      selector: "Literal[value=/^#([0-9a-fA-F]{3}){1,2}$/]",
      message:
        "Hardcoded hex colors are not allowed — use a design token or Tailwind utility class from @workspace/design-tokens instead.",
    },
    {
      selector: "Literal[value=/^rgba?\\(/]",
      message:
        "Hardcoded rgb()/rgba() colors are not allowed — use a design token or Tailwind utility class from @workspace/design-tokens instead.",
    },
    {
      selector: "JSXAttribute[name.name='style']",
      message:
        "Inline style={{}} is not allowed in app code — use Tailwind utility classes backed by design tokens instead.",
    },
  ],
};

export default tseslint.config({
  files: [
    "artifacts/smaran/src/**/*.{ts,tsx}",
    "artifacts/mockup-sandbox/src/**/*.{ts,tsx}",
  ],
  ignores: [
    "artifacts/smaran/src/components/ui/**",
    "artifacts/mockup-sandbox/src/components/ui/**",
  ],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
  rules: brandStyleRules,
});
