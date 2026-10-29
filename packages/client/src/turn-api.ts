/**
 * The turn API's types: everything that travels between the client and the function.
 *
 * The REST API document is `plan/Query_Agent_Turn_API.md`. This module imports nothing, so the
 * public UI repository can carry a copy of it as it is (the split plan allows the types to be
 * duplicated there). Change both together, and raise `TURN_VERSION` when a change is not
 * backward compatible.
 */

/** The version of these shapes. A function refuses a request of another version. */
export const TURN_VERSION = 1;

export type Role = "system" | "user" | "assistant" | "tool";

/** A tool call as the model emitted it. */
export interface ToolCall {
  id: string;
  name: string;
  /**
   * The argument JSON as text, not parsed.
   *
   * Kept raw because a local model gets this wrong often enough to matter, and the recovery is
   * to hand the parse error back as the tool result rather than to fail the turn.
   */
  arguments: string;
}

export interface ChatMessage {
  role: Role;
  content: string;
  /** Present on an assistant message that asked for tools. */
  toolCalls?: ToolCall[];
  /** Present on a tool message: which call it answers. */
  toolCallId?: string;
  /** The tool's name, which some endpoints require on a tool message. */
  name?: string;
}

/** A finding the agent chose to keep. */
export interface Note {
  text: string;
  at: string;
}

/** One step of what the agent did, for the reveal panel and the transcript. */
export interface TranscriptStep {
  tool: string;
  arguments: string;
  /** The text handed back to the model, after capping -- what it actually saw. */
  result: string;
  failed: boolean;
  ms: number;
}

export interface TokenUsage {
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
}

export interface ResultCaps {
  /** How many rows may be shown. */
  maxRows: number;
  /** How many characters of formatted rows may be shown, across all of them. */
  maxChars: number;
  /** How long a single value may be before it is clipped. */
  maxCellChars: number;
}

/**
 * One query's result as the client sends it: the rows it read, up to the caps the function sent,
 * or the query's error.
 *
 * The client stops where the function's format would stop, so it never reads or sends more than
 * the model can be shown. A string longer than `maxCellChars` travels cut to that length, with
 * its full length in `clipped`, so the function can say how much was cut.
 */
export interface QueryRows {
  /** The query exactly as the response asked for it. */
  ecsql: string;
  columns?: string[];
  rows?: unknown[][];
  /** The cells cut to `maxCellChars`: row index, column index, full length. */
  clipped?: [number, number, number][];
  /** Which cap stopped the read, if either did. */
  truncatedBy?: "rows" | "chars";
  /** The query's error message, when it failed (at the start or part way through the rows). */
  error?: string;
  /** How long the client took to run and read it. */
  ms: number;
}

/**
 * One startup query's result as the client sends it: the rows to show, how many rows there were,
 * and the value of the `each` query for each row shown.
 */
export interface StartupResult {
  rule: string;
  id: string;
  /** The rows to show: at most the query's `max`. */
  rows: unknown[][];
  /** How many rows the query returned, counted up to the client's guard. */
  count: number;
  /** True when the count stopped at the guard, so there may be more. */
  guarded?: boolean;
  /**
   * For each row shown, its `each` value: a count, or null when it could not be run. A client from
   * before 2026-10-28 stopped counting after 2 s and sent "not counted"; the function still reads it.
   */
  each?: (string | null)[];
  /** Not run, because a query it depends on was not empty. */
  skipped?: boolean;
  /** The query failed (the class or schema is not in this file). It is then empty. */
  error?: string;
  ms: number;
}

export type StopReason = "answered" | "stuck" | "steps" | "aborted";

export interface SubmittedAnswer {
  explanation: string;
  query: string;
  outcome: "answered" | "partial" | "not_found";
  rowLimitIntended: boolean;
  /** Read from a free-text answer's labelled last lines rather than submitted with the tool. */
  via?: "labels";
}

/** A research skill that was loaded, and what loaded it: the model's choice, a default, or an event. */
export interface LoadedSkill {
  name: string;
  by: "choice" | "default" | "no-class-rows" | "property-search";
}

/**
 * What the function remembers between turns that the steps and the messages do not say. The
 * client sends it back as it received it, and does not read it.
 */
export interface TurnState {
  /** How many times each check has spoken, and the current runs of failures. */
  counts: Record<string, number>;
  loaded: LoadedSkill[];
  hintsShown: string[];
  /** The last system prompt was built from the first `notes` notes and the first `skills` loaded skills. */
  prompt?: { notes: number; skills: number };
  /** Requests to the model, and the tokens the endpoint reported for them (absent when it reported none). */
  usage: { requests: number; tokens?: TokenUsage };
}

/** What the client sends for one turn: `POST /turn`. */
export interface TurnRequest {
  version: number;
  question: string;
  /** Whether the client has an iModel to query. Without one, `runQuery` is not offered. */
  canQuery: boolean;
  /** The open iModel: its name, and the rows of the startup query list, sent with every turn. */
  imodel?: { name: string; startup?: StartupResult[] };
  /** What is in the query editor, which is context for "fix this" and "what does this do". */
  editorText?: string;
  /**
   * The conversation so far, without the system message, which the function rebuilds every
   * turn: the earlier questions of the chat, then this run's messages.
   */
  messages: ChatMessage[];
  /** This run's steps so far. */
  steps: TranscriptStep[];
  /** The notes carried from earlier questions of the chat, then this run's. */
  notes: Note[];
  /** Absent on the first turn of a run. */
  state?: TurnState;
  /** The rows, or the error, of each query the last response asked for. */
  results?: QueryRows[];
  /** The user stopped the run: the function handles the last reply's calls and ends it, with no LLM call. */
  aborted?: boolean;
}

/** What the run ends with. */
export interface TurnDone {
  /** The final prose answer, which should carry exactly one fenced sql block. */
  answer: string;
  /** The query pulled out of the answer, if there was one. */
  query?: string;
  /** The answer as submitted with `submitAnswer`, when the run ended that way. */
  structured?: SubmittedAnswer;
  stoppedBecause: StopReason;
  /** The system prompt as last sent, so a transcript explains itself. */
  systemPrompt: string;
  /** Research skills loaded during the run, in order, when they were on. */
  skillsLoaded?: LoadedSkill[];
}

/** What the function sends back for one turn. */
export interface TurnResponse {
  version: number;
  /** The new messages, steps and notes, for the client to append. */
  messages: ChatMessage[];
  steps: TranscriptStep[];
  notes: Note[];
  state: TurnState;
  /** The queries to run before the next turn. When there are none, the client sends the next turn at once. */
  queries: string[];
  /** How much of each query's result to read. */
  caps: ResultCaps;
  /** Present when the run is over. */
  done?: TurnDone;
}
