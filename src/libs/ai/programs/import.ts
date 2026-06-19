import { HumanMessage, SystemMessage, type MessageContent } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

export const ProgramDraftSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional().default("Imported program"),
    capacity: z.number().int().min(1).default(10),
    minAge: z.number().int().min(0).default(3),
    maxAge: z.number().int().min(1).default(18),
    sessions: z.array(z.object({
        day: z.number().int().min(1).max(7),
        time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).default("12:00"),
        duration: z.number().int().min(1).default(30),
    })).min(1).default([{ day: 1, time: "12:00", duration: 30 }]),
}).strip();

const ProgramImportSchema = z.object({
    programs: z.array(ProgramDraftSchema),
});
export type ProgramDraft = z.infer<typeof ProgramDraftSchema>;

export function normalizeProgramDrafts(input: unknown): ProgramDraft[] {
    const parsed = ProgramImportSchema.parse({ programs: Array.isArray(input) ? input : [] });
    return parsed.programs.map((program) => ({
        ...program,
        name: program.name.trim(),
        description: program.description?.trim() || "Imported program",
        capacity: Math.min(200, Math.max(1, Math.trunc(program.capacity || 10))),
        minAge: Math.max(2, Math.trunc(program.minAge || 3)),
        maxAge: Math.max(Math.trunc(program.minAge || 3) + 1, 3, Math.trunc(program.maxAge || 18)),
        sessions: Array.from(new Map(program.sessions.map((session) => {
            const normalized = {
                day: Math.min(7, Math.max(1, Math.trunc(session.day || 1))),
                time: session.time.length === 5 ? `${session.time}:00` : session.time,
                duration: Math.max(1, Math.trunc(session.duration || 30)),
            };

            return [`${normalized.day}-${normalized.time}-${normalized.duration}`, normalized] as const;
        })).values()),
    }));
}

export async function parseProgramImportFile(file: File): Promise<ProgramDraft[]> {
    const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
    // ponytail: LangChain's standard file block maps to Chat Completions `file`; Responses needs provider-native `input_file`.
    const content: MessageContent = [
        { type: "input_text", text: "Extract class/program offerings from this vendor document. Return only programs with name, description, capacity, minAge, maxAge, and weekly sessions. Days are 1=Monday through 7=Sunday. Times must be 24-hour HH:MM:SS." },
        file.type.startsWith("image/")
            ? { type: "input_image", image_url: `data:${file.type};base64,${bytes}` }
            : { type: "input_file", filename: file.name || "program-import.pdf", file_data: `data:${file.type};base64,${bytes}` },
    ] as unknown as MessageContent;

    const model = new ChatOpenAI({
        model: process.env.PROGRAM_IMPORT_MODEL || "gpt-5.4",
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 2,
        useResponsesApi: true,
    });

    const result = await model.withStructuredOutput(ProgramImportSchema, { name: "program_import" }).invoke([
        new SystemMessage("You import youth activity program schedules into Monstro. Prefer empty-safe practical defaults over guessing impossible details."),
        new HumanMessage({ content }),
    ]);

    return normalizeProgramDrafts(result.programs);
}
