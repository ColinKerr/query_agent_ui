import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // The packages import each other by name. Tests read the other package's source, so a change in
  // the client is seen by the React tests at once, with no build in between.
  resolve: {
    alias: [
      { find: /^@colin_kerr\/query-agent-client\/node$/, replacement: at("./packages/client/src/node/index.ts") },
      { find: /^@colin_kerr\/query-agent-client$/, replacement: at("./packages/client/src/index.ts") },
      { find: /^@colin_kerr\/query-agent-react\/styles\.css$/, replacement: at("./packages/react/src/styles.css") },
      { find: /^@colin_kerr\/query-agent-react$/, replacement: at("./packages/react/src/index.ts") },
    ],
  },
  test: {
    include: ["packages/*/test/**/*.test.ts", "packages/*/test/**/*.test.tsx"],
  },
});
