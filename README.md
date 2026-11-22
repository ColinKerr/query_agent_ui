# query_agent_ui

The query agent's client library and React controls, for iTwin.js apps. The agent answers
questions about an iModel by writing and running ECSql. The client runs every query on the
app's own iModel, and the agent function (a separate service) decides what to ask next.
[`docs/design.md`](docs/design.md) describes how the client and the controls work.

## Packages

| Package | Holds |
|---|---|
| `packages/client` | `AgentClient`, the query runner, the turn driver, the startup query list, and the API types |
| `packages/react` | `AgentChat` (the chat and the ask box), `AgentWorkbench` (the chat with the answer's results and earlier chats beside it; it shows nothing of how the agent worked), the feedback form, and selecting an answer's elements (`selection.ts`) |

### Use the client

```ts
import { AgentClient, queryRunner } from "@colin_kerr/query-agent-client";

// Start it when the iModel opens: it runs the startup query list at once.
const client = AgentClient.start({ runQuery: queryRunner(imodel), imodelName: imodel.name, functionUrl });

const run = await client.ask("How many pipes are there?", {
  onStatus: (status) => show(status.phase), // "exploring", "thinking" or "querying"
});
console.log(run.answer, run.query);
```

### In Node

For tests and scripts, `@colin_kerr/query-agent-client/node` starts iTwin.js's frontend in Node, so the
queries go to a backend by RPC, as a browser's do. It needs `global-jsdom` and `jsdom`.

```ts
import { connectionFromProps, startNodeFrontend } from "@colin_kerr/query-agent-client/node";

await startNodeFrontend(backendUrl);
const imodel = connectionFromProps(connectionPropsFromTheBackend);
```

### The controls

```tsx
import { AgentWorkbench } from "@colin_kerr/query-agent-react";
import "@colin_kerr/query-agent-react/styles.css";

<AgentWorkbench
  client={client}                       // a started AgentClient, or undefined: "not set up"
  editorText={() => editor.value}       // sent with each question
  onUseQuery={(ecsql) => editor.setValue(ecsql)}
  onFeedback={(feedback) => send(feedback)} // only what the user saw and wrote, after they review it
/>
```

### Selecting an answer's elements

Start the client with `answerMode: "auto"`, and give the controls the app's unified selection
store. The agent then decides, question by question, whether the user asked to select elements
("select the doors on level 2", "select them"). An answer whose rows are elements carries their
`ECInstanceId` and `ClassName`, and offers "Select N elements": every element, read in full. A
selection request that finds nothing clears the selection. `run.resultType` says what an answer
is (`selection` or `answer`).

```tsx
const client = AgentClient.start({ runQuery: queryRunner(imodel), imodelName: imodel.name, functionUrl, answerMode: "auto" });

<AgentWorkbench
  client={client}
  selection={{
    storage: selectionStorage,          // a SelectionStorage from @itwin/unified-selection
    imodelKey: imodel.key,
    autoSelect: true,                   // replace the selection when the answer arrives
    onSelected: (result) => zoomTo(result.selected.map((key) => key.id)),
  }}
/>
```

While a run is in progress the chat shows "Exploring", "Thinking" or "Running a query", with
moving dots. Nothing is uploaded by the controls: feedback goes to the host's `onFeedback`.

## Develop

`npm install` once, then:

| Command | Does |
|---|---|
| `npm test` / `npm run test:watch` | Runs the tests of both packages. Each package reads the other's source, so no build is needed first. |
| `npm run typecheck` | Checks both packages' source and tests as one program. The editor uses the same `tsconfig.json`. |
| `npm run dev` | Rebuilds both packages' `dist/` whenever their source changes. Leave it running while you work on an app that uses them. |
| `npm run build` | Builds both packages, the client first. |
| `npm run clean` | Removes both `dist/` folders. |
| `npm run version:set -- 0.1.3` | Gives both packages that version, points the React package's dependency on the client at it, and refreshes `package-lock.json`. Then add a `CHANGELOG.md` entry. |
| `npm run pack:local` | Cleans, builds and packs both packages into `tarballs/`, for installing in an app with `file:`. |

To try a change in an app, run `npm run dev` here and `npm link @colin_kerr/query-agent-client
@colin_kerr/query-agent-react` in the app. The app must load one copy of React (in Vite,
`resolve.dedupe: ["react", "react-dom"]`).
