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
import { useCustomFields } from "./useCustomFields";
import { Form } from "@/components/forms/form";
import type { CustomFieldFormData } from "./schemas";
import { CustomFieldRow } from "./CustomFieldRow";

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
    isSaving,
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
      <div className="flex flex-row items-start justify-between">
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
