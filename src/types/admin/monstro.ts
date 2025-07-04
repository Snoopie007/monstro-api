import { monstroPackagePaymentPlans, monstroPackages, monstroPlans } from "@/db/admin";

export type MonstroPlansBenefits = {
    name: string;
    description?: string;
}


export type MonstroPackage = typeof monstroPackages.$inferSelect & {

    paymentPlans?: PackagePaymentPlan[];
}

export type PackagePaymentPlan = typeof monstroPackagePaymentPlans.$inferSelect;

export type MonstroPlan = typeof monstroPlans.$inferSelect;