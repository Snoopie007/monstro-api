import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

let paidInput: Record<string, unknown> | undefined;
const handleCourseEnrollPaid = mock(async (props: Record<string, unknown>) => {
    paidInput = props;
    return { id: "enrollment-1" };
});

class CourseEnrollError extends Error {
    constructor(readonly status: number, message: string) {
        super(message);
    }
}

mock.module("@/handlers/course", () => ({
    handleCourseEnrollPaid,
    handleCourseEnrollFree: mock(async () => ({ id: "enrollment-1" })),
    CourseEnrollError,
}));
mock.module("src/db/db", () => ({
    db: {
        query: {
            courses: {
                findFirst: mock(async () => ({ title: "Course", price: 25 })),
            },
        },
    },
}));

const { locationCoursesEnroll } = await import("./enroll");
const app = locationCoursesEnroll(new Elysia({ prefix: "/:lid" }) as never);

beforeEach(() => {
    paidInput = undefined;
    handleCourseEnrollPaid.mockClear();
});

test("accepts the legacy mobile paid course enrollment body", async () => {
    const response = await app.handle(new Request("http://localhost/location-1/courses/enroll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            mid: "member-1",
            courseId: "course-1",
            paymentMethodId: "payment-method-1",
            paymentType: "card",
        }),
    }));

    expect(response.status).toBe(200);
    expect(paidInput).toEqual({
        lid: "location-1",
        mid: "member-1",
        courseId: "course-1",
        paymentMethodId: "payment-method-1",
        paymentType: "card",
        courseTitle: "Course",
        coursePrice: 25,
        attemptId: expect.any(String),
    });
});
