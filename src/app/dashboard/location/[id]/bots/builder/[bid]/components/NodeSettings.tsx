"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBotBuilder } from "../providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/forms";
import { Input } from "@/components/forms";
import { Textarea } from "@/components/forms";
import { X } from "lucide-react";

const NodeFormSchema = z.object({
  label: z.string().min(1, "Label is required"),
  goal: z.string().min(1, "Goal is required"),
  instructions: z.string().optional(),
});

type NodeFormData = z.infer<typeof NodeFormSchema>;

export function NodeSettings() {
  const { currentNode, setCurrentNode, updateNode, deleteNode } =
    useBotBuilder();
  const lastNodeIdRef = useRef<string | null>(null);

  const form = useForm<NodeFormData>({
    resolver: zodResolver(NodeFormSchema),
    defaultValues: {
      label: "",
      goal: "",
      instructions: "",
    },
  });

  // Update form when current node changes - prevent unnecessary resets
  useEffect(() => {
    if (currentNode && currentNode.id !== lastNodeIdRef.current) {
      lastNodeIdRef.current = currentNode.id;
      form.reset({
        label: currentNode.data.label || "",
        goal: currentNode.data.goal || "",
        instructions: currentNode.data.instructions || "",
      });
    }
  }, [currentNode?.id]); // Only depend on node ID

  const onSubmit = (data: NodeFormData) => {
    if (!currentNode) return;
    updateNode(currentNode.id, data);
  };

  const handleDelete = () => {
    if (!currentNode) return;
    deleteNode(currentNode.id);
    setCurrentNode(null);
  };

  if (!currentNode) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-10 w-80">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {currentNode.type
                ? `${currentNode.type
                    .charAt(0)
                    .toUpperCase()}${currentNode.type.slice(1)} Node`
                : "Node"}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentNode(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter node label" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What should this node accomplish?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Specific instructions for the AI"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Update
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
