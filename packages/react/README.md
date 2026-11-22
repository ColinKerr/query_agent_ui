# @colin_kerr/query-agent-react

React controls for the query agent: `AgentChat` (the chat and the ask box), `AgentWorkbench` (the
chat with the answer's results and earlier chats beside it), the feedback form, and selecting an
answer's elements.

```tsx
import { AgentWorkbench } from "@colin_kerr/query-agent-react";
import "@colin_kerr/query-agent-react/styles.css";

<AgentWorkbench client={client} editorText={() => editor.value} onUseQuery={(ecsql) => editor.setValue(ecsql)} />
```

`client` is a started `AgentClient` from `@colin_kerr/query-agent-client`. The controls upload
nothing: feedback goes to your `onFeedback` handler. The full guide and the design are in the
[repository](https://github.com/ColinKerr/query_agent_ui).

Needs React 18.3.1 or later 18.x. MIT licence.
