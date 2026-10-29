/**
 * The client a host starts for an open iModel: it runs the startup list when it starts, then
 * answers questions by driving turns with the function.
 *
 * ```ts
 * const client = AgentClient.start({ runQuery: queryRunner(imodel), imodelName, functionUrl });
 * const run = await client.ask("How many pipes are there?", { onStatus });
 * ```
 */

import { readCapped, type RunRawQuery } from "./caps";
import { driveTurns, fetchTurns, runStartupQueries, type AgentRun, type ClientOptions, type StartupList, type TurnCall } from "./client";
import defaultList from "./startup-queries.json";
import type { ChatMessage, Note, QueryRows, ResultCaps, StartupResult, TranscriptStep } from "./turn-api";

/** What the client is doing: what a host shows while it waits. */
export type AgentStatus =
  | { phase: "exploring" }
  | { phase: "thinking" }
  | { phase: "querying"; ecsql: string };

export interface AgentClientOptions {
  /** How to run a query on the iModel: `queryRunner(imodel)`. Absent for questions about ECSql alone. */
  runQuery?: RunRawQuery;
  /** The iModel's name, as the agent is told it. */
  imodelName?: string;
  /** The function's base URL; `POST <url>/turn` is called. */
  functionUrl?: string;
  /** In place of `functionUrl`: how to send one turn (a test, or the function in the same process). */
  turns?: TurnCall;
  /** The access token for the function. Unused until the function needs authentication. */
  getAccessToken?: () => Promise<string | undefined>;
  /** The startup query list. The library's own list by default. */
  startupList?: StartupList;
  /** Called when the startup list starts and ends. */
  onExploring?: (exploring: boolean) => void;
}

export interface AskOptions {
  /** The text in the host's query editor, if any. */
  editorText?: string;
  /** Earlier questions and answers of this chat, so a follow-up has their context. */
  history?: readonly ChatMessage[];
  /** Findings carried over from earlier questions of this chat. */
  notes?: readonly Note[];
  onStatus?: (status: AgentStatus) => void;
  onStep?: (step: TranscriptStep) => void;
  onNote?: (note: Note) => void;
  signal?: AbortSignal;
}

export class AgentClient {
  private readonly turns: TurnCall;
  private explored = false;
  /** The startup list's rows: undefined when there is no iModel, or when the list could not run. */
  public readonly startup: Promise<StartupResult[] | undefined>;

  private constructor(private readonly options: AgentClientOptions) {
    if (options.turns)
      this.turns = options.turns;
    else if (options.functionUrl)
      this.turns = fetchTurns(options.functionUrl, { getAccessToken: options.getAccessToken });
    else
      throw new Error("AgentClient needs functionUrl, or turns.");
    this.startup = this.explore();
  }

  /** Start the client: the startup list begins to run at once (see `startup`). */
  public static start(options: AgentClientOptions): AgentClient {
    return new AgentClient(options);
  }

  private async explore(): Promise<StartupResult[] | undefined> {
    const { runQuery } = this.options;
    if (!runQuery)
      return undefined;
    this.options.onExploring?.(true);
    try {
      // A list that cannot run leaves the block out, and the agent works without it.
      return (await runStartupQueries(this.options.startupList ?? (defaultList as StartupList), runQuery)).results;
    } catch {
      return undefined;
    } finally {
      this.explored = true;
      this.options.onExploring?.(false);
    }
  }

  /**
   * Read a query's rows on the iModel, up to the caps given: for a host that shows an answer's
   * results. Throws when there is no iModel, or the query fails.
   */
  public async read(ecsql: string, caps: ResultCaps = { maxRows: 200, maxChars: 200_000, maxCellChars: 400 }): Promise<Pick<QueryRows, "columns" | "rows" | "clipped" | "truncatedBy">> {
    if (!this.options.runQuery)
      throw new Error("No iModel is open.");
    return readCapped(await this.options.runQuery(ecsql), caps);
  }

  /** Answer one question. While the startup list still runs, it waits for it, with the status `exploring`. */
  public async ask(question: string, options: AskOptions = {}): Promise<AgentRun> {
    const { runQuery, imodelName } = this.options;
    if (!this.explored && this.options.runQuery)
      options.onStatus?.({ phase: "exploring" });
    const startup = await this.startup;
    const client: ClientOptions = {
      runQuery,
      imodel: imodelName !== undefined ? { name: imodelName, startup } : undefined,
      editorText: options.editorText,
      history: options.history,
      notes: options.notes,
      onStep: options.onStep,
      onNote: options.onNote,
      onPhase: (phase, ecsql) => options.onStatus?.(phase === "querying" ? { phase, ecsql: ecsql ?? "" } : { phase }),
      signal: options.signal,
    };
    return driveTurns(question, client, this.turns);
  }
}
