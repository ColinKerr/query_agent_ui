// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { AgentClient } from "@query-agent/client";
import { AgentChat } from "../src/AgentChat";
import { FAILED } from "../src/chat";
import { button, click, mount, response, rows, scriptedTurns, settle, type } from "./helpers";

function ask(container: HTMLElement, question: string): void {
  type(container.querySelector("textarea")!, question);
  click(button(container, "Ask"));
}

describe("AgentChat", () => {
  it("shows the phase with moving dots while it works, then the answer and its query", async () => {
    let release: () => void = () => {};
    const gate = () => new Promise<void>((resolve) => { release = resolve; });
    const turns = scriptedTurns([response(["SELECT COUNT(*) FROM e"]), response([], { answer: "There are 3.", query: "SELECT COUNT(*) FROM e", outcome: "answered" })], gate);
    const client = AgentClient.start({ turns, runQuery: async () => rows([[3]]), imodelName: "f.bim", startupList: { lists: {}, queries: [] } });
    const onAnswer = vi.fn();
    const onUseQuery = vi.fn();
    const { container } = mount(<AgentChat client={client} onAnswer={onAnswer} onUseQuery={onUseQuery} />);

    ask(container, "How many?");
    await settle();
    expect(container.querySelector(".qa-progress")?.textContent).toMatch(/^Thinking\.{1,3}$/);
    await settle(450);
    expect(container.querySelector(".qa-dots")?.textContent).toMatch(/^\.{1,3}$/);
    release();
    await settle();
    release();
    await settle();

    expect(container.querySelector(".qa-answer-text")?.textContent).toBe("There are 3.");
    expect(container.querySelector(".qa-query code")?.textContent).toBe("SELECT COUNT(*) FROM e");
    expect(onAnswer).toHaveBeenCalledWith({ question: "How many?", answer: "There are 3.", query: "SELECT COUNT(*) FROM e", outcome: "answered" });
    click(button(container, "Use this query"));
    expect(onUseQuery).toHaveBeenCalledWith("SELECT COUNT(*) FROM e");
  });

  it("sends the first run's messages with a follow-up question", async () => {
    const turns = scriptedTurns([response([], { answer: "First." }), response([], { answer: "Second." })]);
    const { container } = mount(<AgentChat client={AgentClient.start({ turns })} />);
    ask(container, "one");
    await settle();
    ask(container, "two");
    await settle();
    expect(turns.requests[1].messages.map((m) => m.content)).toContain("First.");
    expect([...container.querySelectorAll(".qa-answer-text")].map((e) => e.textContent)).toEqual(["First.", "Second."]);
  });

  it("stops a run when asked, and shows what the agent had", async () => {
    let release: () => void = () => {};
    const gate = () => new Promise<void>((resolve) => { release = resolve; });
    const turns = scriptedTurns([response(["SELECT 1"])], gate);
    const { container } = mount(<AgentChat client={AgentClient.start({ turns, runQuery: async () => rows([[1]]), startupList: { lists: {}, queries: [] } })} />);
    ask(container, "q");
    await settle();
    click(button(container, "Stop"));
    release();
    await settle();
    release();
    await settle();
    expect(turns.requests[turns.requests.length - 1].aborted).toBe(true);
    expect(container.querySelector(".qa-answer-text")?.textContent).toBe("Stopped.");
  });

  it("says a failed run could not finish, without the reason", async () => {
    const client = AgentClient.start({ turns: async () => { throw new Error("HTTP 502 secret-host"); } });
    const { container } = mount(<AgentChat client={client} />);
    ask(container, "q");
    await settle();
    expect(container.querySelector(".qa-error")?.textContent).toBe(FAILED);
    expect(container.textContent).not.toContain("secret");
  });

  it("says the agent is not set up when there is no client, and cannot be asked", () => {
    const { container } = mount(<AgentChat />);
    expect(container.querySelector(".qa-notice")?.textContent).toBe("The agent is not set up.");
    expect(container.querySelector("textarea")?.disabled).toBe(true);
  });
});

describe("AgentChat, driven by the host", () => {
  it("asks a question the host gives, once for each key, and draws the host's buttons under the answer", async () => {
    const turns = scriptedTurns([response([], { answer: "From the case." })]);
    const client = AgentClient.start({ turns });
    const { container, root } = mount(<AgentChat client={client} question={{ text: "the case's question", key: 1 }} answerActions={() => <button type="button">New case</button>} />);
    await settle();
    expect(turns.requests[0].question).toBe("the case's question");
    expect(container.querySelector(".qa-answer-text")?.textContent).toBe("From the case.");
    expect(button(container, "New case")).toBeDefined();
    act(() => root.render(<AgentChat client={client} question={{ text: "the case's question", key: 1 }} />));
    await settle();
    expect(turns.requests).toHaveLength(1);
  });
});
