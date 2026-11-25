import type { locationAddons } from "../schemas/addons";


export enum AddonType {
    GMB = "gmb",
}

export enum AddonStatus {
    INCOMPLETE = "incomplete",
    ACTIVE = "active",
    PAST_DUE = "past_due",
    CANCELED = "canceled",
}


export type Addon = typeof locationAddons.$inferSelect & {
    type: AddonType;
    status: AddonStatus;
};

