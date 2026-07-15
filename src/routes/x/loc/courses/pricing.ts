import type { CourseStatus } from "@subtrees/schemas";

export type CoursePricingState = { status: CourseStatus; paid: boolean; price: number };
export type CoursePricingInput = Partial<CoursePricingState>;

export function coursePricingFields(input: CoursePricingInput, current?: CoursePricingState) {
	if (input.price !== undefined && !Number.isInteger(input.price)) return { error: "Course price must be whole cents" as const };
	if (input.price !== undefined && input.price < 0) return { error: "Course price must be zero or greater" as const };
	const status = input.status ?? current?.status ?? "draft";
	const paid = input.paid ?? current?.paid ?? false;
	const price = paid ? (input.price ?? current?.price ?? 0) : 0;
	if (status === "published" && paid && price <= 0) return { error: "Paid courses must have a price greater than zero before publishing" as const };
	return { status, paid, price };
}
