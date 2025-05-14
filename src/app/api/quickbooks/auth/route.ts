// // import { NextApiRequest, NextApiResponse } from 'next';
// // import { randomUUID } from 'crypto';

// // export default function handler(req: NextApiRequest, res: NextApiResponse) {
// // 	const authUrl = new URL('https://appcenter.intuit.com/connect/oauth2');

// // 	const params = {
// // 		client_id: process.env.NEXT_PUBLIC_QUICKBOOKS_CLIENT_ID,
// // 		client_secret: process.env.QUICKBOOKS_CLIENT_SECRET,
// // 		response_type: 'code',
// // 		scope: process.env.NEXT_PUBLIC_QUICKBOOKS_SCOPE,
// // 		redirect_uri: process.env.QUICKBOOKS_REDIRECT_URI,
// // 		state: randomUUID(),
// // 	};

// // 	Object.entries(params).forEach(([key, value]) => {
// // 		if (value !== undefined) {
// // 			authUrl.searchParams.append(key, value);
// // 		}
// // 	});
// // 	res.redirect(authUrl.toString());
// // }

// import { NextRequest, NextResponse } from 'next/server';

// export async function GET(request: NextRequest) {

// 	return NextResponse.json({ success: true }, { status: 200 });

// }
