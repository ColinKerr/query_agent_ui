import { earlierQuestion, type AgentRun, type EarlierQuestion, type Note } from "@query-agent/client";

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

/** A chat: its questions in order. The earlier questions and the notes give a follow-up its context. */
export interface Chat {
  turns: ChatTurn[];
}

/**
 * What a follow-up is told of the chat so far: each earlier question as the user saw it, with what
 * its run found, and the notes of the last finished run, which carry the whole chat's. Never the
 * earlier runs' messages or steps. A question that failed is left out.
 */
export async function contextOf(chat: Chat): Promise<{ earlier: EarlierQuestion[]; notes: Note[] }> {
  const answered = chat.turns.filter((turn): turn is ChatTurn & { run: AgentRun } => turn.run !== undefined);
  const earlier = await Promise.all(answered.map((turn) => earlierQuestion(turn.question, turn.run)));
  return { earlier, notes: answered.at(-1)?.run.notes ?? [] };
}

/** The failure a user is shown. The reason is in the function's log, never in its reply. */
export const FAILED = "The agent could not finish. The function's log has the reason.";
