import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { normalizeProgramDrafts, parseProgramImportFile } from "@/libs/ai/ProgramImport";
import { programSessions, programs, staffsLocations } from "@subtrees/schemas";
import { and, eq, inArray } from "drizzle-orm";

function isUploadFile(value: unknown): value is File {
    return value instanceof File;
}

export const xPrograms = new Elysia({ prefix: "/programs" })
    .post("/import/parse", async ({ request, status }) => {
        const form = await request.formData();
        const file = form.get("file");

        if (!isUploadFile(file)) {
            return status(400, { error: "Upload an image or PDF" });
        }

        if (!(file.type.startsWith("image/") || file.type === "application/pdf")) {
            return status(400, { error: "Only image and PDF uploads are supported" });
        }

        try {
            return status(200, { programs: await parseProgramImportFile(file) });
        } catch (error) {
            console.error("Program import parse failed", error);
            return status(500, { error: error instanceof Error ? error.message : "Could not parse programs" });
        }
    }, { parse: "none" })
    .post("/import", async ({ params, body, status }) => {
        const { lid } = params as { lid: string };

        try {
            const drafts = normalizeProgramDrafts(body.programs);

            if (drafts.length === 0) {
                return status(400, { error: "No programs to import" });
            }
            const oneOnOne = drafts.filter((draft) => draft.sessionMode === "one_on_one");
            if (oneOnOne.some((draft) => !draft.instructorId || draft.instructorId === "null")) {
                return status(400, { error: "Choose an instructor for every 1-on-1 program" });
            }
            const staffIds = [...new Set(oneOnOne.flatMap((draft) => draft.instructorId ? [draft.instructorId] : []))];
            if (staffIds.length > 0) {
                const assigned = await db.select({ id: staffsLocations.staffId }).from(staffsLocations)
                    .where(and(eq(staffsLocations.locationId, lid), inArray(staffsLocations.staffId, staffIds)));
                if (assigned.length !== staffIds.length) {
                    return status(400, { error: "Choose instructors assigned to this location" });
                }
            }
            const created = await db.transaction(async (tx) => {
                const programRows = await tx.insert(programs).values(drafts.map((draft) => ({
                    locationId: lid,
                    name: draft.name,
                    description: draft.description,
                    capacity: draft.capacity,
                    minAge: draft.minAge,
                    maxAge: draft.maxAge,
                    sessionMode: draft.sessionMode,
                    ...(draft.sessionMode === "one_on_one" ? { instructorId: draft.instructorId } : {}),
                    allowWaitlist: false,
                    waitlistCapacity: 0,
                    allowMakeUpClass: false,
                    cancelationThreshold: 0,
                }))).returning({ id: programs.id, name: programs.name });

                if (programRows.length !== drafts.length) {
                    throw new Error("Programs were not created");
                }

                const sessionRows = programRows.flatMap((program, index) =>
                    drafts[index]!.sessions.map((session) => ({
                        programId: program.id,
                        day: session.day,
                        time: session.time,
                        duration: session.duration,
                        ...(drafts[index]!.sessionMode === "one_on_one" ? { staffId: drafts[index]!.instructorId } : {}),
                    }))
                );

                if (sessionRows.length > 0) {
                    await tx.insert(programSessions).values(sessionRows);
                }

                return programRows;
            });

            return status(201, { programs: created });
        } catch (error) {
            console.error("Program import create failed", error);
            return status(500, { error: error instanceof Error ? error.message : "Could not import programs" });
        }
    }, {
        body: t.Object({ programs: t.Array(t.Unknown()) }),
    });
