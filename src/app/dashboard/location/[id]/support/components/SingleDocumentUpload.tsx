"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Upload,
	Trash2,
	Download,
	AlertCircle,
	CheckCircle2,
	RefreshCw
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui";
import { DocumentMetadataUI } from "@subtrees/types/KnowledgeBase";

interface SingleDocumentUploadProps {
	existingDocument?: DocumentMetadataUI | null;
	onUpload: (file: File) => Promise<void>;
	onReplace: (file: File) => Promise<void>;
	onDelete: () => Promise<void>;
	isUploading?: boolean;
	supportAssistantId?: string;
}

export function SingleDocumentUpload({
	existingDocument,
	onUpload,
	onReplace,
	onDelete,
	isUploading = false,
}: SingleDocumentUploadProps) {
	const [dragOver, setDragOver] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const acceptedTypes = ['.pdf', '.doc', '.docx', '.txt'];
	const maxFileSize = 10 * 1024 * 1024; // 10MB

	const validateFile = (file: File): string | null => {
		// Check file type
		const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
		if (!acceptedTypes.includes(fileExtension)) {
			return `Invalid file type. Please upload: ${acceptedTypes.join(', ')}`;
		}

		// Check file size
		if (file.size > maxFileSize) {
			return `File size too large. Maximum size is ${formatFileSize(maxFileSize)}.`;
		}

		return null;
	};

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

	const handleFileSelect = async (file: File) => {
		setError(null);

		const validationError = validateFile(file);
		if (validationError) {
			setError(validationError);
			return;
		}

		try {
			if (existingDocument) {
				await onReplace(file);
			} else {
				await onUpload(file);
			}
		} catch (error) {
			console.error('File upload error:', error);
			setError('Failed to upload file. Please try again.');
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);

		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0) {
			handleFileSelect(files[0]);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			handleFileSelect(files[0]);
		}
		// Clear the input so the same file can be selected again
		e.target.value = '';
	};

	const openFileDialog = () => {
		fileInputRef.current?.click();
	};

	const handleDelete = async () => {
		setError(null);
		try {
			await onDelete();
		} catch (error) {
			console.error('File deletion error:', error);
			setError('Failed to delete file. Please try again.');
		}
	};

	// Show existing document
	if (existingDocument) {
		return (
			<div className="space-y-4">
				{error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<Card className="border-green-200 bg-green-50/50">
					<CardContent className="p-4">
						<div className="flex items-start justify-between">
							<div className="flex items-start gap-3 flex-1">
								<div className="mt-0.5">
									<CheckCircle2 size={20} className="text-green-600" />
								</div>
								<div className="flex-1 min-w-0">
									<h3 className="font-medium text-sm mb-1 text-green-900">
										{existingDocument.name}
									</h3>
									<div className="flex items-center gap-2 mb-2">
										<Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
											Document uploaded
										</Badge>
										{existingDocument.size && (
											<span className="text-xs text-green-700">
												{formatFileSize(existingDocument.size)}
											</span>
										)}
									</div>
									<p className="text-xs text-green-700">
										Uploaded {existingDocument.created}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-1 ml-2">
								<Button
									variant="ghost"
									size="sm"
									className="h-8 w-8 p-0 text-green-700 hover:text-green-800 hover:bg-green-100"
									title="Download document"
								>
									<Download size={14} />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={openFileDialog}
									disabled={isUploading}
									className="h-8 w-8 p-0 text-green-700 hover:text-green-800 hover:bg-green-100"
									title="Replace document"
								>
									{isUploading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={handleDelete}
									disabled={isUploading}
									className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
									title="Delete document"
								>
									<Trash2 size={14} />
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				<div className="text-center">
					<input
						ref={fileInputRef}
						type="file"
						accept={acceptedTypes.join(',')}
						onChange={handleFileInputChange}
						style={{ display: 'none' }}
						disabled={isUploading}
					/>
					<Button
						variant="outline"
						onClick={openFileDialog}
						disabled={isUploading}
						className="gap-2"
					>
						{isUploading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
						{isUploading ? 'Replacing...' : 'Replace Document'}
					</Button>
					<p className="text-xs text-muted-foreground mt-2">
						Replace the current document with a new one
					</p>
				</div>
			</div>
		);
	}

	// Show upload area when no document exists
	return (
		<div className="space-y-4">
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<div
				className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${dragOver
						? 'border-blue-500 bg-blue-50'
						: 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
					}
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onClick={openFileDialog}
			>
				<input
					ref={fileInputRef}
					type="file"
					accept={acceptedTypes.join(',')}
					onChange={handleFileInputChange}
					style={{ display: 'none' }}
					disabled={isUploading}
				/>

				<div className="space-y-4">
					<div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
						{isUploading ? (
							<RefreshCw size={24} className="text-gray-600 animate-spin" />
						) : (
							<Upload size={24} className="text-gray-600" />
						)}
					</div>

					<div>
						<h3 className="text-lg font-medium mb-2">
							{isUploading ? 'Uploading...' : 'Upload Support Document'}
						</h3>
						<p className="text-muted-foreground mb-4">
							{isUploading
								? 'Please wait while your document is being uploaded'
								: 'Drag and drop your document here, or click to browse'
							}
						</p>

						{!isUploading && (
							<div className="space-y-2">
								<Button className="gap-2">
									<Upload size={16} />
									Choose File
								</Button>
								<div className="text-xs text-muted-foreground space-y-1">
									<p>Supported formats: {acceptedTypes.join(', ')}</p>
									<p>Maximum size: {formatFileSize(maxFileSize)}</p>
									<p><strong>Note:</strong> Only one document can be uploaded per support assistant</p>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
