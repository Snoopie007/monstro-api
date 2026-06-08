import { db } from "@/db/db";
import type { PaymentType } from "@subtrees/types";
import { orders, transactions } from "@subtrees/schemas";
import { eq } from "drizzle-orm";

interface HandleSquareOrderSuccessProps {
  orderId: string;
  locationId: string;
  memberId: string;
  paymentMethodId: string;
  paymentIntentId: string;
  paymentType: PaymentType;
  feeAmount: number;
  amount: number;
}

export async function handleSquareOrderSuccess({ orderId, locationId, memberId, paymentMethodId, paymentIntentId, paymentType, feeAmount, amount }: HandleSquareOrderSuccessProps) {
  const now = new Date();

  const [order] = await db.update(orders).set({
      status: "paid",
      updated: now,
  }).where(eq(orders.id, orderId)).returning();

  if (!order) {
      throw new Error("Order not found");
  }

  await db.insert(transactions).values({
      orderId: order.id,
      locationId,
      memberId,
      paymentMethodId,
      paymentIntentId,
      paymentType,
      feeAmount,
      total: amount,
      type: "inbound" as const,
      status: "paid" as const,
      metadata: {
        gatewayService: "square",
      },
  });
  ;
}
