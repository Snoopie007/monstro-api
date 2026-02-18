
import { Buffer } from 'buffer';
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { integrations } from "@subtrees/schemas";
import { Integration } from "@subtrees/types";

const QB_BASE_URL = process.env.QUICKBOOKS_ENVIRONMENT === 'production'
	? 'https://quickbooks.api.intuit.com'
	: 'https://sandbox-quickbooks.api.intuit.com';

const QB_OAUTH_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

interface TokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
	x_refresh_token_expires_in: number;
}


interface PaymentCard {
	name: string;
	number: string;
	expMonth: string;
	expYear: string;
	cvc: string;
	address?: {
		streetAddress: string;
		city: string;
		region: string;
		country: string;
		postalCode: string;
	};
}

interface PaymentRequest {
	amount: number;
	currency: string;
	card: PaymentCard;
	context?: {
		mobile?: boolean;
		isEcommerce?: boolean;
	};
}

interface PaymentResponse {
	id: string;
	status: string;
	authCode: string;
}

export interface QuickbooksSettings {
	apiKey: string | null;
	secretKey: string | null;
	accessToken: string | null;
	refreshToken: string | null;
	integrationId: string;
	settings: {
		realmId?: string;
	};
}

const getAuthHeader = () => {
	const credentials = `${process.env.NEXT_PUBLIC_QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`;
	return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

const handleQuickbooksError = async (response: Response, context: string) => {
	const data = await response.json();
	console.error(`[QuickBooks ${context} Error]`, data || response.statusText);
	throw new Error(`${context.toUpperCase().replace(/\s+/g, '_')}_FAILED`);
};

export async function exchangeCodeForToken(
	code: string,
	redirectUri: string,
	realmId?: string
): Promise<TokenResponse & { realmId?: string }> {
	const response = await fetch(QB_OAUTH_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Authorization': getAuthHeader(),
		},
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri,
		}).toString()
	});

	if (!response.ok) {
		await handleQuickbooksError(response, 'Token Exchange');
	}

	const data = await response.json();
	return { ...data, realmId };
}

export function getQuickbooksSettings(token: TokenResponse & { realmId?: string }): QuickbooksSettings {
	return {
		apiKey: null,
		secretKey: null,
		accessToken: token.access_token,
		refreshToken: token.refresh_token,
		integrationId: token.realmId || '',
		settings: {
			realmId: token.realmId
		}
	};
}

export async function refreshTokens(refreshToken: string, realmId?: string): Promise<TokenResponse> {
	const response = await fetch(QB_OAUTH_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Authorization': getAuthHeader(),
		},
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
		}).toString()
	});

	if (!response.ok) {
		await handleQuickbooksError(response, 'Refresh');
	}

	const data = await response.json();
	const expiryTime = Date.now() + (data.expires_in * 1000);

	await db.update(integrations)
		.set({
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			expires: expiryTime,
			...(realmId && { integrationId: realmId })
		})
		.where(eq(integrations.service, "quickbooks"));

	return data;
}

export async function makePayment(
	accessToken: string,
	realmId: string,
	paymentData: PaymentRequest
): Promise<PaymentResponse> {
	const response = await fetch(`${QB_BASE_URL}/quickbooks/v4/payments/charges`, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'Request-Id': crypto.randomUUID(),
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(paymentData)
	});

	if (!response.ok) {
		const data = await response.json();
		console.error('[QuickBooks Payment Error]', {
			error: data || response.statusText,
			paymentData
		});
		throw new Error('PAYMENT_FAILED');
	}

	return response.json();
}

export async function revokeToken(token: string): Promise<boolean> {
	const response = await fetch('https://developer.api.intuit.com/v2/oauth2/tokens/revoke', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Authorization': getAuthHeader(),
		},
		body: new URLSearchParams({ token }).toString()
	});

	if (!response.ok) {
		await handleQuickbooksError(response, 'Revoke');
	}

	await db.update(integrations)
		.set({
			accessToken: null,
			refreshToken: null,
			expires: null,
		})
		.where(eq(integrations.service, "quickbooks"));

	return true;
}

export async function getAccessToken(integration: Integration): Promise<string> {
	const currentTime = Date.now();
	const isExpired = integration.expires ? currentTime > integration.expires : true;

	if (integration.accessToken && !isExpired) {
		return integration.accessToken;
	}

	if (!integration.refreshToken) {
		throw new Error("NO_REFRESH_TOKEN");
	}

	const tokens = await refreshTokens(
		integration.refreshToken,
		'integrationId' in integration ? (integration.integrationId as string) : undefined
	);
	return tokens.access_token;
}

export const vendorQuickBooks = {
	getAccessToken,
	makePayment,
	exchangeCodeForToken
} as const;

export const adminQuickBooks = {
	getAccessToken,
	revokeToken
} as const;