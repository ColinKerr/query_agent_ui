// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { AgentClient } from "@query-agent/client";
import { AgentWorkbench } from "../src/AgentWorkbench";
import { button, click, mount, response, rows, scriptedTurns, settle, type } from "./helpers";

describe("AgentWorkbench", () => {
  it("shows the run's steps, the answer's results, and earlier chats", async () => {
    const step = { tool: "runQuery", arguments: JSON.stringify({ ecsql: "SELECT COUNT(*) FROM e" }), result: "columns: [\"n\"]\n[3]", failed: false, ms: 1 };
    const turns = scriptedTurns([response([], { answer: "There are 3.", query: "SELECT COUNT(*) FROM e" }, [step])]);
    const client = AgentClient.start({ turns, runQuery: async () => rows([[3]]), startupList: { lists: {}, queries: [] } });
    const { container } = mount(<AgentWorkbench client={client} />);

    type(container.querySelector("textarea")!, "How many?");
    click(button(container, "Ask"));
    await settle(10);
    expect(container.querySelector(".qa-steps code")?.textContent).toBe("SELECT COUNT(*) FROM e");

    click(button(container, "Results"));
    await settle(10);
    expect([...container.querySelectorAll(".qa-results td")].map((td) => td.textContent)).toEqual(["3"]);

    click(button(container, "New chat"));
    click(button(container, "History"));
    expect(container.querySelector(".qa-history button")?.textContent).toBe("How many?");
    click(container.querySelector(".qa-history button"));
    expect(container.querySelector(".qa-answer-text")?.textContent).toBe("There are 3.");
  });
});
