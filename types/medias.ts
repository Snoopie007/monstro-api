import { media } from "@subtrees/schemas";

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;

export type MediaFile = {
    uri: string;
    type: 'string';
    name: string | null;
    size?: number;
    duration?: number;
    width?: number;
    height?: number;
}