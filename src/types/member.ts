import { Achievement } from "./achievement";
import { Reward } from "./reward";

export type Member = {
    id?: number;
    firstName: string;
    lastName: string | null;
    email: string;
    referralCode: string;
    currentPoints: number;
    reedemPoints?: number;
    avatar: string | null;
    phone: string | null;
    activityStatus?: string;
    achievements?: Achievement[];
    stripeCustomerId?: string;
    rewards?: Reward[];
    created: Date;
    updated: Date | null;
    deleted: Date | null;
};
