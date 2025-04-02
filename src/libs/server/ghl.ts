import { admindb, db } from "@/db/db";
import { AdminIntegration } from "@/types/admin";
import QueryString from "qs";
import { eq } from "drizzle-orm";
import { addDays } from "date-fns";
import { Integration } from "@/types";
import { integrations } from "@/db/schemas";
import { adminIntegrations } from "@/db/admin/sales";


const DefaultHeaders = {
    "Version": "2021-07-28",
    'Content-Type': 'application/json'
};


const OAuthConfig = {
    method: 'POST',
    maxBodyLength: Infinity,
    headers: {
        "Version": "2021-07-28",
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
};


class BaseGHL {
    readonly API: string;
    readonly CLIENT_ID: string;
    readonly CLIENT_SECRET: string;
    ACCESS_TOKEN: string | undefined;
    constructor() {
        this.API = process.env.GHL_API || '';
        this.CLIENT_ID = process.env.NEXT_PUBLIC_GHL_CLIENT_ID || '';
        this.CLIENT_SECRET = process.env.GHL_CLIENT_SECRET || '';
    }

    setAccessToken(accessToken: string) {
        this.ACCESS_TOKEN = accessToken;
    }


    /* With Code */
    async getToken(code: string, type: string, callback = '/callback') {
        const data = QueryString.stringify({
            client_id: this.CLIENT_ID,
            client_secret: this.CLIENT_SECRET,
            'grant_type': 'authorization_code',
            'user_type': type,
            'redirect_uri': `${process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://admin.mymonstro.com"}/${callback}`,
            code
        });

        const config = {
            ...OAuthConfig,
            body: data
        };

        const res = await fetch(`${this.API}/oauth/token`, config);

        if (!res.ok) {
            const error = await res.json();
            console.log(error.message);
            throw new Error("Error Getting Token.");
        }

        return await res.json();
    }

    /* With Refresh Token */
    async getTokenWithRefreshToken(refreshToken: string, type: string) {
        const options = {
            client_id: this.CLIENT_ID,
            client_secret: this.CLIENT_SECRET,
            'grant_type': 'refresh_token',
            user_type: type,
            refresh_token: refreshToken
        };

        const data = QueryString.stringify(options);
        const config = {
            ...OAuthConfig,
            body: data
        };

        const res = await fetch(`${this.API}/oauth/token`, config);

        if (!res.ok) {
            const error = await res.json();
            console.log(error);
            throw new Error("Error Getting Refresh Token.");
        }

        return await res.json();
    }
    async upsertContact(contact: Record<string, any>): Promise<void> {
        if (!this.ACCESS_TOKEN) throw new Error("No Access Token.");
        const res = await fetch(`${this.API}/contacts/upsert`, {
            method: "POST",
            headers: {
                ...DefaultHeaders,
                "Authorization": `Bearer ${this.ACCESS_TOKEN}`
            },
            body: JSON.stringify(contact)
        });
        if (!res.ok) {
            const error = await res.json();
            console.log(error);
            throw new Error("Error Upserting Contact.");
        }

    }
}


class AgencyGHL extends BaseGHL {
    constructor() {
        super();
    }


    async getAccessToken(integration: AdminIntegration): Promise<string> {
        const currentTime = new Date().getTime();
        const isExpired = integration.expires ? currentTime > integration.expires : true;
        console.log(!integration.refreshToken)
        if (!integration.refreshToken) throw new Error("No Refresh Token.");

        if (!isExpired && integration.accessToken) {
            this.ACCESS_TOKEN = integration.accessToken;
            return integration.accessToken;
        }

        const res = await this.getTokenWithRefreshToken(integration.refreshToken, "Company");
        const { access_token, refresh_token, expires_in, scope } = res;

        await admindb.update(adminIntegrations).set({
            accessToken: access_token,
            refreshToken: refresh_token,
            expires: new Date().getTime() + expires_in * 1000,
            scope,
        }).where(eq(adminIntegrations.service, "ghl"));

        this.ACCESS_TOKEN = access_token;

        return access_token;
    }


}




class VendorGHL extends BaseGHL {
    constructor() {
        super();
    }

    async getLocationToken(code: string, callback = '/callback') {
        const res = await this.getToken(code, 'Location', callback);
        return res;
    }

    async getAccessToken(integration: Integration) {
        const currentTime = new Date().getTime();
        const isExpired = integration.expires ? currentTime > integration.expires : true;

        if (integration.accessToken && !isExpired) {
            this.ACCESS_TOKEN = integration.accessToken;
            return integration.accessToken;
        }

        if (!integration.refreshToken) {
            throw new Error("Access token error.");
        }

        const res = await this.getTokenWithRefreshToken(integration.refreshToken, "Location");
        const { access_token, refresh_token, expires_in } = res;
        await db.update(integrations).set({
            accessToken: access_token,
            refreshToken: refresh_token,
            expires: new Date().getTime() + expires_in * 1000,
        }).where(eq(integrations.id, integration.id!));

        this.ACCESS_TOKEN = access_token;

        return access_token;
    }




    async getCalendars(id: string) {
        if (!this.ACCESS_TOKEN) throw new Error("No Access Token.");
        const res = await fetch(`${this.API}/calendars/?locationId=${id}`, {
            method: "GET",
            headers: {
                ...DefaultHeaders,
                "Authorization": `Bearer ${this.ACCESS_TOKEN}`
            },
        });

        if (!res.ok) {
            throw new Error("Error Fetching Calendars.");
        }

        const data = await res.json();
        return data.calendars;
    }

    async sendMessage(message: { message: string, contactId: string, type: string }) {
        if (!this.ACCESS_TOKEN) throw new Error("No Access Token.");
        const res = await fetch(`${this.API}/conversations/messages`, {
            method: "POST",
            headers: {
                ...DefaultHeaders,
                "Authorization": `Bearer ${this.ACCESS_TOKEN}`
            },
            body: JSON.stringify(message)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error("Error Sending Message.");
        }

        return data;
    }

    async addToWorkflow(workflowId: string, contactId: string) {
        if (!this.ACCESS_TOKEN) throw new Error("No Access Token.");
        const res = await fetch(`${this.API}/contacts/${contactId}/workflow/${workflowId}`, {
            method: "POST",
            headers: {
                ...DefaultHeaders,
                "Authorization": `Bearer ${this.ACCESS_TOKEN}`
            }
        });

        if (!res.ok) {
            throw new Error("Error Adding Contact to Workflow.");
        }

        return true;
    }

    async getFreeSlots(id: string, day = 7, limit = 14) {
        if (!this.ACCESS_TOKEN) throw new Error("No Access Token.");
        const startDate = new Date();
        const endDate = addDays(startDate, day);
        const qs = QueryString.stringify({
            startDate: startDate.getTime(),
            endDate: endDate.getTime()
        });
        const res = await fetch(`${this.API}/calendars/${id}/free-slots?${qs}`, {
            method: "GET",
            headers: {
                ...DefaultHeaders,
                "Authorization": `Bearer ${this.ACCESS_TOKEN}`
            },
        });

        if (!res.ok) {
            const error = await res.json();
            console.log(error);
            throw new Error("Error Fetching Free Slots.");
        }

        let data = await res.json();

        if (Object.keys(data).length > 0) {
            data = Object.values<{ slots: string[] }>(data)
                .filter(day => day.slots)
                .flatMap((day) => day.slots)
                .slice(0, limit);
        }

        return data;
    }




    async bookAppointment(appointment: Record<string, any>) {
        if (!this.ACCESS_TOKEN) throw new Error("No Access Token.");
        const res = await fetch(`${this.API}/calendars/events/appointments`, {
            method: "POST",
            headers: {
                ...DefaultHeaders,
                "Authorization": `Bearer ${this.ACCESS_TOKEN}`
            },
            body: JSON.stringify(appointment)
        });

        if (!res.ok) {
            const error = await res.json();
            console.log(error);
            throw new Error("Error Booking Appointment.");
        }

        return true;
    }


}

export {
    AgencyGHL,
    VendorGHL
}