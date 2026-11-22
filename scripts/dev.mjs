// `npm run dev`: rebuilds both packages' dist/ whenever their source changes, so a host app linked
// to this checkout (`npm link`) or packed from it always sees the current code. No dependencies.
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, watch } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const tsc = fileURLToPath(new URL("../node_modules/typescript/bin/tsc", import.meta.url));

const watchers = [
  ["client:cjs", "packages/client/tsconfig.json"],
  ["client:esm", "packages/client/tsconfig.esm.json"],
  ["react", "packages/react/tsconfig.json"],
];

const children = watchers.map(([label, project]) => {
  const child = spawn(process.execPath, [tsc, "-p", project, "--watch", "--preserveWatchOutput"], { cwd: root });
  const show = (data) => process.stdout.write(String(data).split("\n").filter(Boolean).map((line) => `[${label}] ${line}\n`).join(""));
  child.stdout.on("data", show);
  child.stderr.on("data", show);
  return child;
});

// The React package's stylesheet is copied, not compiled.
const styles = fileURLToPath(new URL("../packages/react/src/styles.css", import.meta.url));
const out = fileURLToPath(new URL("../packages/react/dist/styles.css", import.meta.url));
const copyStyles = () => {
  mkdirSync(fileURLToPath(new URL("../packages/react/dist", import.meta.url)), { recursive: true });
  copyFileSync(styles, out);
  console.log("[react] styles.css copied");
};
if (existsSync(styles)) {
  copyStyles();
  watch(styles, copyStyles);
}

const stop = () => children.forEach((child) => child.kill());
process.on("SIGINT", () => { stop(); process.exit(0); });
process.on("SIGTERM", () => { stop(); process.exit(0); });
