"use client";

import React from "react";
import {
	Input,
	Switch,
	Checkbox,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/forms";
import {
	Calendar,
	Button,
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/libs/utils";

export interface CustomFieldDefinition {
	id: string;
	name: string;
	type: "text" | "number" | "date" | "boolean" | "select" | "multi-select";
	placeholder?: string;
	helpText?: string;
	options?: Array<{ value: string; label: string }>;
}

interface CustomFieldInputProps {
	field: CustomFieldDefinition;
	value: string;
	onChange: (value: string) => void;
	error?: string;
	disabled?: boolean;
}

export function CustomFieldInput({
	field,
	value,
	onChange,
	error,
	disabled = false,
}: CustomFieldInputProps) {
	const renderInput = () => {
		switch (field.type) {
			case "text":
				return (
					<Input
						id={field.id}
						type="text"
						value={value}
						onChange={(e) => onChange(e.target.value)}
						placeholder={field.placeholder}
						disabled={disabled}
						className={cn(error && "border-destructive")}
					/>
				);

			case "number":
				return (
					<Input
						id={field.id}
						type="number"
						value={value}
						onChange={(e) => onChange(e.target.value)}
						placeholder={field.placeholder}
						disabled={disabled}
						className={cn(error && "border-destructive")}
					/>
				);

			case "date":
				const dateValue = value ? new Date(value) : undefined;
				return (
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className={cn(
									"w-full justify-start text-left font-normal",
									!dateValue && "text-muted-foreground",
									error && "border-destructive"
								)}
								disabled={disabled}
							>
								<CalendarIcon className="mr-2 h-4 w-4" />
								{dateValue
									? format(dateValue, "PPP")
									: field.placeholder || "Pick a date"}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0">
							<Calendar
								mode="single"
								selected={dateValue}
								onSelect={(date) => onChange(date ? date.toISOString() : "")}

							/>
						</PopoverContent>
					</Popover>
				);

			case "boolean":
				const booleanValue = value === "true";
				return (
					<div className="flex items-center space-x-2">
						<Switch
							id={field.id}
							checked={booleanValue}
							onCheckedChange={(checked) => onChange(checked.toString())}
							disabled={disabled}
						/>
						<Label htmlFor={field.id} size="sm">
							{booleanValue ? "Yes" : "No"}
						</Label>
					</div>
				);

			case "select":
				return (
					<Select value={value} onValueChange={onChange} disabled={disabled}>
						<SelectTrigger className={cn(error && "border-destructive")}>
							<SelectValue
								placeholder={field.placeholder || "Select an option"}
							/>
						</SelectTrigger>
						<SelectContent>
							{field.options?.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);

			case "multi-select":
				const selectedValues = value ? value.split(",").filter(Boolean) : [];
				return (
					<div className="space-y-2">
						{field.options?.map((option) => (
							<div key={option.value} className="flex items-center space-x-2">
								<Checkbox
									id={`${field.id}-${option.value}`}
									checked={selectedValues.includes(option.value)}
									onCheckedChange={(checked) => {
										let newValues;
										if (checked) {
											newValues = [...selectedValues, option.value];
										} else {
											newValues = selectedValues.filter(
												(v) => v !== option.value
											);
										}
										onChange(newValues.join(","));
									}}
									disabled={disabled}
								/>
								<Label
									htmlFor={`${field.id}-${option.value}`}
									size="sm"
								>
									{option.label}
								</Label>
							</div>
						))}
					</div>
				);

			default:
				return (
					<Input
						id={field.id}
						type="text"
						value={value}
						onChange={(e) => onChange(e.target.value)}
						placeholder={field.placeholder}
						disabled={disabled}
						className={cn(error && "border-destructive")}
					/>
				);
		}
	};

	return (
		<div className="space-y-2">
			<Label htmlFor={field.id} className="text-xs font-medium text-muted-foreground">
				{field.name}
			</Label>
			{renderInput()}
			{field.helpText && (
				<p className="text-xs text-muted-foreground">{field.helpText}</p>
			)}
			{error && <p className="text-xs text-destructive">{error}</p>}
		</div>
	);
}
