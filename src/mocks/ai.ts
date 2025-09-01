// =====================================================================
// DEPRECATED: AI Mock Data
// =====================================================================
// ⚠️  THIS FILE IS NO LONGER USED ⚠️
// This mock data is from an older AI system and is not used in the current bot implementation.
// TODO: Remove this file once we're confident it's not needed

import type { Agent, Inbox } from "@/types/ai";

export const MOCK_AGENTS: Agent[] = [
  {
    id: "agent-1",
    name: "Front Desk Assistant",
    systemPrompt:
      "You are the front desk AI for our gym location. Be professional, concise, and helpful. Help with membership questions, class schedules, and facility information.",
    parameters: {
      model: "gpt-4o-mini",
      temperature: 0.5,
      maxTokens: 800,
      topP: 1,
      tone: "professional",
    },
    assignedInboxIds: ["inbox-chat", "inbox-sms"],
    isActive: true,
  },
  {
    id: "agent-2",
    name: "Sales Concierge",
    systemPrompt:
      "You are a sales-oriented assistant for our gym. Be friendly, upbeat, and guide potential customers towards membership packages. Focus on benefits and value.",
    parameters: {
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1,
      tone: "friendly",
    },
    assignedInboxIds: ["inbox-chat", "inbox-facebook"],
    isActive: true,
  },
  {
    id: "agent-3",
    name: "Support Specialist",
    systemPrompt:
      "You handle technical support and account issues for gym members. Be patient, detailed, and solution-focused. Escalate complex billing issues to human staff.",
    parameters: {
      model: "gpt-4o-mini",
      temperature: 0.3,
      maxTokens: 1200,
      topP: 0.9,
      tone: "concise",
    },
    assignedInboxIds: ["inbox-email"],
    isActive: false,
  },
  {
    id: "agent-4",
    name: "Wellness Coach",
    systemPrompt:
      "You are a motivational wellness coach AI. Be encouraging, positive, and provide general fitness tips. Always remind users to consult with trainers for specific workout plans.",
    parameters: {
      model: "claude-3.5-sonnet",
      temperature: 0.8,
      maxTokens: 800,
      topP: 1,
      tone: "playful",
    },
    assignedInboxIds: ["inbox-whatsapp"],
    isActive: true,
  },
];

export const MOCK_INBOXES: Inbox[] = [
  { id: "inbox-chat", name: "Website Chat" },
  { id: "inbox-sms", name: "SMS" },
  { id: "inbox-email", name: "Email" },
  { id: "inbox-facebook", name: "Facebook Messenger" },
  { id: "inbox-whatsapp", name: "WhatsApp" },
];
