import axios, { AxiosError } from 'axios';
import { Buffer } from 'buffer';
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { integrations } from "@/db/schemas";
import { Integration } from "@/types";
import { AdminIntegration } from "@/types/admin";

const QB_BASE_URL = process.env.QUICKBOOKS_ENVIRONMENT === 'production'
	? 'https://quickbooks.api.intuit.com'
	: 'https://sandbox-quickbooks.api.intuit.com';

interface TokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
	x_refresh_token_expires_in: number;
}

interface ErrorResponse {
	error: string;
	error_description: string;
}

interface PaymentRequest {
	amount: number;
	currency: string;
	card: {
		name: string;
		number: string;
		address?: {
			streetAddress: string;
			city: string;
			region: string;
			country: string;
			postalCode: string;
		};
		expMonth: string;
		expYear: string;
		cvc: string;
	};
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

export async function exchangeCodeForToken(
	code: string,
	redirectUri: string,
	realmId?: string
): Promise<TokenResponse & { realmId?: string }> {
	try {
		const response = await axios.post<TokenResponse>(
			'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
			new URLSearchParams({
				grant_type: 'authorization_code',
				code,
				redirect_uri: redirectUri,
			}).toString(),
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': `Basic ${Buffer.from(
						`${process.env.NEXT_PUBLIC_QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
					).toString('base64')}`,
				},
			}
		);

		return { ...response.data, realmId };
	} catch (error) {
		const err = error as AxiosError<ErrorResponse>;
		console.error('[QuickBooks Token Exchange Error]', err.response?.data || err.message);
		throw new Error('Failed to exchange code for tokens');
	}
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
	try {
		const response = await axios.post<TokenResponse>(
			'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
			new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token: refreshToken,
			}).toString(),
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': `Basic ${Buffer.from(
						`${process.env.NEXT_PUBLIC_QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
					).toString('base64')}`,
				},
			}
		);

		await db.update(integrations).set({
			accessToken: response.data.access_token,
			refreshToken: response.data.refresh_token,
			expires: Date.now() + (response.data.expires_in * 1000),
			...(realmId && { integrationId: realmId })
		}).where(eq(integrations.service, "quickbooks"));

		return response.data;
	} catch (error) {
		const err = error as AxiosError<ErrorResponse>;
		console.error('[QuickBooks Refresh Error]', err.response?.data || err.message);
		throw new Error('TOKEN_REFRESH_FAILED');
	}
}

export async function makePayment(
	accessToken: string,
	realmId: string,
	paymentData: PaymentRequest
): Promise<PaymentResponse> {
	try {
		const response = await axios.post<PaymentResponse>(
			`${QB_BASE_URL}/quickbooks/v4/payments/charges`,
			paymentData,
			{
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Request-Id': crypto.randomUUID(),
					'Content-Type': 'application/json',
				}
			}
		);
		return response.data;
	} catch (error) {
		const err = error as AxiosError<ErrorResponse>;
		console.error('[QuickBooks Payment Error]', {
			error: err.response?.data || err.message,
			paymentData
		});
		throw new Error('PAYMENT_FAILED');
	}
}

export async function revokeToken(token: string): Promise<boolean> {
	try {
		await axios.post(
			'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
			new URLSearchParams({ token }).toString(),
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': `Basic ${Buffer.from(
						`${process.env.NEXT_PUBLIC_QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
					).toString('base64')}`,
				},
			}
		);

		await db.update(integrations).set({
			accessToken: null,
			refreshToken: null,
			expires: null,
		}).where(eq(integrations.service, "quickbooks"));

		return true;
	} catch (error) {
		const err = error as AxiosError<ErrorResponse>;
		console.error('[QuickBooks Revoke Error]', err.response?.data || err.message);
		throw new Error('REVOKE_FAILED');
	}
}

export async function getAccessToken(integration: Integration | AdminIntegration): Promise<string> {
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
		'integrationId' in integration ? integration.integrationId : undefined
	);
	return tokens.access_token;
}

export const vendorQuickBooks = {
	getAccessToken,
	makePayment,
	exchangeCodeForToken
};

export const adminQuickBooks = {
	getAccessToken,
	revokeToken
};