import type { orders } from "../schemas/ecommerce/orders";
import type { Member } from "./member";
import type { Location } from "./location";
export type Order = typeof orders.$inferSelect & {
    member: Member;
    location: Location;
    items: OrderLineItem[];
}
export type OrderLineItem = {
    variantId: string;
    unitCost: number;
    quantity: number;
    discount?: number;
    productName: string;
    tax: number;
    sku?: string | null;
    imageUrl?: string | null;
}