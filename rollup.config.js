// @ts-check
import nodeResolve from "@rollup/plugin-node-resolve";
import swc from "@rollup/plugin-swc";
import { defineConfig } from "rollup";

import { swcConfig } from "./.swcrc.js";
import packageJson from "./package.json" assert { type: "json" };

const isDev = process.env.NODE_ENV !== "production";

const forcedExternals = [...Object.keys(packageJson.dependencies)];

export default defineConfig({
  input: "src/index.ts",
  output: {
    file: "dist/index.js",
    format: "es",
    banner: "#!/usr/bin/env node",
  },
  plugins: [
    nodeResolve({
      exportConditions: ["node"],
      preferBuiltins: true,
      extensions: [".js", ".ts"],
    }),
    swc({
      swc: {
        ...swcConfig,
        minify: !isDev,
      },
    }),
  ],
  external: forcedExternals,
});
