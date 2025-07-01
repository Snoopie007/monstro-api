import {db} from "@/db/db";
import {memberInvoices, memberPackages, transactions} from "@/db/schemas";
import {getStripeCustomer} from "@/libs/server/stripe";
import {createPackage} from "../../utils";
import {NextRequest, NextResponse} from "next/server";
import {encodeId} from "@/libs/server/sqids";

type PackageProps = {
  id: number;
  mid: number;
};

export async function GET(
  req: NextRequest,
  props: {params: Promise<PackageProps>}
) {
  const params = await props.params;

  try {
    const packages = await db.query.memberPackages.findMany({
      where: (memberPackage, {eq, and}) =>
        and(
          eq(memberPackage.memberId, params.mid),
          eq(memberPackage.locationId, params.id)
        ),
      with: {
        plan: true,
      },
    });

    return NextResponse.json(packages, {status: 200});
  } catch (err) {
    console.log(err);
    return NextResponse.json({error: err}, {status: 500});
  }
}

export async function POST(
  req: NextRequest,
  props: {params: Promise<PackageProps>}
) {
  const params = await props.params;
  const {stripePaymentMethod, hasIncompletePlan, other, ...data} =
    await req.json();

  try {
    const plan = await db.query.memberPlans.findFirst({
      where: (memberPlan, {eq}) => eq(memberPlan.id, data.memberPlanId),
    });

    if (!plan) {
      return NextResponse.json(
        {error: "No valid plan not found"},
        {status: 404}
      );
    }

    const locationState = await db.query.locationState.findFirst({
      where: (locationState, {eq}) => eq(locationState.locationId, params.id),
    });

    if (!locationState) {
      return NextResponse.json(
        {error: "No valid location not found"},
        {status: 404}
      );
    }

    const tax = Math.floor(plan.price * (locationState.taxRate / 10000));
    const amount = plan.price + tax;

    let {newTransaction, newPkg, newInvoice} = createPackage(
      {
        ...data,
        memberId: params.mid,
        locationId: params.id,
      },
      plan,
      tax
    );

    let clientSecret: string | undefined;
    let md = {};

    if (data.paymentMethod === "card") {
      const stripe = await getStripeCustomer(params);
      const res = await stripe.createPaymentIntent(amount, {
        paymentMethod: stripePaymentMethod.id,
        currency: plan.currency,
        applicationFeePercent: locationState.usagePercent / 100,
        description: `One time payment for ${plan.name}`,
        metadata: {
          planId: plan.id,
          tax,
          startDate: newPkg.startDate,
          locationId: encodeId(params.id),
          memberId: params.mid,
        },
      });
      if (!res.clientSecret) {
        return NextResponse.json(
          {error: "Failed to create payment intent"},
          {status: 500}
        );
      }
      newTransaction.status = "paid";
      newTransaction.type = "inbound";
      newPkg.status = "active";
      newInvoice.status = "paid";
      const cardInfo =
        data.token?.card || data.stripePaymentMethod?.card || null;

      if (cardInfo) {
        md = {
          card: {brand: cardInfo.brand, last4: cardInfo.last4},
        };
      }
    }

    const newPackage = await db.transaction(async (tx) => {
      const stripePaymentId = clientSecret?.split("_secret_")[0];
      const [{mpid}] = await tx
        .insert(memberPackages)
        .values({
          ...newPkg,
          stripePaymentId,
          metadata: md,
        })
        .returning({mpid: memberPackages.id});
      /** Create Invoice */
      const [{iid}] = await tx
        .insert(memberInvoices)
        .values({
          ...newInvoice,
          memberPackageId: mpid,
        })
        .returning({iid: memberInvoices.id});
      /** Create Transaction */
      await tx.insert(transactions).values({
        ...newTransaction,
        invoiceId: iid,
        packageId: mpid,
        metadata: md,
      });
      return {id: mpid};
    });

    return NextResponse.json({id: newPackage.id}, {status: 200});
  } catch (err) {
    console.log(err);
    return NextResponse.json({error: err}, {status: 500});
  }
}
