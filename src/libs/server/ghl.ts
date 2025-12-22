import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { HighLevel } from '@gohighlevel/api-client';
import { integrations } from "@/db/schemas";
import { Integration } from "@/types";


const IS_PROD = process.env.NODE_ENV === "production";


type GetAccessTokenParams = {
	code?: string;
	type: 'Company' | 'Location';
	callback?: string;
	refreshToken?: string;
}


class HighLevelClient {
	readonly agencyClient: HighLevel;
	LOCATION_ACCESS_TOKEN: string | undefined;
	readonly CLIENT_ID: string;
	readonly CLIENT_SECRET: string;
	constructor(accessToken?: string) {
		if (!process.env.NEXT_PUBLIC_GHL_CLIENT_ID || !process.env.GHL_CLIENT_SECRET) {
			throw new Error("GHL_CLIENT_ID and GHL_CLIENT_SECRET are required");
		}
		this.agencyClient = new HighLevel({
			apiVersion: '2021-07-28',
			clientId: process.env.NEXT_PUBLIC_GHL_CLIENT_ID,
			clientSecret: process.env.GHL_CLIENT_SECRET,
			...(accessToken && { locationAccessToken: accessToken }),
		});
		this.CLIENT_ID = process.env.NEXT_PUBLIC_GHL_CLIENT_ID || '';
		this.CLIENT_SECRET = process.env.GHL_CLIENT_SECRET || '';
	}


	setLocationAccessToken(accessToken: string) {
		this.LOCATION_ACCESS_TOKEN = accessToken;
	}




	async getLocationAccessToken(integration: Integration): Promise<string> {
		const currentTime = new Date().getTime();
		const isExpired = integration.expires ? currentTime > integration.expires : true;

		if (!integration.refreshToken) throw new Error("No Refresh Token.");

		if (!isExpired && integration.accessToken) {
			this.LOCATION_ACCESS_TOKEN = integration.accessToken;
			return integration.accessToken;
		}

		const res = await this.getAccessToken({ refreshToken: integration.refreshToken, type: 'Location' });
		const { access_token, refresh_token, expires_in, scope } = res;

		await db.update(integrations).set({
			accessToken: access_token,
			refreshToken: refresh_token,
			expires: expires_in ? new Date().getTime() + (expires_in * 1000) : undefined,
			metadata: {
				scope,
			},
		}).where(eq(integrations.service, "ghl"));

		this.LOCATION_ACCESS_TOKEN = access_token;

		return access_token!;
	}



	/* With Code */
	async getAccessToken({ code, type, callback, refreshToken }: GetAccessTokenParams) {
		try {
			const redirectUri = `${IS_PROD ? "https://app.monstro-x.com" : "http://localhost:3000"}/${callback}`;

			const res = await this.agencyClient.oauth.getAccessToken({
				client_id: this.CLIENT_ID,
				client_secret: this.CLIENT_SECRET,
				grant_type: refreshToken ? 'refresh_token' : 'authorization_code',
				user_type: type,
				redirect_uri: redirectUri,
				...(code && { code }),
				...(refreshToken && { refresh_token: refreshToken })
			});
			return res;
		} catch (error) {
			console.log(error);
			throw new Error("Error Getting Token.");
		}
	}



}





export {
	HighLevelClient,
}