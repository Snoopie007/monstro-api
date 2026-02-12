"use client";
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,

} from "@/components/ui";
import { Pencil, MoreHorizontal, Pause, Play, Star, Link, Trash } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import { tryCatch } from "@/libs/utils";
import { useTaxRates } from "../provider";
import { UpdateTaxRate } from "./UpdateTaxRate";
import { TaxRate } from "@subtrees/types/tax";

const MenuItemStyle = "cursor-pointer text-xs flex flex-row items-center justify-between gap-2";

export default function TaxActions({ taxRate }: { taxRate: TaxRate }) {
    const { taxRates, setTaxRates } = useTaxRates();
    const lid = taxRate.locationId
    const [open, setOpen] = useState(false);

    const isLastTaxRate = useMemo(() => {
        return taxRates.length === 1;
    }, [taxRates]);

    const { isActive, isDefault, isStripeConnected } = useMemo(() => {

        return {

            isActive: taxRate.status === "active",
            isDefault: taxRate.isDefault,
            isStripeConnected: taxRate.stripeRateId ? true : false,
        }
    }, [taxRate]);


    async function setDefault() {
        const currentDefault = taxRates.find((t) => t.isDefault);
        if (currentDefault && currentDefault.id == taxRate.id) return;

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/config/tax/${taxRate.id}/default`, {
                method: "POST",
                body: JSON.stringify({
                    currentDefaultId: currentDefault?.id,
                }),
            })
        );
        if (error || !result || !result.ok) {
            toast.error(error?.message ?? "Failed to set default tax rate");
            return;
        }
        setTaxRates((prev) => prev.map((t) => {

            if (t.id === taxRate.id) {
                return { ...t, isDefault: true, status: "active" };
            }
            if (t.id === currentDefault?.id) {
                return { ...t, isDefault: false };
            }
            return t;
        }));
    }

    async function toggleStatus() {

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/config/tax/${taxRate.id}`, {
                method: "PATCH",
                body: JSON.stringify({ status: isActive ? "inactive" : "active" }),
            })
        );

        if (error || !result || !result.ok) {
            toast.error(error?.message ?? "Failed to toggle tax rate status");
            return;
        }
        setTaxRates((prev) => prev.map((t) => {
            if (t.id === taxRate.id) {
                return { ...t, status: isActive ? "inactive" : "active" };
            }
            return t;
        }));
    }

    async function deleteTaxRate() {
        if (isLastTaxRate) {
            toast.error("You cannot delete the last tax rate");
            return;
        }
        if (taxRate.isDefault) {
            toast.error("You cannot delete the default tax rate");
            return;
        }
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/config/tax/${taxRate.id}`, {
                method: "DELETE",
            })
        );
        if (error || !result || !result.ok) {
            toast.error(error?.message ?? "Failed to delete tax rate");
            return;
        }
        setTaxRates((prev) => prev.filter((t) => t.id !== taxRate.id));
        toast.success("Tax rate deleted successfully");
    }

    async function connectToStripe() {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/config/tax/${taxRate.id}/stripe`, {
                method: "POST",
            })
        );
        if (error || !result || !result.ok) {
            toast.error(error?.message ?? "Failed to connect to Stripe");
            return;
        }
        const data = await result.json();
        toast.success("Tax rate connected to Stripe successfully");
        setTaxRates((prev) => prev.map((t) => {
            if (t.id === taxRate.id) {
                return { ...t, stripeRateId: data.stripeRateId };
            }
            return t;
        }));
    }
    return (
        <>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 group-hover:bg-foreground/10"
                    >
                        <MoreHorizontal className="size-4.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 border-foreground/10 ">
                    <DropdownMenuItem
                        className={MenuItemStyle}
                        onClick={() => setOpen(true)}
                        disabled={!taxRate}
                    >
                        <span > Edit</span>
                        <Pencil className="size-3" />
                    </DropdownMenuItem>
                    {!isStripeConnected && (
                        <DropdownMenuItem
                            className={MenuItemStyle}
                            onClick={connectToStripe}
                            disabled={!taxRate}
                        >
                            <span > Connect to Stripe</span>
                            <Link className="size-3" />
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                        className={MenuItemStyle}
                        onClick={toggleStatus}
                        disabled={!taxRate}
                    >
                        {
                            isActive ? (
                                <>
                                    <span > Deactivate</span>
                                    <Pause className="size-3" />
                                </>
                            ) : (
                                <>
                                    <span > Activate</span>
                                    <Play className="size-3" />
                                </>
                            )
                        }
                    </DropdownMenuItem>
                    {!isDefault && (
                        <DropdownMenuItem
                            className={MenuItemStyle}
                            onClick={setDefault}
                            disabled={!taxRate}
                        >
                            <span > Make Default</span>
                            <Star className="size-3" />
                        </DropdownMenuItem>
                    )}
                    {!isLastTaxRate && !isDefault && (
                        <DropdownMenuItem
                            className={MenuItemStyle}
                            onClick={deleteTaxRate}
                            disabled={!taxRate}
                        >
                            <span > Delete</span>
                            <Trash className="size-3" />
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            <UpdateTaxRate lid={lid} taxRate={taxRate} open={open} setOpen={setOpen} />
        </>
    );
}
