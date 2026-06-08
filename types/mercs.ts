import { productImages, products, productVariants } from "../schemas/ecommerce";
import type { ProductSize } from "./other";

export type MercImage = typeof productImages.$inferSelect;

export type MercVariant = typeof productVariants.$inferSelect & {
    size: ProductSize;
}
export type Merc = typeof products.$inferSelect & {
    variants: MercVariant[];
    images?: MercImage[];
};

export type ProductVariant = MercVariant

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