import path from "path";
import json from "@rollup/plugin-json";
import bundleSize from "rollup-plugin-bundle-size";
import sizes from "rollup-plugin-sizes";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import litcss from "rollup-plugin-lit-css";
import typescript from "@rollup/plugin-typescript";
import { name } from "./package.json";
import { terser } from "rollup-plugin-terser";
import { defineConfig } from "rollup";

export default defineConfig({
  input: "src/main.ts",
  output: {
    file: path.posix.join("dist", name + ".js"),
    format: "es"
  },
  moduleContext: id => {
    const modules = [
      "node_modules/@formatjs/intl-utils/lib/src/resolve-locale.js",
      "node_modules/@formatjs/intl-utils/lib/src/diff.js"
    ];
    if (
      modules.some(id_ =>
        path.normalize(id.trimEnd()).endsWith(path.normalize(id_))
      )
    )
      return "window";
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    typescript({ include: "src/*.ts" }),
    json(),
    litcss({ uglify: true }),
    terser({ format: { comments: false } }),
    bundleSize(),
    sizes({ details: false })
  ]
});
