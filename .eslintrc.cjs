module.exports = {
  parser: "@typescript-eslint/parser",
  env: {
    browser: true,
    node: true,
  },
  extends: ["eslint:recommended", "plugin:prettier/recommended", "prettier"],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["tsconfig.json", "tsconfig.eslint.json"],
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "simple-import-sort"],
  rules: {
    "@typescript-eslint/ban-ts-comment": "error",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
    "no-extra-boolean-cast": "off",
    "simple-import-sort/imports": "warn",
    "simple-import-sort/exports": "warn",
  },
};
