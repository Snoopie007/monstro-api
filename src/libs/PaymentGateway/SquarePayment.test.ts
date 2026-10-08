import { expect, mock, test } from "bun:test";
import { Currency } from "square";
import { SquarePaymentGateway } from "./SquarePayment";

test("Square refunds do not refund Monstro's application fee", async () => {
	const refundPayment = mock(async () => ({ refund: { id: "refund-1" } }));
	const gateway = new SquarePaymentGateway("test-token");
	Object.defineProperty(gateway, "_client", {
		value: { refunds: { refundPayment } },
	});

	await gateway.refundPayment("payment-1", 500, "Requested by vendor");

	expect(refundPayment).toHaveBeenCalledWith(expect.objectContaining({
		paymentId: "payment-1",
		amountMoney: { amount: BigInt(500), currency: Currency.Usd },
		appFeeMoney: { amount: BigInt(0), currency: Currency.Usd },
	}));
});
