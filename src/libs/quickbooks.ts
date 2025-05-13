// lib/quickbooks.ts
import axios, { AxiosError } from 'axios';
import { encode } from 'base-64';

const QB_BASE_URL = process.env.QUICKBOOKS_ENVIRONMENT === 'production' 
  ? 'https://quickbooks.api.intuit.com' 
  : 'https://sandbox-quickbooks.api.intuit.com';

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
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
          'Authorization': `Basic ${encode(
            `${process.env.NEXT_PUBLIC_QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
          )}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    const err = error as AxiosError<ErrorResponse>;
    console.error('Refresh token error:', err.response?.data || err.message);
    throw err;
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
    console.error('Payment error:', err.response?.data || err.message);
    throw err;
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
          'Authorization': `Basic ${encode(
            `${process.env.NEXT_PUBLIC_QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
          )}`,
        },
      }
    );
    return true;
  } catch (error) {
    const err = error as AxiosError<ErrorResponse>;
    console.error('Revoke token error:', err.response?.data || err.message);
    throw err;
  }
}