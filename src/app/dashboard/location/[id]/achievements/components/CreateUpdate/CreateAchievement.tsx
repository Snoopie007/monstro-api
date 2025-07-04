"use client";

import {
  Sheet,
  Button,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui";

import { AchievementForm } from "..";
import { useState } from "react";
import { AchievementSchema } from "../../schemas";
import { useForm } from "react-hook-form";
import { useAchievements } from "../../providers";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { tryCatch } from "@/libs/utils";
import { Loader2 } from "lucide-react";

interface CreateAchievementProps {
  lid: string;
}

export function CreateAchievement({ lid }: CreateAchievementProps) {
  const [open, setOpen] = useState(false);
  const { setAchievements, setCurrentAchievement } = useAchievements();

  const form = useForm<z.infer<typeof AchievementSchema>>({
    resolver: zodResolver(AchievementSchema),
    defaultValues: {
      name: "",
      description: "",
      badge: "",
      points: 0,
      requiredActionCount: 0,
    },
    mode: "onChange",
  });

  async function onSubmit(v: z.infer<typeof AchievementSchema>) {
    const formData = new FormData();

    Object.entries(v).forEach(([key, value]) => {
      if (key !== "badge" && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    if (v.badge && v.badge.startsWith("blob:")) {
      const blob = await fetch(v.badge).then((r) => r.blob());
      formData.append("file", blob, "badge.png");
    } else if (v.badge) {
      formData.append("badge", v.badge);
    }

    const { result, error } = await tryCatch(
      fetch(`/api/protected/loc/${lid}/achievements`, {
        method: "POST",
        body: formData,
      })
    );

    if (error || !result || !result.ok) {
      toast.error("Something went wrong, please try again later");
      return;
    }
    const data = await result.json();
    setAchievements((prev) => [...prev, data]);
    setCurrentAchievement(data);
    form.reset();
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size={"sm"} variant={"create"}>
          + Achievement
        </Button>
      </SheetTrigger>

      <SheetContent className="sm:max-w-[540px] sm:w-[540px] p-0 border-foreground/10">
        <SheetHeader className="hidden">
          <SheetTitle className="hidden"></SheetTitle>
        </SheetHeader>

        <AchievementForm form={form} />
        <SheetFooter className="border-t border-foreground/10 py-3 px-4">
          <SheetClose asChild>
            <Button variant={"outline"} size={"sm"}>
              Cancel
            </Button>
          </SheetClose>
          <Button
            variant={"foreground"}
            size={"sm"}
            disabled={form.formState.isSubmitting}
            onClick={form.handleSubmit(onSubmit)}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              "Create"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
