"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useMemo, useState } from "react";
import { BotFields } from ".";
import { z } from "zod";
import { ScrollArea, Skeleton, Button } from "@/components/ui";
import { Form } from "@/components/forms";
import { sleep } from "@/libs/utils";
import { toast } from "react-toastify";
import { SupportSettingsSchema } from "@/libs/FormSchemas";
import { useBotSettingContext } from "../provider";
import { Loader2 } from "lucide-react";

export function BotSettings({ lid }: { lid: string }) {
  const { assistant } = useBotSettingContext();
  const [isSaving, setIsSaving] = useState(false);
  const isLoading = useMemo(() => !assistant, [assistant]);

  const form = useForm<z.infer<typeof SupportSettingsSchema>>({
    resolver: zodResolver(SupportSettingsSchema),
    defaultValues: {
      prompt: assistant?.prompt || "",
      initialMessage: assistant?.initialMessage || "",
      temperature: assistant?.temperature || 0,
      model: assistant?.model,
      persona: assistant?.persona || {
        name: assistant?.persona.name || "",
        avatar: assistant?.persona.avatar || "",
        responseStyle: assistant?.persona.responseStyle || "",
        personality: assistant?.persona.personality || [],
      },
      triggers: assistant?.triggers || [],
      knowledgeBase: assistant?.knowledgeBase || {
        qa_entries: [],
        document: null,
      },
    },
    mode: "onChange",
  });

  const triggers = form.watch("triggers");
  const qaEntries = form.watch("knowledgeBase.qa_entries");

  const renderForm = useMemo(() => {
    return (
      <BotFields
        form={form}
        lid={lid}
        isSaving={isSaving}
        onSubmit={onSubmit}
      />
    );
  }, [assistant, triggers, lid, qaEntries]);

  async function onSubmit(v: z.infer<typeof SupportSettingsSchema>) {
    console.log("values to save: ", v);
    if (!assistant) return;
    setIsSaving(true);
    // const { result, error } = await tryCatch(
    //   fetch(`/api/protected/loc/${lid}/support/settings`, {
    //     method: "PATCH",
    //     body: JSON.stringify(v),
    //   })
    // );
    await sleep(1000);
    setIsSaving(false);
    toast.success("Settings saved");
    // setIsSaving(false);
    // if (error || !result || !result.ok) {
    //   toast.error(error?.message || "Something went wrong.");
    //   return;
    // }
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 rounded-lg  overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-4 h-full p-4">
            <Skeleton className="w-full h-20 rounded-lg bg-foreground/5" />
            <Skeleton className="w-full h-10 rounded-lg bg-foreground/5" />
            <Skeleton className="w-[80%] h-20 rounded-lg bg-foreground/5" />
          </div>
        ) : (
          assistant && (
            <div className="h-full flex flex-col bg-foreground/5">

              <Form {...form}>
                <form id="newBotForm" className=" flex flex-col h-full">
                  <div className="flex flex-row justify-between px-4 py-3 border-b border-foreground/5 ">
                    <div className=" font-medium text-sm">Bot Settings</div>

                  </div>
                  <ScrollArea className="flex-1 w-full p-4  h-full ">
                    <div className="space-y-4">

                      {renderForm}
                    </div>
                  </ScrollArea>
                  <div className="flex flex-row justify-end px-4 py-3 border-t border-foreground/5 ">
                    <Button
                      variant="foreground"
                      type="submit"
                      className="rounded-sm"
                      disabled={isSaving}
                      onClick={form.handleSubmit(onSubmit)}
                    >
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>

            </div>
          )
        )}
      </div>
    </div>
  );
}
