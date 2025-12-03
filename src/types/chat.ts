import { messages } from "@/db/schemas";
import type { Media } from "./medias";

export type Message = typeof messages.$inferSelect & {
    medias: Media[];
}