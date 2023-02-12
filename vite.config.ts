// https://vitejs.dev/config/
import { execSync } from "child_process";
import { defineConfig } from "vite";
import pkg from "./package.json";

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
  build: {
    lib: {
      entry: "src/main.ts",
      formats: ["es"],
    },
  },
  esbuild: {
    legalComments: "none",
  },
  define: {
    __NAME__: JSON.stringify(pkg.name.toUpperCase()),
    __BRANCH__: quoteCommand("git rev-parse --abbrev-ref HEAD"),
    __COMMIT__: quoteCommandOrEnv("git rev-parse HEAD", "GITHUB_SHA"),
    __VERSION__: quoteCommand("git describe --tags --dirty --always"),
    __REPO_URL__: quoteCommand("git remote get-url origin").replace(".git", ""),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
