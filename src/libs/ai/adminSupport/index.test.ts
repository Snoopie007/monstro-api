import { beforeEach, describe, expect, mock, test } from "bun:test";

const supportCase = {
  id: 7,
  userId: "vendor-1",
  agentId: null,
  status: "open",
  subject: "Unknown feature",
  category: "Other",
  metadata: { supportMode: "ai", supportAiPendingMessageId: 11 },
};
const triggerMessage = {
  id: 11,
  caseId: 7,
  agentId: null,
  content: "How does the unknown feature work?",
  attachments: [],
  role: "user",
  type: "live chat",
  created: new Date("2026-07-17T12:00:00Z"),
};
const previousHumanRequest = {
  ...triggerMessage,
  id: 9,
  content: "Can I talk to a human instead?",
  created: new Date("2026-07-17T11:58:00Z"),
};
const agentReply = {
  ...triggerMessage,
  id: 10,
  agentId: "agent-1",
  content: "I have handled your request and handed this conversation back to AI support.",
  role: "agent",
  created: new Date("2026-07-17T11:59:00Z"),
};
const aiMessage = {
  ...triggerMessage,
  id: 12,
  role: "ai",
};
const updatedCase = {
  ...supportCase,
  metadata: { supportMode: "ai", supportAiPendingMessageId: null },
};
const escalatedCase = {
  ...supportCase,
  status: "escalated",
  metadata: { supportMode: "live", supportAiPendingMessageId: null },
};
const escalationLog = {
  id: 13,
  caseId: 7,
  agentId: null,
  from: "open",
  to: "escalated",
};
const offlineMessage = {
  ...triggerMessage,
  id: 14,
  content: "Support is offline.",
  role: "agent",
};

type Generation =
  | { kind: "reply"; content: string }
  | { kind: "escalate" }
  | { kind: "unavailable" };

let generation: Generation = { kind: "unavailable" };
let insertedRecords: Array<typeof aiMessage | typeof escalationLog | typeof offlineMessage> = [aiMessage];
let updatedRecord: typeof updatedCase | typeof escalatedCase = updatedCase;

const generateMock = mock(async () => generation);
const promptForMock = mock(() => []);
const recallDocumentsMock = mock(async () => []);
const insertValuesMock = mock(() => ({
  returning: mock(async () => [insertedRecords.shift()!]),
}));
const updateSetMock = mock(() => ({
  where: mock(() => ({ returning: mock(async () => [updatedRecord]) })),
}));
const broadcastAdminSupportMock = mock(async () => undefined);
const broadcastAdminSupportCaseMock = mock(async () => undefined);

const transaction = {
  execute: mock(async () => undefined),
  query: {
    adminSupportCases: { findFirst: mock(async () => supportCase) },
    adminSupportCaseMessages: { findFirst: mock(async () => triggerMessage) },
  },
  insert: mock(() => ({ values: insertValuesMock })),
  update: mock(() => ({ set: updateSetMock })),
};
const admindb = {
  query: {
    adminSupportCases: { findFirst: mock(async () => supportCase) },
    adminSupportCaseMessages: { findMany: mock(async () => [triggerMessage, agentReply, previousHumanRequest]) },
  },
  transaction: mock(async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
};

mock.module("drizzle-orm", () => ({
  desc: mock((value: unknown) => value),
  eq: mock(() => null),
  sql: mock(() => null),
}));
mock.module("@/db/db", () => ({ admindb }));
mock.module("@/db/admin", () => ({
  adminSupportCaseLogs: {},
  adminSupportCaseMessages: {},
  adminSupportCases: { id: "id" },
}));
mock.module("@/libs/broadcast/adminSupport", () => ({
  broadcastAdminSupport: broadcastAdminSupportMock,
  broadcastAdminSupportCase: broadcastAdminSupportCaseMock,
}));
mock.module("./tools", () => ({
  generate: generateMock,
  promptFor: promptForMock,
  recallDocuments: recallDocumentsMock,
}));

// Dynamic import lets Bun install the subject's dependency mocks before loading it.
const { createAdminSupportAiReply } = await import("./index");

describe("createAdminSupportAiReply", () => {
  beforeEach(() => {
    generation = { kind: "unavailable" };
    insertedRecords = [aiMessage];
    updatedRecord = updatedCase;
    generateMock.mockClear();
    promptForMock.mockClear();
    recallDocumentsMock.mockClear();
    recallDocumentsMock.mockImplementation(async () => []);
    insertValuesMock.mockClear();
    updateSetMock.mockClear();
    broadcastAdminSupportMock.mockClear();
    broadcastAdminSupportCaseMock.mockClear();
  });

  test("stores a deterministic handoff reply when recall finds no documents", async () => {
    await createAdminSupportAiReply({
      caseId: 7,
      triggerMessageId: 11,
      supportOfflineMessage: "Support is offline.",
    });

    expect(recallDocumentsMock).toHaveBeenCalledTimes(1);
    expect(recallDocumentsMock).toHaveBeenCalledWith("How does the unknown feature work?");
    expect(promptForMock).toHaveBeenCalledTimes(1);
    expect(promptForMock).toHaveBeenCalledWith(
      supportCase,
      [previousHumanRequest, agentReply],
      [],
      triggerMessage,
    );
    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      content: "I couldn’t find an answer to that in our support documentation. You can ask to speak with a human support agent here.",
      role: "ai",
    }));
    expect(insertValuesMock).toHaveBeenCalledTimes(1);
  });

  test("uses matched Monstro documents and keeps their sourced reply", async () => {
    const localDocument = {
      id: 3,
      title: "Change program colors",
      slug: "change-program-colors",
      categoryName: "Getting Started",
      mdxContent: "Open Programs and update Calendar Color.",
      isFtsMatch: true,
      isExactMatch: true,
    };
    const sourcedReply =
      "Open Programs and update Calendar Color.\n\nSources:\n- Change program colors: https://monstro-x.com/support/docs/getting-started/change-program-colors";
    generation = { kind: "reply", content: `Monstro AI: ${sourcedReply}` };
    recallDocumentsMock.mockImplementationOnce(async () => [localDocument]);

    await createAdminSupportAiReply({ caseId: 7, triggerMessageId: 11 });

    expect(promptForMock).toHaveBeenCalledWith(
      supportCase,
      [previousHumanRequest, agentReply],
      [localDocument],
      triggerMessage,
    );
    expect(generateMock).toHaveBeenCalledWith(
      [],
      expect.any(String),
      [localDocument],
    );
    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      content: sourcedReply,
      role: "ai",
    }));
  });

  test("searches GoHighLevel when local documents only have broad keyword matches", async () => {
    const broadDocument = {
      id: 26,
      title: "Adding Promo Code",
      slug: "adding-promo-code",
      categoryName: "Merchandise",
      mdxContent: "Create a promo code for merchandise.",
      isFtsMatch: true,
      isExactMatch: false,
    };
    const sourcedReply =
      "Use Zoho's SMTP settings.\n\nSources:\n- Zoho SMTP: https://help.gohighlevel.com/support/solutions/articles/48001173743";
    generation = { kind: "reply", content: sourcedReply };
    recallDocumentsMock.mockImplementationOnce(async () => [broadDocument]);

    await createAdminSupportAiReply({ caseId: 7, triggerMessageId: 11 });

    expect(promptForMock).toHaveBeenCalledWith(
      supportCase,
      [previousHumanRequest, agentReply],
      [],
      triggerMessage,
    );
    expect(generateMock).toHaveBeenCalledWith(
      [],
      expect.any(String),
      [broadDocument],
    );
    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      content: sourcedReply,
      role: "ai",
    }));
  });

  test("executes the escalation tool result without inserting an AI message", async () => {
    generation = { kind: "escalate" };
    insertedRecords = [escalationLog];
    updatedRecord = escalatedCase;

    const result = await createAdminSupportAiReply({ caseId: 7, triggerMessageId: 11 });

    expect(result).toEqual(expect.objectContaining({
      kind: "escalated",
      log: escalationLog,
      updatedCase: escalatedCase,
    }));
    expect(updateSetMock).toHaveBeenCalledWith({
      status: "escalated",
      metadata: { supportMode: "live", supportAiPendingMessageId: null },
      updated: expect.any(Date),
    });
    expect(insertValuesMock).toHaveBeenCalledTimes(1);
    expect(insertValuesMock).toHaveBeenCalledWith({
      caseId: 7,
      agentId: null,
      from: "open",
      to: "escalated",
    });
    expect(broadcastAdminSupportCaseMock).toHaveBeenCalledWith(7, "case_log", {
      log: escalationLog,
    });
  });

  test("sends the offline notice only when an offline escalation succeeds", async () => {
    generation = { kind: "escalate" };
    insertedRecords = [escalationLog, offlineMessage];
    updatedRecord = escalatedCase;

    const result = await createAdminSupportAiReply({
      caseId: 7,
      triggerMessageId: 11,
      supportOfflineMessage: "  Support is offline.  ",
    });

    expect(result).toEqual(expect.objectContaining({
      kind: "escalated",
      offlineMessage,
    }));
    expect(insertValuesMock).toHaveBeenCalledTimes(2);
    expect(insertValuesMock).toHaveBeenNthCalledWith(2, {
      caseId: 7,
      agentId: null,
      content: "Support is offline.",
      attachments: [],
      role: "agent",
      type: "live chat",
    });
    expect(broadcastAdminSupportCaseMock).toHaveBeenCalledWith(7, "new_message", {
      message: offlineMessage,
    });
  });
});
