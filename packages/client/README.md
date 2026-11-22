# @colin_kerr/query-agent-client

The query agent's client library for iTwin.js apps. The agent answers questions about an iModel
by writing and running ECSql. This library runs every query on your app's own iModel and drives
the conversation with the agent function (a separate service that you host and give the URL of).

```ts
import { AgentClient, queryRunner } from "@colin_kerr/query-agent-client";

const client = AgentClient.start({ runQuery: queryRunner(imodel), imodelName: imodel.name, functionUrl });
const run = await client.ask("How many pipes are there?");
console.log(run.answer, run.query);
```

`@colin_kerr/query-agent-client/node` starts iTwin.js's frontend in Node, for tests and scripts.
It needs the optional peer dependencies `global-jsdom` and `jsdom`.

For the React controls, see `@colin_kerr/query-agent-react`. The full guide and the design are in
the [repository](https://github.com/ColinKerr/query_agent_ui).

MIT licence.
