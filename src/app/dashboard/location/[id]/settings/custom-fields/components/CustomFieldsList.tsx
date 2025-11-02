"use client";

import { useParams } from "next/navigation";

import {
  Card, CardContent,
  Button,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  Skeleton,
} from "@/components/ui";
import {
  Plus,
  Edit3,
  Save,
  X,
  AlertCircle,
  RefreshCw,
  Loader2,
  Tag,
} from "lucide-react";
import { useCustomFields } from "../useCustomFields";
import { Form } from "@/components/forms/form";
import type { CustomFieldFormData } from "../schemas";
import { CustomFieldRow } from "./CustomFieldRow";

interface CustomFieldsListProps {
  lid: string;
  initialFields: CustomFieldFormData[];
}

export function CustomFieldsList({ lid, initialFields }: CustomFieldsListProps) {

  const {
    form,
    fields,
    isEditing,
    isSaving,
    isLoading,
    error,
    toggleEditMode,
    addField,
    removeField,
    duplicateField,
    fetchCustomFields,
    onSubmit,
  } = useCustomFields({ locationId: lid, initialFields });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Skeleton className="w-full h-10" />
      </div>
    );
  }

  // Error state
  if (error && !isEditing) {
    return (
      <></>
    );
  }

  return (
    <div className="space-y-6">

      <div className="flex flex-row items-start justify-between">

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
            variant="outline"
            size="sm"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
          {isEditing && (
            <Button
              onClick={onSubmit}
              disabled={isSaving}
              variant="foreground"
              size="sm"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : 'Save Changes'}

            </Button>
          )}
        </div>
      </div>


      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          {fields.length === 0 ? (
            <Empty variant="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Tag className="size-4" />
                </EmptyMedia>
                <EmptyTitle>No custom fields found</EmptyTitle>
                <EmptyDescription>Add a custom field to the member.</EmptyDescription>
              </EmptyHeader>
              {isEditing && (
                <Button
                  onClick={addField}
                  className="bg-foreground/10 text-foreground/80 hover:bg-foreground/20 hover:text-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Field
                </Button>
              )}
            </Empty>
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
