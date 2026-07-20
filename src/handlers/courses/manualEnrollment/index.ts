import { createHash } from "node:crypto";

import type { db } from "@/db/db";
import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { calculateGatewayFeeAmount } from "@/utils";
import { handleSquareError, handleStripeError } from "@/utils/paymentErrors";
import { MemberCourseEnrollmentError } from "./shared";
import type { MemberCourseEnrollmentBody } from "./shared";
import { courseEnrollments, courses, integrations, locationState, memberLocations, taxRates, transactions } from "@subtrees/schemas";
import { and, eq, sql } from "drizzle-orm";
import { SquareError } from "square";
import Stripe from "stripe";



export type GatewayFactory = {
	stripe(accessToken: string): StripePaymentGateway;
	square(accessToken: string): SquarePaymentGateway;
};

const defaultGateways: GatewayFactory = {
	stripe: (accessToken) => new StripePaymentGateway(accessToken),
	square: (accessToken) => new SquarePaymentGateway(accessToken),
};

const duplicateCourseEnrollmentMessage = "Member is already enrolled in this course";

function hash24(value: string) {
	return createHash("sha256").update(value).digest("hex").slice(0, 24);
}




export async function courseEnrollmentTransaction<T>(database: typeof db, run: (tx: typeof db) => Promise<T>) {
	try {
		return await database.transaction(run as never);
	} catch (error) {
		if (
			error !== null
			&& typeof error === "object"
			&& "code" in error
			&& error.code === "23505"
			&& "constraint" in error
			&& error.constraint === "course_enrollments_course_member_unique"
		) {
			throw new MemberCourseEnrollmentError(409, duplicateCourseEnrollmentMessage, "DUPLICATE_ENROLLMENT");
		}
		throw error;
	}
}

export async function enrollMemberInCourseCore(input: {
	tx: typeof db;
	lid: string;
	courseId: string;
	memberId: string;
	body: MemberCourseEnrollmentBody;
	gateways?: GatewayFactory;
}) {
	const gateways = input.gateways ?? defaultGateways;
	const tx = input.tx;
	await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${input.lid}:${input.courseId}:${input.memberId}`}))`);

	const course = await tx.query.courses.findFirst({
		where: and(eq(courses.id, input.courseId), eq(courses.locationId, input.lid)),
		columns: { id: true, title: true, status: true, price: true },
	});
	if (!course) throw new MemberCourseEnrollmentError(404, "Course not found", "COURSE_NOT_FOUND");
	if (course.status !== "published") throw new MemberCourseEnrollmentError(400, "Course must be published to enroll", "COURSE_NOT_PUBLISHED");

	const memberLocation = await tx.query.memberLocations.findFirst({
		where: and(eq(memberLocations.memberId, input.memberId), eq(memberLocations.locationId, input.lid)),
		columns: { memberId: true, gatewayCustomerId: true },
	});
	if (!memberLocation) throw new MemberCourseEnrollmentError(404, "Member not found for this location", "MEMBER_NOT_FOUND");

	const duplicate = await tx.query.courseEnrollments.findFirst({
		where: and(eq(courseEnrollments.courseId, input.courseId), eq(courseEnrollments.memberId, input.memberId)),
		columns: { id: true, transactionId: true },
	});
	if (duplicate) throw new MemberCourseEnrollmentError(409, duplicateCourseEnrollmentMessage, "DUPLICATE_ENROLLMENT");

	const enrollmentId = `cen_${hash24(`${input.lid}:${input.courseId}:${input.memberId}`)}`;
	if (course.price === 0) {
		await tx.insert(courseEnrollments).values({
			id: enrollmentId,
			courseId: input.courseId,
			memberId: input.memberId,
			locationId: input.lid,
			transactionId: null,
		});
		return { id: enrollmentId, transactionId: null };
	}
	const price = course.price;
	if (!input.body.paymentMethodId) throw new MemberCourseEnrollmentError(400, "paymentMethodId is required for courses with a price", "PAYMENT_METHOD_REQUIRED");
	const checkoutAttemptId = input.body.attemptId;
	if (!checkoutAttemptId) throw new MemberCourseEnrollmentError(400, "attemptId is required for courses with a price", "PAYMENT_ATTEMPT_REQUIRED");
	if (!memberLocation.gatewayCustomerId) throw new MemberCourseEnrollmentError(400, "No gateway customer found for this location", "NO_GATEWAY_CUSTOMER");

	const state = await tx.query.locationState.findFirst({
		where: eq(locationState.locationId, input.lid),
		columns: { paymentGatewayId: true, currency: true, settings: true, usagePercent: true },
	});
	if (!state?.paymentGatewayId) throw new MemberCourseEnrollmentError(400, "No payment gateway set for this location", "NO_PAYMENT_GATEWAY");
	const gateway = await tx.query.integrations.findFirst({
		where: eq(integrations.id, state.paymentGatewayId),
		columns: { service: true, accessToken: true, metadata: true },
	});
	const gatewayAccessToken = gateway?.accessToken;
	if (!gatewayAccessToken) throw new MemberCourseEnrollmentError(400, "No payment gateway found for this location", "NO_PAYMENT_GATEWAY");

	const [defaultTaxRate] = await tx.query.taxRates.findMany({
		where: and(eq(taxRates.locationId, input.lid), eq(taxRates.isDefault, true)),
		columns: { percentage: true },
		limit: 1,
	});
	const subtotal = price;
	const tax = Math.floor((subtotal * (defaultTaxRate?.percentage ?? 0)) / 100);
	let total = subtotal + tax;
	let processingFee = 0;
	let feesAmount = 0;
	if (state.settings?.passOnFees) {
		processingFee = calculateGatewayFeeAmount(subtotal, "card", false);
		total += processingFee;
	}
	if (state.usagePercent > 0) {
		feesAmount = Math.floor((subtotal * state.usagePercent) / 100);
		total += feesAmount;
	}

	const paymentType = "card";
	const transactionId = `txn_${hash24(enrollmentId)}`;
	const idempotencyKey = `course-enrollment:${hash24(`${input.lid}:${input.courseId}:${input.memberId}:${checkoutAttemptId}`)}`;
	const paymentIntentId = await chargeCourse({
		gateways,
		gateway: { ...gateway, accessToken: gatewayAccessToken },
		gatewayCustomerId: memberLocation.gatewayCustomerId,
		paymentMethodId: input.body.paymentMethodId,
		idempotencyKey,
		lid: input.lid,
		memberId: input.memberId,
		courseId: input.courseId,
		enrollmentId,
		courseTitle: course.title,
		total,
		feesAmount,
		currency: state.currency,
	});

	await tx.insert(transactions).values({
		id: transactionId,
		description: `Payment for course enrollment - ${course.title}`,
		total,
		subTotal: subtotal,
		tax,
		type: "inbound",
		status: "paid",
		locationId: input.lid,
		memberId: input.memberId,
		paymentMethodId: input.body.paymentMethodId,
		paymentIntentId,
		paymentType,
		chargeDate: new Date(),
		feeAmount: feesAmount + processingFee,
		currency: state.currency,
		metadata: {
			gatewayService: gateway.service,
			courseId: input.courseId,
			courseTitle: course.title,
			coursePrice: price,
			enrollmentId,
			idempotencyKey,
			checkoutAttemptId,
			subtotal,
			tax,
			processingFee,
			platformFee: feesAmount,
			total,
			currency: state.currency,
		},
	});
	await tx.insert(courseEnrollments).values({
		id: enrollmentId,
		courseId: input.courseId,
		memberId: input.memberId,
		locationId: input.lid,
		transactionId,
	});
	return { id: enrollmentId, transactionId };
}

async function chargeCourse(input: {
	gateways: GatewayFactory;
	gateway: { service: string; accessToken: string; metadata: { squareLocationId?: string } | null };
	gatewayCustomerId: string;
	paymentMethodId: string;
	idempotencyKey: string;
	lid: string;
	memberId: string;
	courseId: string;
	enrollmentId: string;
	courseTitle: string;
	total: number;
	feesAmount: number;
	currency: string;
}) {
	try {
		if (input.gateway.service === "stripe") {
			const stripe = input.gateways.stripe(input.gateway.accessToken);
			await stripe.retrievePaymentMethod(input.gatewayCustomerId, input.paymentMethodId);
			const payment = await stripe.createChargeWithoutLineItems(input.gatewayCustomerId, input.paymentMethodId, {
				total: input.total,
				feesAmount: input.feesAmount,
				currency: input.currency as never,
				description: `Payment for course enrollment - ${input.courseTitle}`,
				idempotencyKey: input.idempotencyKey,
				metadata: {
					lid: input.lid,
					locationId: input.lid,
					memberId: input.memberId,
					courseId: input.courseId,
					enrollmentId: input.enrollmentId,
				},
			});
			if (payment.status !== "succeeded") throw new MemberCourseEnrollmentError(400, "Payment was not completed", "PAYMENT_INCOMPLETE");
			return payment.id;
		}
		if (input.gateway.service === "square") {
			const squareLocationId = input.gateway.metadata?.squareLocationId;
			if (typeof squareLocationId !== "string" || !squareLocationId) throw new MemberCourseEnrollmentError(400, "Square location ID not found", "NO_SQUARE_LOCATION");
			const square = input.gateways.square(input.gateway.accessToken);
			await square.retrieveCardForCustomer(input.gatewayCustomerId, input.paymentMethodId);
			const payment = await square.createCharge(input.gatewayCustomerId, input.paymentMethodId, {
				total: input.total,
				feesAmount: input.feesAmount,
				currency: input.currency as never,
				referenceId: input.enrollmentId,
				squareLocationId,
				idempotencyKey: input.idempotencyKey,
				note: `courseId:${input.courseId}|enrollmentId:${input.enrollmentId}|mid:${input.memberId}|lid:${input.lid}|pmid:${input.paymentMethodId}`,
			});
			if (!payment?.id) throw new MemberCourseEnrollmentError(400, "Payment was not created", "PAYMENT_NOT_CREATED");
			if ((payment.status || "").toUpperCase() !== "COMPLETED") throw new MemberCourseEnrollmentError(400, "Payment was not completed", "PAYMENT_INCOMPLETE");
			return payment.id;
		}
		throw new MemberCourseEnrollmentError(400, "No payment gateway configured for this location", "NO_PAYMENT_GATEWAY");
	} catch (error) {
		if (error instanceof MemberCourseEnrollmentError) throw error;
		if (error !== null && typeof error === "object" && "code" in error && error.code === "resource_missing") {
			throw new MemberCourseEnrollmentError(400, "Payment method does not belong to member", "PAYMENT_METHOD_INVALID");
		}
		const mapped = error instanceof Stripe.errors.StripeError
			? handleStripeError({ error })
			: error instanceof SquareError
				? handleSquareError(error)
				: { code: "UNKNOWN_ERROR", message: "unable to process payment" };
		throw new MemberCourseEnrollmentError(400, mapped.message, mapped.code);
	}
}
