import React from "react";
import {
	Document,
	Page,
	Text,
	View,
	Image,
	StyleSheet,
	pdf,
} from "@react-pdf/renderer";
import { parseMarkdownToPdf } from "./PDFParser";

export interface PDFSignature {
	/** Base64 PNG as saved by the signing pad. */
	image?: string | null;
	/** "Parent Name" or "Parent Name for Child Name". */
	name: string;
	/** Already formatted, e.g. "October 28, 2026". */
	signedOn: string;
}

interface PDFTemplateProps {
	title: string;
	content: string;
	signature?: PDFSignature;
}

const styles = StyleSheet.create({
	page: {
		flexDirection: "column",
		backgroundColor: "#FFFFFF",
		padding: 30,
		fontFamily: "Helvetica",
	},
	header: {
		marginBottom: 20,
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
		paddingBottom: 10,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#111827",
		marginBottom: 10,
	},
	content: {
		fontSize: 12,
		lineHeight: 1.6,
		color: "#374151",
	},
	paragraph: {
		marginBottom: 12,
		fontSize: 12,
		lineHeight: 1.6,
		color: "#374151",
	},
	heading1: {
		fontSize: 18,
		fontWeight: "bold",
		marginTop: 20,
		marginBottom: 10,
		color: "#111827",
	},
	heading2: {
		fontSize: 16,
		fontWeight: "bold",
		marginTop: 16,
		marginBottom: 8,
		color: "#111827",
	},
	heading3: {
		fontSize: 14,
		fontWeight: "bold",
		marginTop: 12,
		marginBottom: 6,
		color: "#111827",
	},
	listContainer: {
		marginBottom: 12,
	},
	listItem: {
		fontSize: 12,
		lineHeight: 1.6,
		color: "#374151",
		marginBottom: 4,
		marginLeft: 20,
	},
	bulletPoint: {
		marginRight: 8,
	},
	signatureBlock: {
		marginTop: 24,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: "#e5e7eb",
	},
	signatureImage: {
		width: 200,
		height: 70,
		objectFit: "contain",
		marginBottom: 6,
	},
	signatureName: {
		fontSize: 12,
		fontWeight: "bold",
		color: "#111827",
		marginBottom: 2,
	},
	signatureDate: {
		fontSize: 11,
		color: "#374151",
	},
});

const ContractDocument: React.FC<PDFTemplateProps> = ({ title, content, signature }) => {
	const parsedContent = parseMarkdownToPdf(content, styles);

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{title}</Text>
				</View>
				<View style={styles.content}>{parsedContent}</View>
				{signature && (
					<View style={styles.signatureBlock} wrap={false}>
						{signature.image && (
							<Image style={styles.signatureImage} src={`data:image/png;base64,${signature.image}`} />
						)}
						<Text style={styles.signatureName}>{signature.name}</Text>
						<Text style={styles.signatureDate}>Signed on {signature.signedOn}</Text>
					</View>
				)}
			</Page>
		</Document>
	);
};

export async function generatePDFBuffer(
	title: string,
	content: string,
	signature?: PDFSignature,
): Promise<Buffer> {
	try {
		const doc = <ContractDocument title={title} content={content} signature={signature} />;

		const blob = await pdf(doc).toBlob();
		const arrayBuffer = await blob.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		if (buffer.length === 0) {
			throw new Error("Generated PDF buffer is empty");
		}

		return buffer;
	} catch (error) {
		console.error("Error generating PDF buffer:", error);
		throw new Error(
			`PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"
			}`
		);
	}
}
