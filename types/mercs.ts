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


