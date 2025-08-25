import { z } from "zod";

export const AIPersonaSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be less than 50 characters"),
  personality: z
    .array(z.string())
    .min(1, "At least one personality trait is required"),
  image: z.string().url("Please select an avatar"),
  responseDetails: z
    .string()
    .min(1, "Response style is required")
    .max(500, "Response style must be less than 500 characters"),
});

export type AIPersonaFormData = z.infer<typeof AIPersonaSchema>;

export const AIPersonalities = [
  "professional",
  "friendly",
  "informative",
  "funny",
  "serious",
  "casual",
  "formal",
  "sarcastic",
  "helpful",
  "confident",
  "humble",
  "bold",
  "shy",
  "enthusiastic",
  "calm",
  "energetic",
  "patient",
  "witty",
];

export const AIPersonaImages = [
  "https://randomuser.me/api/portraits/lego/1.jpg",
  "https://randomuser.me/api/portraits/lego/2.jpg",
  "https://randomuser.me/api/portraits/lego/3.jpg",
  "https://randomuser.me/api/portraits/lego/4.jpg",
  "https://randomuser.me/api/portraits/lego/5.jpg",
  "https://randomuser.me/api/portraits/lego/6.jpg",
  "https://randomuser.me/api/portraits/lego/7.jpg",
  "https://randomuser.me/api/portraits/lego/8.jpg",
];
