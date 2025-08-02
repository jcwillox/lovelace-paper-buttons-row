import { exec } from "node:child_process";
import { promisify } from "node:util";
import { type UserConfig, defineConfig } from "vite";
import viteCompression from "vite-plugin-compression";
import pkg from "./package.json";

const $ = async (command: string, env = "") =>
  process.env[env] ?? (await promisify(exec)(command)).stdout.trim();

const all = async (obj: Record<string, string | Promise<string>>) =>
  Object.fromEntries(
    await Promise.all(
      Object.entries(obj).map(async ([k, v]) => [k, JSON.stringify(await v)]),
    ),
  );

export default defineConfig(
  async (): Promise<UserConfig> => ({
    build: {
      target: "es6",
      lib: {
        entry: "src/main.ts",
        formats: ["es"],
      },
    },
    esbuild: {
      legalComments: "none",
    },
    plugins: [viteCompression({ verbose: false })],
    define: await all({
      __NAME__: pkg.name.toUpperCase(),
      __BRANCH__: $("git rev-parse --abbrev-ref HEAD", "GITHUB_REF_NAME"),
      __VERSION__: $("git describe --tags --dirty --always", "VERSION"),
      __COMMIT__: $("git rev-parse HEAD", "GITHUB_SHA"),
      __BUILD_TIME__: new Date().toISOString(),
    }),
  }),
);
