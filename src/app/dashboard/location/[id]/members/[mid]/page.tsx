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
import type { Member, MemberLocation } from "@/types";
import { sql } from "drizzle-orm";
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
	MemberAttendanceGraph
} from "./components";
import { MemberProvider } from "./providers/MemberContext";
import { notFound } from "next/navigation";



type PromiseReturnType = {
	member: Member;
	ml: MemberLocation;
};


async function fetchMemberLocationData(id: string, mid: string): Promise<PromiseReturnType | null> {
	if (!id || !mid) {
		return null;
	}

	try {
		const ml = await db.query.memberLocations.findFirst({
			where: (ml, { eq, and }) => and(eq(ml.memberId, mid), eq(ml.locationId, id)),
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
			return null;
		}

		const fmids = ml.member.familyMembers?.map((fm) => fm.relatedMemberId) || [];

		const knownFamilyMemberIds = await db.query.memberLocations.findMany({
			where: (ml, { inArray, eq, and }) => and(inArray(ml.memberId, fmids), eq(ml.locationId, id)),
			columns: {
				memberId: true,
			},
		});

		const filteredFamilyMembers = ml.member.familyMembers?.filter((fm) => {
			return !knownFamilyMemberIds.find((kmnl) => kmnl.memberId === fm.memberId);
		});

		const { member, ...rest } = ml;
		return {
			member,
			ml: { ...rest, knownFamilyMembers: filteredFamilyMembers },
		};
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

	if (!res || !res.member || !res.ml) {
		return notFound();
	}

	const { member, ml } = res;

	let paymentMethods: Stripe.PaymentMethod[] = [];
	if (member.stripeCustomerId) {
		paymentMethods = await fetchStripePaymentMethods(member.stripeCustomerId);
	}

	return (
		<TooltipProvider>
			<MemberProvider member={member} ml={ml} paymentMethods={paymentMethods}>
				<div className="flex flex-row gap-2 p-2 h-[calc(100vh-45px)] overflow-hidden">
					<div className="w-1/3 space-y-2 min-w-0 flex flex-col h-full">
						<MemberProfile params={params} />
						<PointsProfile />
						<ScrollArea className="h-full overflow-hidden">
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
					<div className="w-2/4 min-w-0 flex flex-col h-full">
						<MemberChatView />
					</div>

					<div className="w-1/3  min-w-0 h-full">
						<ScrollArea className="h-full overflow-hidden">
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
