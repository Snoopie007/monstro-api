import { expect, test } from "bun:test";
import { normalizeProgramDrafts } from "./import";

test("defaults invalid values extracted from incomplete program documents", () => {
    expect(normalizeProgramDrafts([{
        name: "Piano Lessons",
        description: "Lessons for ages 4.5 and up",
        capacity: 0,
        minAge: 4.5,
        maxAge: 0,
        sessions: [],
    }])).toEqual([{
        name: "Piano Lessons",
        description: "Lessons for ages 4.5 and up",
        capacity: 10,
        minAge: 3,
        maxAge: 18,
        sessions: [{ day: 1, time: "12:00:00", duration: 30 }],
    }]);
});
