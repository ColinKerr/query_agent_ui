# query_agent_ui

The query agent's client library and React controls, for iTwin.js apps. The agent answers
questions about an iModel by writing and running ECSql. The client runs every query on the
app's own iModel, and the agent function (a separate service) decides what to ask next. The API
between them is `docs/turn-api.md` in `query_agent_function`.

## Packages

| Package | Holds |
|---|---|
| `packages/client` | `AgentClient`, the query runner, the turn driver, the startup query list, and the API types |

### Use the client

```ts
import { AgentClient, queryRunner } from "@query-agent/client";

// Start it when the iModel opens: it runs the startup query list at once.
const client = AgentClient.start({ runQuery: queryRunner(imodel), imodelName: imodel.name, functionUrl });

const run = await client.ask("How many pipes are there?", {
  onStatus: (status) => show(status.phase), // "exploring", "thinking" or "querying"
});
console.log(run.answer, run.query);
```

### In Node

For tests and scripts, `@query-agent/client/node` starts iTwin.js's frontend in Node, so the
queries go to a backend by RPC, as a browser's do. It needs `global-jsdom` and `jsdom`.

```ts
import { connectionFromProps, startNodeFrontend } from "@query-agent/client/node";

await startNodeFrontend(backendUrl);
const imodel = connectionFromProps(connectionPropsFromTheBackend);
```

## Build and test

`npm install`, `npm run build`, `npm test`.
