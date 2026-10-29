import type { RawQueryResult, RunRawQuery } from "../src/caps";
import { TURN_VERSION, type TurnRequest, type TurnResponse } from "../src/turn-api";

export function rows(columns: string[], data: unknown[][]): RawQueryResult {
  return { columns, rows: (async function* () { yield* data; })() };
}

/** A query function that answers from a table of ECSql to rows, and fails on anything else. */
export function fakeQueries(table: Record<string, unknown[][]>, delayMs = 0): RunRawQuery & { asked: string[] } {
  const asked: string[] = [];
  const run = (async (ecsql: string) => {
    asked.push(ecsql);
    if (delayMs > 0)
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    const data = table[ecsql];
    if (!data)
      throw new Error(`no such query: ${ecsql}`);
    return rows(["n"], data);
  }) as RunRawQuery & { asked: string[] };
  run.asked = asked;
  return run;
}

export const CAPS = { maxRows: 200, maxChars: 12_000, maxCellChars: 400 };

/** A response: the queries to run, or the end of the run with an answer. */
export function response(queries: string[], done?: { answer: string; query?: string }): TurnResponse {
  return {
    version: TURN_VERSION, messages: [{ role: "assistant", content: done?.answer ?? "" }], steps: [], notes: [],
    state: { usage: { requests: 1 } } as TurnResponse["state"], queries, caps: CAPS,
    ...(done ? { done: { answer: done.answer, query: done.query, stoppedBecause: "answered", systemPrompt: "prompt" } as TurnResponse["done"] } : {}),
  };
}

/** Turns from a script, and the requests they were sent. */
export function scriptedTurns(...responses: TurnResponse[]): ((request: TurnRequest) => Promise<TurnResponse>) & { requests: TurnRequest[] } {
  const requests: TurnRequest[] = [];
  const turn = (async (request: TurnRequest) => {
    requests.push(JSON.parse(JSON.stringify(request)) as TurnRequest);
    const next = responses.shift();
    if (!next)
      throw new Error("out of script");
    return next;
  }) as ((request: TurnRequest) => Promise<TurnResponse>) & { requests: TurnRequest[] };
  turn.requests = requests;
  return turn;
}
