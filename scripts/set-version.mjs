// `npm run version:set -- 0.1.3`: gives both packages the same version, and points the React
// package's dependency on the client at it, so a release needs one command, not three edits.
// Then it refreshes package-lock.json. The release workflow checks the tag against these versions.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Usage: npm run version:set -- <major.minor.patch>   (a prerelease such as 0.2.0-beta.1 is allowed)");
  process.exit(1);
}

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => JSON.parse(readFileSync(root + path, "utf8"));
const write = (path, json) => writeFileSync(root + path, JSON.stringify(json, null, 2) + "\n");

const client = read("packages/client/package.json");
const react = read("packages/react/package.json");
const changes = [];
const set = (label, object, key, value) => {
  if (object[key] !== value) {
    changes.push(`${label}: ${object[key]} -> ${value}`);
    object[key] = value;
  }
};

set(`${client.name} version`, client, "version", version);
set(`${react.name} version`, react, "version", version);
set(`${react.name} dependency on the client`, react.dependencies, client.name, version);

if (changes.length === 0) {
  console.log(`Already at ${version}.`);
  process.exit(0);
}
write("packages/client/package.json", client);
write("packages/react/package.json", react);
execFileSync("npm", ["install", "--package-lock-only", "--ignore-scripts"], { cwd: root, stdio: "ignore" });
console.log(changes.join("\n"));
console.log("package-lock.json refreshed.");
if (!readFileSync(root + "CHANGELOG.md", "utf8").includes(`## ${version}`))
  console.log(`Reminder: CHANGELOG.md has no "## ${version}" entry yet.`);
