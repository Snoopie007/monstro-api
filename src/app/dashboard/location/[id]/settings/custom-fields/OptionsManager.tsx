import {
  FormControl,
  FormDescription,
  FormLabel,
  FormItem,
} from "@/components/forms/form";
import { FormField, FormMessage } from "@/components/forms";
import { GripVertical, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OptionsManagerProps {
  fieldKey: string;
  form: any;
}

export function OptionsManager({ fieldKey, form }: OptionsManagerProps) {
  const options = form.watch(`${fieldKey}`) || [];

  const addOption = () => {
    const currentOptions = form.getValues(`${fieldKey}`) || [];
    form.setValue(`${fieldKey}`, [...currentOptions, { value: "", label: "" }]);
  };

  const removeOption = (index: number) => {
    const currentOptions = form.getValues(`${fieldKey}`) || [];
    form.setValue(
      `${fieldKey}`,
      currentOptions.filter((_: any, i: number) => i !== index)
    );
  };

  const moveOption = (fromIndex: number, toIndex: number) => {
    const currentOptions = [...(form.getValues(`${fieldKey}`) || [])];
    const [removed] = currentOptions.splice(fromIndex, 1);
    currentOptions.splice(toIndex, 0, removed);
    form.setValue(`${fieldKey}`, currentOptions);
  };

  return (
    <FormField
      control={form.control}
      name={fieldKey}
      render={() => (
        <FormItem>
          <FormLabel>Options</FormLabel>
          <FormDescription>
            Define the available options for this select field
          </FormDescription>
          <div className="space-y-2">
            {options.map((option: any, index: number) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 border border-foreground/20 rounded-md bg-background"
              >
                <div className="cursor-grab">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="flex-1 grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name={`${fieldKey}.${index}.value`}
                    render={({ field: valueField }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...valueField}
                            placeholder="Option value"
                            className="border-foreground/20"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`${fieldKey}.${index}.label`}
                    render={({ field: labelField }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...labelField}
                            placeholder="Display label"
                            className="border-foreground/20"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption(index)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {options.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground border border-dashed border-foreground/20 rounded-md">
                No options added yet
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Option
            </Button>
          </div>
        </FormItem>
      )}
    />
  );
}
