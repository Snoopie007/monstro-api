"use client";
import {
  FormControl,
  FormField,
  FormMessage,
  FormItem,
  FormLabel,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  FormDescription,
} from "@/components/forms";

import { z } from "zod";
import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  CollapsibleContent,
  Collapsible,
  CollapsibleTrigger,
  Switch,
} from "@/components/ui";
import { NewPlanSchema } from "@/libs/FormSchemas";
import { cn } from "@/libs/utils";
import { ChevronRight } from "lucide-react";
import { SelectContract } from ".";

interface SubFieldsProps {
  form: UseFormReturn<z.infer<typeof NewPlanSchema>>;
  lid: string;
}

export function PlanPkgFields({ lid, form }: SubFieldsProps) {
  return (
    <div className="space-y-2">
      <fieldset>
        <FormField
          control={form.control}
          name="contractId"
          render={({ field }) => (
            <FormItem>
              <FormLabel size={"tiny"}>Attach a Contract</FormLabel>

              <SelectContract lid={lid} onChange={field.onChange} />
              <FormMessage />
              <FormDescription className="text-xs">
                Leave blank to not attach a contract.
              </FormDescription>
            </FormItem>
          )}
        />
      </fieldset>
      <fieldset className="grid grid-cols-2 gap-2 items-baseline">
        <FormField
          control={form.control}
          name="intervalClassLimit"
          render={({ field }) => (
            <FormItem className="col-span-1">
              <FormLabel size={"tiny"}>Class Limit Per Week</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder=""
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseInt(value) : undefined);
                  }}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>Leave blank for unlimited.</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="pkg.totalClassLimit"
          render={({ field }) => (
            <FormItem className="">
              <FormLabel size={"tiny"}>Total Classes</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="1"
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseInt(value) : undefined);
                  }}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </fieldset>

      <Collapsible>
        <CollapsibleTrigger className="flex group flex-row items-center gap-1">
          <ChevronRight
            size={15}
            className="group-data-[state=open]:rotate-90"
          />
          <span className="text-[0.7rem] uppercase font-medium cursor-pointer">
            Package Options <span className=" text-red-500">(Optional)</span>
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="bg-background rounded-sm p-4 space-y-2">
          <fieldset className="flex flex-col gap-1 items-baseline">
            <FormLabel size={"tiny"}>Expires In (From Signup Date)</FormLabel>
            <div className="grid grid-cols-3 gap-3 items-baseline">
              <FormField
                control={form.control}
                name="pkg.expireThreshold"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pkg.expireInterval"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select interval..." />
                      </SelectTrigger>
                      <SelectContent>
                        {["day", "week", "month", "year"].map(
                          (preset, index) => (
                            <SelectItem key={index} value={preset}>
                              {preset}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </fieldset>

          <fieldset>
            <FormField
              control={form.control}
              name="family"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 rounded-sm border border-foreground/10 py-2 px-3 ">
                  <FormControl>
                    <Switch
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">Family Plan</FormLabel>
                    <FormDescription className="text-xs">
                      Allow additional family members to be added.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </fieldset>
          {form.getValues("family") && (
            <fieldset>
              <FormField
                control={form.control}
                name="familyMemberLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel size={"tiny"}>Number of Family</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className={cn("")}
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? parseInt(value) : undefined);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
