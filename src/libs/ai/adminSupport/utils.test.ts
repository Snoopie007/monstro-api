import { describe, expect, test } from "bun:test";
import { requestsLiveSupport } from "./utils";

describe("requestsLiveSupport", () => {
  test.each([
    "Can I talk to a human instead?",
    "Please connect me with a support agent",
    "I'd prefer live support",
    "Could I speak with somebody?",
    "Escalate this to a representative",
  ])("recognizes %s", (message) => {
    expect(requestsLiveSupport(message)).toBe(true);
  });

  test.each([
    "How do I add rewards?",
    "How do I add a staff member as an agent?",
    "What is live chat?",
    "Where are the human resources settings?",
  ])("leaves %s in AI mode", (message) => {
    expect(requestsLiveSupport(message)).toBe(false);
  });
});
