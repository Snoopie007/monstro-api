import type { productImages, productVariants, products } from "../schemas/ecommerce";
import type { Location } from "./location";

export type ProductSize = "XS" | "S" | "M" | "L" | "XL" | "XXL";
export type ProductVariant = typeof productVariants.$inferSelect & {
    size: ProductSize;

}

export type ProductImage = typeof productImages.$inferSelect
export type Product = typeof products.$inferSelect & {
    location: Location;
    variants: ProductVariant[];
    images: ProductImage[];
}

export type OrderLineItem = {
    variantId: string;
    unitCost: number;
    quantity: number;
    discount?: number;
    productName: string;
    tax: number;
}