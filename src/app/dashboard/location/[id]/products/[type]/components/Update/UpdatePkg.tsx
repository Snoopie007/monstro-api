"use client";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  Switch,
} from "@/components/ui";
import { cn, tryCatch } from "@/libs/utils";
import { z } from "zod";
import {
  Form,
  FormField,
  FormLabel,
  FormMessage,
  FormItem,
  FormControl,
  Input,
  Textarea,
  FormDescription,
} from "@/components/forms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";

import { toast } from "react-toastify";
import { Loader2, Pencil } from "lucide-react";
import AddPrograms from "../AddPrograms";
import { usePackages } from "@/hooks/usePlans";
import { UpdatePkgPlanSchema } from "@/libs/FormSchemas";
import { MemberPlan } from "@/types";
import { VisuallyHidden } from "react-aria";

interface CreatePlanProps {
  lid: string;
  pkg: MemberPlan;
}

export function UpdatePkg({ lid, pkg }: CreatePlanProps) {
  const [open, setOpen] = useState(false);
  const { mutate: mutatePkgs } = usePackages(lid);

  const form = useForm<z.infer<typeof UpdatePkgPlanSchema>>({
    resolver: zodResolver(UpdatePkgPlanSchema),
    defaultValues: {
      name: pkg.name,
      description: pkg.description,
      programs: pkg.planPrograms?.map((program) => program.program?.id) || [],
      familyMemberLimit: pkg.familyMemberLimit || 0,
    },
    mode: "onChange",
  });

  async function onSubmit(v: z.infer<typeof UpdatePkgPlanSchema>) {
    if (form.formState.isSubmitting) return;

    // Check if family limit is being decreased
    if (
      v.familyMemberLimit !== undefined &&
      v.familyMemberLimit < (pkg.familyMemberLimit || 0)
    ) {
      toast.error("Family limit can only be increased, not decreased");
      return;
    }

    try {
      const { result, error } = await tryCatch(
        fetch(`/api/protected/loc/${lid}/plans/updates/${pkg.id}`, {
          method: "PUT",
          body: JSON.stringify({
            ...v,
          }),
        })
      );

      if (error || !result || !result.ok) {
        toast.error(error?.message || "Something went wrong");
        return;
      }

      toast.success(`Package updated successfully`);
      form.reset();
      await mutatePkgs();
      setOpen(false);
    } catch (error) {
      console.error("Error creating plan:", error);
      toast.error("Failed to create plan");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size={"icon"}
          variant={"ghost"}
          className=" rounded-md bg-foreground/10 hover:bg-foreground/10 size-5 p-0"
        >
          <Pencil className="size-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg border-foreground/10">
        <VisuallyHidden className="space-y-0">
          <DialogTitle></DialogTitle>
        </VisuallyHidden>
        <DialogBody>
          <Form {...form}>
            <form className="space-y-2">
              <fieldset className="grid grid-cols-1 gap-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel size={"tiny"}>Name</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          className={cn("")}
                          placeholder="Name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>
              <fieldset>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel size={"tiny"}>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          className={"resize-none h-8 border-foreground/10"}
                          placeholder="Short description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>
              <fieldset>
                <FormField
                  control={form.control}
                  name="programs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel size={"tiny"}>Select Programs</FormLabel>
                      <FormDescription className="text-xs">
                        Select at least one program that this plan will include.
                      </FormDescription>
                      <FormControl>
                        <AddPrograms
                          value={field.value || []}
                          onChange={(selectedPrograms) => {
                            field.onChange(selectedPrograms);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>
              {pkg.family && (
                <fieldset>
                  <FormField
                    control={form.control}
                    name="familyMemberLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel size={"tiny"}>Family Member Limit</FormLabel>
                        <FormDescription className="text-xs">
                          You can only increase the limit, not decrease it.
                        </FormDescription>
                        <FormControl>
                          <Input
                            type="number"
                            min={pkg.familyMemberLimit || 0}
                            className={cn("")}
                            placeholder="Enter family member limit"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </fieldset>
              )}
            </form>
          </Form>
        </DialogBody>
        <DialogFooter>
          <div className="flex flex-row gap-2 items-center">
            <DialogClose asChild>
              <Button
                size={"sm"}
                variant={"outline"}
                className="bg-transparent"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              size={"sm"}
              onClick={form.handleSubmit(onSubmit)}
              variant={"foreground"}
              disabled={form.formState.isSubmitting || !form.formState.isValid}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                "Update"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
