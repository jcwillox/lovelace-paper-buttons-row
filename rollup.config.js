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
import { execSync } from "child_process";
import replace from "@rollup/plugin-replace";

const quoteCommand = command => {
  return JSON.stringify(execSync(command).toString().trim());
};

const quoteCommandOrEnv = (command, env) => {
  if (process.env[env]) {
    return JSON.stringify(process.env[env]);
  }
  return quoteCommand(command);
};

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
    replace({
      values: {
        __NAME__: JSON.stringify(name.toUpperCase()),
        __BRANCH__: quoteCommand("git rev-parse --abbrev-ref HEAD"),
        __COMMIT__: quoteCommandOrEnv("git rev-parse HEAD", "GITHUB_SHA"),
        __VERSION__: quoteCommand("git describe --tags --dirty --always"),
        __REPO_URL__: quoteCommand("git remote get-url origin").replace(
          ".git",
          ""
        ),
        __BUILD_TIME__: JSON.stringify(new Date().toISOString())
      }
    }),
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
