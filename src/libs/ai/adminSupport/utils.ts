import type { AdminSupportCaseMessage } from "@/db/admin";

const MAX_DOC_CHARS = 1800;

export function compactMdx(content: string) {
  return content
    .replace(/^import\s.+$/gm, " ")
    .replace(/^export\s.+$/gm, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_DOC_CHARS);
}

export function messageText(message: AdminSupportCaseMessage) {
  const attachments = message.attachments;
  const names = attachments.map((item) => item.filename).join(", ");

  const sender =
    message.role === "user"
      ? "Vendor"
      : message.role === "ai"
        ? "Monstro AI"
        : "Monstro Support";

  const attachmentText = names
    ? ` [attachments: ${names}]`
    : attachments.length
      ? ` [${attachments.length} attachment(s)]`
      : "";

  return `${sender}: ${(message.content || "(no text)").trim()}${attachmentText}`;
}

export function requestsLiveSupport(message: string) {
  const target =
    /\b(?:human|person|someone|somebody|representative|support rep|support teammate|support team|live agent|support agent|live support)\b/i;
  const request =
    /\b(?:can|could|would|talk|speak|chat|connect|transfer|escalat\w*|reach|get|want|need|prefer|help|please|instead|now)\b/i;

  return target.test(message) && request.test(message);
}
