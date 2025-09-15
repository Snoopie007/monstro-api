"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus } from "lucide-react";
import { QAEntryUI } from "@/types/knowledgeBase";

interface QAEntryFormProps {
	onSubmit: (entry: { question: string; answer: string }) => void;
	onCancel: () => void;
	initialData?: QAEntryUI | null;
	isSubmitting?: boolean;
}

export function QAEntryForm({
	onSubmit,
	onCancel,
	initialData,
	isSubmitting = false,
}: QAEntryFormProps) {
	const [question, setQuestion] = useState("");
	const [answer, setAnswer] = useState("");
	const [errors, setErrors] = useState<{ question?: string; answer?: string }>({});

	useEffect(() => {
		if (initialData) {
			setQuestion(initialData.question);
			setAnswer(initialData.answer);
		}
	}, [initialData]);

	const validateForm = () => {
		const newErrors: { question?: string; answer?: string } = {};
		if (!question.trim()) {
			newErrors.question = "Question is required";
		} else if (question.trim().length < 5) {
			newErrors.question = "Question must be at least 5 characters";
		}

		if (!answer.trim()) {
			newErrors.answer = "Answer is required";
		} else if (answer.trim().length < 10) {
			newErrors.answer = "Answer must be at least 10 characters";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateForm()) {
			return;
		}
		onSubmit({
			question: question.trim(),
			answer: answer.trim(),
		});
	};

	const handleReset = () => {
		setQuestion("");
		setAnswer("");
		setErrors({});
	};

	return (
		<Card className="mb-4">
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg">
						{initialData ? "Edit Q&A Entry" : "Add New Q&A Entry"}
					</CardTitle>
					<Button
						variant="ghost"
						size="sm"
						onClick={onCancel}
						className="h-8 w-8 p-0"
					>
						<X size={16} />
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="question">Question</Label>
						<Textarea
							id="question"
							value={question}
							onChange={(e) => setQuestion(e.target.value)}
							placeholder="Enter the question that customers might ask..."
							className={`min-h-[100px] ${errors.question ? "border-red-500" : ""}`}
							disabled={isSubmitting}
						/>
						{errors.question && (
							<p className="text-sm text-red-500">{errors.question}</p>
						)}
						<p className="text-xs text-muted-foreground">
							Examples: "What are your operating hours?", "How do I cancel my membership?"
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="answer">Answer</Label>
						<Textarea
							id="answer"
							value={answer}
							onChange={(e) => setAnswer(e.target.value)}
							placeholder="Enter the detailed answer to provide to customers..."
							className={`min-h-[120px] ${errors.answer ? "border-red-500" : ""}`}
							disabled={isSubmitting}
						/>
						{errors.answer && (
							<p className="text-sm text-red-500">{errors.answer}</p>
						)}
						<p className="text-xs text-muted-foreground">
							Provide a complete, helpful answer that your support bot can use to respond to customers.
						</p>
					</div>

					<div className="flex gap-2 pt-2">
						<Button
							type="submit"
							disabled={isSubmitting || !question.trim() || !answer.trim()}
							className="gap-2"
						>
							<Plus size={16} />
							{isSubmitting
								? "Saving..."
								: initialData
									? "Update Entry"
									: "Add Entry"
							}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={handleReset}
							disabled={isSubmitting}
						>
							Clear
						</Button>
						<Button
							type="button"
							variant="ghost"
							onClick={onCancel}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
