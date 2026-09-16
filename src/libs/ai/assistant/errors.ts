export function assistantBudgetError(code = "RESERVE_FAILED") {
	const errors: Record<string, { status: 402 | 409 | 503; message: string }> = {
		WALLET_NOT_FOUND: { status: 409, message: "This location does not have an AI wallet set up. Contact support to enable it." },
		INSUFFICIENT_FUNDS: { status: 402, message: "Your AI wallet has insufficient funds. Add funds before trying again." },
		RECHARGE_FAILED: { status: 402, message: "Your AI wallet could not be topped up. Check the payment method in your wallet settings." },
		RESERVE_EXCEEDS_THRESHOLD: { status: 402, message: "This request exceeds your AI wallet limit. Increase the limit or start a shorter conversation." },
	};
	return { ...(errors[code] || { status: 503 as const, message: "Unable to check your AI wallet right now. Please try again." }), code };
}
