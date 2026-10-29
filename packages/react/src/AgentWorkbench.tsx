/**
 * The larger control: the chat, with what the agent did beside it. It adds the steps of the open
 * run (each query with its result), the notes the agent kept, the earlier chats of this page, and
 * the answer's results read through the same client. It has no query editor of its own: a query
 * goes to the host's editor (`onUseQuery`).
 */

import { useEffect, useState } from "react";
import type { AgentStatus, QueryRows } from "@query-agent/client";
import { AgentChat, type AgentChatProps } from "./AgentChat";
import type { Chat } from "./chat";

export type AgentWorkbenchProps = Omit<AgentChatProps, "renderAfterAnswer" | "renderAfterChat" | "initialChat">;

type Tab = "steps" | "notes" | "results" | "history";

function ResultsTable(props: { rows?: Pick<QueryRows, "columns" | "rows" | "truncatedBy">; error?: string }): JSX.Element {
  if (props.error)
    return <div className="qa-error">{props.error}</div>;
  if (!props.rows)
    return <div className="qa-muted">No results yet.</div>;
  const { columns = [], rows = [], truncatedBy } = props.rows;
  return (
    <div className="qa-results">
      <table>
        <thead><tr>{columns.map((column, i) => <th key={i}>{column}</th>)}</tr></thead>
        <tbody>{rows.map((row, r) => <tr key={r}>{row.map((value, c) => <td key={c}>{value === null ? "null" : typeof value === "object" ? JSON.stringify(value) : String(value)}</td>)}</tr>)}</tbody>
      </table>
      {truncatedBy && <div className="qa-muted">Showing the first {rows.length} rows.</div>}
    </div>
  );
}

export function AgentWorkbench(props: AgentWorkbenchProps): JSX.Element {
  const { client, onChange, ...chatProps } = props;
  const [chat, setChat] = useState<Chat>({ turns: [] });
  const [history, setHistory] = useState<Chat[]>([]);
  const [opened, setOpened] = useState<{ chat: Chat; key: number }>({ chat: { turns: [] }, key: 0 });
  const [tab, setTab] = useState<Tab>("steps");
  const [status, setStatus] = useState<AgentStatus | undefined>();
  const [results, setResults] = useState<{ rows?: Pick<QueryRows, "columns" | "rows" | "truncatedBy">; error?: string }>({});

  const last = [...chat.turns].reverse().find((turn) => turn.run);
  const run = last?.run;

  // The answer's results, read again through the client when a new answer arrives.
  useEffect(() => {
    if (!client || !last?.query) {
      setResults({});
      return;
    }
    let current = true;
    client.read(last.query).then((rows) => current && setResults({ rows }), (err: unknown) => current && setResults({ error: err instanceof Error ? err.message : String(err) }));
    return () => {
      current = false;
    };
  }, [client, last?.query]);

  const changed = (next: Chat): void => {
    // "New chat" empties the chat: the one before goes into the history.
    if (next.turns.length === 0 && chat.turns.length > 0)
      setHistory((earlier) => [chat, ...earlier]);
    setChat(next);
    onChange?.(next);
  };

  const reopen = (earlier: Chat): void => {
    setHistory((list) => [...(chat.turns.length > 0 ? [chat] : []), ...list.filter((item) => item !== earlier)]);
    setChat(earlier);
    setOpened({ chat: earlier, key: opened.key + 1 });
  };

  return (
    <div className="qa-workbench-frame">
    <div className="qa-workbench">
      <div className="qa-workbench-chat">
        <AgentChat
          key={opened.key}
          {...chatProps}
          client={client}
          initialChat={opened.chat}
          onChange={changed}
          onStatus={(next) => {
            setStatus(next);
            chatProps.onStatus?.(next);
          }}
        />
      </div>
      <div className="qa-workbench-side">
        <div className="qa-tabs" role="tablist">
          {(["steps", "notes", "results", "history"] as Tab[]).map((name) => (
            <button type="button" role="tab" aria-selected={tab === name} key={name} onClick={() => setTab(name)}>
              {{ steps: "Steps", notes: "Notes", results: "Results", history: "History" }[name]}
            </button>
          ))}
        </div>
        {tab === "steps" && (
          <ol className="qa-steps">
            {(run?.steps ?? []).map((step, i) => (
              <li key={i} className={step.failed ? "qa-step-failed" : undefined}>
                <div className="qa-step-tool">{step.tool}{step.failed ? " (failed)" : ""}</div>
                {step.tool === "runQuery"
                  ? <pre><code>{(JSON.parse(step.arguments) as { ecsql?: string }).ecsql}</code></pre>
                  : <pre><code>{step.arguments}</code></pre>}
                <details><summary>Result</summary><pre>{step.result}</pre></details>
              </li>
            ))}
            {!run && <li className="qa-muted">{status ? "The run is in progress." : "Ask a question to see the agent's steps."}</li>}
          </ol>
        )}
        {tab === "notes" && (
          <ul className="qa-notes">
            {(run?.notes ?? []).map((note, i) => <li key={i}>{note.text}</li>)}
            {(run?.notes.length ?? 0) === 0 && <li className="qa-muted">No notes.</li>}
          </ul>
        )}
        {tab === "results" && <ResultsTable {...results} />}
        {tab === "history" && (
          <ul className="qa-history">
            {history.map((earlier, i) => (
              <li key={i}><button type="button" onClick={() => reopen(earlier)}>{earlier.turns[0]?.question ?? "(empty)"}</button></li>
            ))}
            {history.length === 0 && <li className="qa-muted">No earlier chats.</li>}
          </ul>
        )}
      </div>
    </div>
    </div>
  );
}
