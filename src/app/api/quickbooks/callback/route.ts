
import { NextResponse } from 'next/server';


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');
  const realmId = searchParams.get('realmId');

  if (oauthError) {
    return NextResponse.redirect(new URL(`/?error=${oauthError}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL(`/?error=missing_code`, req.url));
  }

  try {
    const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.NEXT_PUBLIC_QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.QUICKBOOKS_REDIRECT_URI!,
      }).toString(),
    });

    const data = await res.json();

    const { access_token, refresh_token } = data;

    const redirectUrl = new URL('/dashboard', req.url);
    redirectUrl.searchParams.set('access_token', access_token);
    redirectUrl.searchParams.set('refresh_token', refresh_token);
    if (realmId) {
      redirectUrl.searchParams.set('realmId', realmId);
    }

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', req.url));
  }
}
