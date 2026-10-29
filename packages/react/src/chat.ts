import type { AgentRun, ChatMessage, Note } from "@query-agent/client";

/** One question and what came of it. */
export interface ChatTurn {
  question: string;
  /** The answer's text. Empty while the run is in progress. */
  answer: string;
  /** The answer's query, when it has one. */
  query?: string;
  /** How the run ended: "answered", "partial", "not_found", or why it stopped. */
  outcome?: string;
  /** Set when the run failed: what to tell the user. */
  error?: string;
  /** The whole run, for a host that keeps or shows more of it. Absent on a failed run. */
  run?: AgentRun;
}

/** A chat: its questions in order. The earlier runs' messages and notes give a follow-up its context. */
export interface Chat {
  turns: ChatTurn[];
}

/** The messages and notes of the last finished run, which carry the whole chat so far. */
export function contextOf(chat: Chat): { history: ChatMessage[]; notes: Note[] } {
  for (let i = chat.turns.length - 1; i >= 0; i--) {
    const run = chat.turns[i].run;
    if (run)
      return { history: run.messages, notes: run.notes };
  }
  return { history: [], notes: [] };
}

/** The failure a user is shown. The reason is in the function's log, never in its reply. */
export const FAILED = "The agent could not finish. The function's log has the reason.";
