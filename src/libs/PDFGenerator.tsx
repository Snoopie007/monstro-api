import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { Contract } from "@/types/contract";
import { parseHTMLContent } from "./PDFParser";

interface PDFTemplateProps {
  template: Contract;
  variables: Record<string, any>;
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
});

const ContractDocument: React.FC<PDFTemplateProps> = ({
  template,
  variables,
}) => {
  // Parse HTML content and convert to react-pdf components
  const parsedContent = parseHTMLContent(
    template.content || "",
    variables,
    styles
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{template.title}</Text>
        </View>
        <View style={styles.content}>{parsedContent}</View>
      </Page>
    </Document>
  );
};

export async function generatePDFBuffer(
  template: Contract,
  variables: Record<string, any>
): Promise<Buffer> {
  try {
    const doc = <ContractDocument template={template} variables={variables} />;

    // Generate PDF blob and convert to buffer for AWS SDK compatibility
    const blob = await pdf(doc).toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate buffer has content
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
