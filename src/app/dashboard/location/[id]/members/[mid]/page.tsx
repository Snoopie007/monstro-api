import {
	ScrollArea,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	TooltipProvider,
} from "@/components/ui";
import { db } from "@/db/db";
import { hasPermission } from "@/libs/server/permissions";
import { MemberStripePayments } from "@/libs/server/stripe";
import type {  Member, MemberLocation } from "@/types";
import { format } from "date-fns";
import { and, sql } from "drizzle-orm";
import type Stripe from "stripe";
import {
	CustomFieldsBox,
	MemberAchievements,
	MemberChatView,
	MemberInvoices,
	MemberPkg,
	MemberProfile,
	MemberRewards,
	MemberSubs,
	MemberTagsBox,
	MemberTransactions,
	PaymentMethods,
	PointsProfile,
} from "./components";
import { MemberAttendanceGraph } from "./components/MemberAttendance/MemberAttendanceGraph";
import { MemberProvider } from "./providers/MemberContext";

type PromiseReturnType = {
	member: Member | undefined;
	ml: (MemberLocation & { totalPointsEarned: number, lastCheckInTime: Date | null }) | undefined;
};


async function fetchMemberLocationData(
	id: string,
	mid: string,
): Promise<PromiseReturnType | null> {
	if (!id || !mid) {
		return null;
	}

	try {
		const ml = await db.query.memberLocations.findFirst({
			where: (ml, { eq }) => and(eq(ml.memberId, mid), eq(ml.locationId, id)),
			with: {
				member: {
					with: {
						familyMembers: {
							with: {
								relatedMember: true,
							},
						},
						subscriptions: {
							where: (ms, { eq }) => eq(ms.locationId, id),
							with: {
								plan: true,
							},
						},
					},
				},
				attendances: {
					orderBy: (attendances, { desc }) => desc(attendances.checkInTime),
					limit: 1,
				}
			},
			extras: {
				totalPointsEarned: sql<number>`
                COALESCE(
                    (SELECT SUM("points")
                     FROM "member_points_history"
                     WHERE "member_id" = ${mid}
                       AND "location_id" = ${id}
                       AND "removed" = false),
                    0
                )
            `.as("totalPointsEarned"),
			},
		});

		if (!ml) {
			throw new Error("Member not found");
		}

		const { member, totalPointsEarned, ...rest } = ml;

		return { member, ml: { ...rest, totalPointsEarned, lastCheckInTime: ml.attendances?.[0]?.checkInTime || null } };
	} catch (error) {
		console.log("error", error);
		return null;
	}
}

async function fetchStripePaymentMethods(
	customerId: string,
): Promise<Stripe.PaymentMethod[]> {
	try {
		const stripe = new MemberStripePayments();
		const paymentMethods = await stripe.getPaymentMethods(customerId, 25);
		return paymentMethods.data;
	} catch (error) {
		console.log("error", error);
		return [];
	}
}

export default async function MemberProfilePage(props: {
	params: Promise<{ id: string; mid: string }>;
}) {
	const params = await props.params;
	const canEditMember = await hasPermission("edit member", params.id);

	const res = await fetchMemberLocationData(params.id, params.mid);
	let paymentMethods: Stripe.PaymentMethod[] = [];
	if (!res || !res.member || !res.ml) {
		return <div>Member not found</div>;
	}

	const { member, ml } = res;
	if (member.stripeCustomerId) {
		paymentMethods = await fetchStripePaymentMethods(member.stripeCustomerId);
	}

	return (
		<TooltipProvider>
			<MemberProvider member={member} ml={ml} paymentMethods={paymentMethods}>
				<div className="grid grid-cols-7 flex-1 gap-2 p-2 h-full">
					<div className="col-span-2 flex flex-col space-y-2 h-full">
						<MemberProfile params={params} pd={ml.lastCheckInTime ? { lastSeenFormatted: format(ml.lastCheckInTime, 'MMM d, yyyy hh:mm a') } : { lastSeenFormatted: "Never" }} />
						<PointsProfile
							profileData={{ totalPointsEarned: ml.totalPointsEarned }}
						/>
						<ScrollArea className="h-[calc(100vh-318px)] overflow-hidden">
							<div className="space-y-4 ">
								<MemberAttendanceGraph params={params} />

								<MemberTagsBox editable={canEditMember} params={params} />
								<CustomFieldsBox
									memberId={params.mid}
									locationId={params.id}
									editable={canEditMember}
									variant="card"
									showEmptyFields={true}
								/>
							</div>
						</ScrollArea>
					</div>
					<div className="col-span-3 flex flex-col h-full">
						<MemberChatView />
					</div>

					<div className="col-span-2 h-full">
						<ScrollArea className="flex-1 h-full  overflow-hidden">
							<div className="space-y-4 pb-10">
								<Tabs
									defaultValue="subscriptions"
									className="flex-1 flex flex-col min-h-0"
								>
									<TabsList className="bg-transparent rounded-none p-0 justify-start gap-1 flex-shrink-0">
										{["subscriptions", "packages"].map((tab) => (
											<TabsTrigger
												key={tab}
												value={tab}
												className="bg-foreground/5 text-xs capitalize rounded-full"
											>
												{tab}
											</TabsTrigger>
										))}
									</TabsList>
									<TabsContent value="subscriptions">
										<MemberSubs params={params} />
									</TabsContent>
									<TabsContent value="packages">
										<MemberPkg params={params} />
									</TabsContent>
								</Tabs>

								<Tabs
									defaultValue="payments methods"
									className="flex-1 flex flex-col min-h-0"
								>
									<TabsList className="bg-transparent rounded-none p-0 justify-start gap-1 flex-shrink-0">
										{[
											"payments methods",
											"invoices",
											"transactions",
											"rewards",
											"achievements",
										].map((tab) => (
											<TabsTrigger
												key={tab}
												value={tab}
												className="bg-foreground/5 text-xs capitalize rounded-full"
											>
												{tab}
											</TabsTrigger>
										))}
									</TabsList>
									<TabsContent value="payments methods">
										<PaymentMethods editable={canEditMember} params={params} />
									</TabsContent>
									<TabsContent value="invoices">
										<MemberInvoices params={params} />
									</TabsContent>
									<TabsContent value="transactions">
										<MemberTransactions params={params} />
									</TabsContent>
									<TabsContent value="rewards">
										<MemberRewards params={params} />
									</TabsContent>
									<TabsContent value="achievements">
										<MemberAchievements params={params} />
									</TabsContent>
								</Tabs>
							</div>
						</ScrollArea>
					</div>
				</div>
			</MemberProvider>
		</TooltipProvider>
	);
}
