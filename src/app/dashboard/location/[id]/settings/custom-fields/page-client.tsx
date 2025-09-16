"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/forms/input";
import { Label } from "@/components/forms/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/forms/select";
import { Switch } from "@/components/forms/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/forms/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Edit3,
  Save,
  X,
  Copy,
  Trash2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useCustomFields } from "./useCustomFields";
import { customFieldTypeOptions } from "./schemas";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/forms/form";
import { Pill, PillIndicator } from "@/components/ui/kibo-ui/pill";
import type { CustomFieldFormData } from "./schemas";

interface CustomFieldsPageClientProps {
  initialFields: CustomFieldFormData[];
}

export default function CustomFieldsPageClient({
  initialFields,
}: CustomFieldsPageClientProps) {
  const params = useParams();
  const locationId = params.id as string;

  const {
    form,
    fields,
    isEditing,
    isLoading,
    error,
    toggleEditMode,
    addField,
    removeField,
    duplicateField,
    fetchCustomFields,
    onSubmit,
  } = useCustomFields({ locationId, initialFields });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Custom Fields</h1>
            <p className="text-sm text-muted-foreground">
              Create and manage custom fields for your members
            </p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="text-sm text-muted-foreground">
            Loading custom fields...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Custom Fields</h1>
            <p className="text-sm text-muted-foreground">
              Create and manage custom fields for your members
            </p>
          </div>
        </div>
        <Card className="border-destructive/20">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <div className="text-center">
              <h3 className="text-lg font-medium text-destructive mb-2">
                Error Loading Custom Fields
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                {error}
              </p>
              <Button
                onClick={fetchCustomFields}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Custom Fields</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage custom fields for your members
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button
              onClick={addField}
              className="bg-foreground/10 text-foreground/80 hover:bg-foreground/20 hover:text-foreground"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          )}
          <Button
            onClick={toggleEditMode}
            className="bg-foreground/10 text-foreground/80 hover:bg-foreground/20 hover:text-foreground"
            size="sm"
          >
            {isEditing ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </>
            )}
          </Button>
          {isEditing && (
            <Button
              onClick={onSubmit}
              className="bg-foreground/10 text-foreground/80 hover:bg-foreground/20 hover:text-foreground"
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Custom Fields List */}
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          {fields.length === 0 ? (
            <Card className="border-foreground/10">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">
                    No custom fields yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get started by creating your first custom field for member
                    data
                  </p>
                  {isEditing && (
                    <Button
                      onClick={addField}
                      className="bg-foreground/10 text-foreground/80 hover:bg-foreground/20 hover:text-foreground"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Field
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <CustomFieldRow
                  key={field.id || index}
                  field={field}
                  index={index}
                  isEditing={isEditing}
                  onRemove={() => removeField(index)}
                  onDuplicate={() => duplicateField(index)}
                  form={form}
                />
              ))}
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}

interface CustomFieldRowProps {
  field: any;
  index: number;
  isEditing: boolean;
  onRemove: () => void;
  onDuplicate: () => void;
  form: any;
}

function CustomFieldRow({
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* Required Toggle */}
            <div className="space-y-2">
              <Label htmlFor={`${fieldKey}.required`}>Required</Label>
              <FormField
                control={form.control}
                name={`${fieldKey}.required`}
                render={({ field: formField }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={formField.value}
                        onCheckedChange={formField.onChange}
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">
                      {formField.value ? "Required" : "Optional"}
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>
        ) : (
          // View Mode Layout - Simplified inline display
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

            {/* Required Status Pill */}
            <Pill
              variant={field.required ? "default" : "outline"}
              className="gap-2 text-[10px] font-normal"
            >
              <PillIndicator variant={field.required ? "success" : "info"} />
              {field.required ? "Required" : "Not Required"}
            </Pill>
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
