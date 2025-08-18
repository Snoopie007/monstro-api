import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/forms";
import {
  FormItem,
  FormControl,
  FormMessage,
  FormLabel,
  FormDescription,
} from "@/components/forms/form";

import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { OptionsManager } from "./OptionsManager";

import { Pill } from "@/components/ui/kibo-ui/pill";
import { customFieldTypeOptions } from "./schemas";
import { Textarea } from "@/components/ui/textarea";
import React from "react";

interface CustomFieldRowProps {
  field: any;
  index: number;
  isEditing: boolean;
  onRemove: () => void;
  onDuplicate: () => void;
  form: any;
}

export function CustomFieldRow({
  field,
  index,
  isEditing,
  onRemove,
  onDuplicate,
  form,
}: CustomFieldRowProps) {
  const fieldKey = `fields.${index}`;

  return (
    <Card className="border-foreground/10">
      <CardContent className="p-6">
        {isEditing ? (
          // Edit Mode Layout
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field Name */}
            <div className="space-y-2">
              <Label htmlFor={`${fieldKey}.name`}>Field Name</Label>
              <FormField
                control={form.control}
                name={`${fieldKey}.name`}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        className="border-foreground/20"
                        {...formField}
                        placeholder="Enter field name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Field Type */}
            <div className="space-y-2">
              <Label htmlFor={`${fieldKey}.type`}>Field Type</Label>
              <FormField
                control={form.control}
                name={`${fieldKey}.type`}
                render={({ field: formField }) => (
                  <FormItem>
                    <Select
                      onValueChange={formField.onChange}
                      defaultValue={formField.value}
                    >
                      <FormControl>
                        <SelectTrigger className="border-foreground/20">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customFieldTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        ) : (
          // View Mode Layout - Simplified inline display
          <div className="space-y-1">
            <div className="flex gap-2">
              {/* Field Name */}
              <div className="flex-1 font-medium">
                {field.name || "Untitled Field"}
              </div>

              {/* Field Type Pill */}
              <Pill variant="secondary" className="text-[10px]">
                {customFieldTypeOptions.find((opt) => opt.value === field.type)
                  ?.label || field.type}
              </Pill>
            </div>

            {/* Show options for select fields in view mode */}
            {(field.type === "select" || field.type === "multi-select") &&
              field.options &&
              field.options.length > 0 && (
                <div className="pl-2 border-l-2 border-foreground/10">
                  <div className="text-xs text-muted-foreground mb-1">
                    Options:{" "}
                    {field.options.map((option: any, index: number) => {
                      if (index >= 3) {
                        if (index === 3) {
                          return (
                            <span key={index}>
                              ... (+{field.options.length - 3} more)
                            </span>
                          );
                        }
                        return null;
                      }
                      return (
                        <React.Fragment key={index}>
                          <span key={index}>{option.label}</span>
                          {index < Math.min(field.options.length - 1, 2) &&
                            ", "}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Additional Options */}
        {isEditing && (
          <>
            <Separator className="my-4 bg-foreground/20" />
            <div className="flex flex-col gap-4 text-sm">
              {/* Placeholder */}
              <FormField
                control={form.control}
                name={`${fieldKey}.placeholder`}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>Placeholder</FormLabel>
                    <FormControl>
                      <Input
                        className="border-foreground/20"
                        {...formField}
                        placeholder="Enter placeholder text"
                      />
                    </FormControl>
                    <FormDescription>
                      Text shown when the field is empty
                    </FormDescription>
                  </FormItem>
                )}
              />

              {/* Help Text */}
              <FormField
                control={form.control}
                name={`${fieldKey}.helpText`}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>Help Text</FormLabel>
                    <FormControl>
                      <Textarea
                        className="border-foreground/20"
                        {...formField}
                        placeholder="Additional instructions or help text"
                        rows={2}
                      />
                    </FormControl>
                    <FormDescription>
                      Additional guidance for members
                    </FormDescription>
                  </FormItem>
                )}
              />

              {/* Options Manager for Select Fields */}
              {(field.type === "select" || field.type === "multi-select") && (
                <OptionsManager fieldKey={`${fieldKey}.options`} form={form} />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button
                className="bg-foreground/10 text-foreground/80 hover:bg-foreground/20 hover:text-foreground"
                onClick={onDuplicate}
                size="sm"
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Button
                className="bg-destructive/10 text-destructive/80 hover:bg-destructive/20 hover:text-destructive"
                onClick={onRemove}
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
