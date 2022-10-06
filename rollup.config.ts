import { terser } from "@ducanh2912/rollup-plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";

export default defineConfig({
  input: "src/index.ts",
  output: {
    file: "dist/index.js",
    format: "es",
    banner: "#!/usr/bin/env node",
  },
  plugins: [
    typescript({
      noForceEmit: true,
      noEmitOnError: true,
    }),
    terser(),
  ],
  external: [
    "axios",
    "fs",
    "inquirer",
    "ora",
    "path",
    "pdfkit",
    "radash",
    "sharp",
    "node-html-parser",
    "crypto",
  ],
});
