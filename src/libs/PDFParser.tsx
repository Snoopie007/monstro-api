import React from "react";
import { Text, View } from "@react-pdf/renderer";
import * as cheerio from "cheerio";

interface ReactPDFStyles {
  [key: string]: any;
}

// Interpolate variables in HTML content
function interpolateVariables(
  template: string,
  variables: Record<string, any>
): string {
  if (!template) return "";

  // Handle span elements with data-value attributes (from your existing system)
  let processed = template.replace(
    /<span[^>]*data-value="([^"]*)"[^>]*>@[^<]*<\/span>/g,
    (_, path) => {
      const value = path
        .split(".")
        .reduce(
          (obj: Record<string, any> | undefined, key: string) =>
            obj && typeof obj === "object" ? obj[key] : undefined,
          variables
        );
      return value !== undefined ? String(value) : `@${path}`;
    }
  );

  // Handle simple {{variable.path}} syntax
  processed = processed.replace(
    /\{\{([^}]+)\}\}/g,
    (match: string, path: string): string => {
      const value = path
        .split(".")
        .reduce((obj: any, key: string) => obj?.[key], variables);
      return value !== undefined ? String(value) : match;
    }
  );

  return processed;
}

function cleanText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function convertElementToReactPDF(
  $: cheerio.Root,
  element: cheerio.Element,
  key: number,
  styles: ReactPDFStyles
): React.JSX.Element | null {
  const tagName = (element as any).tagName?.toLowerCase();
  const textContent = cleanText($(element).text());

  if (!textContent && !["div", "section", "article"].includes(tagName || "")) {
    return null;
  }

  switch (tagName) {
    case "p":
      return (
        <Text key={key} style={styles.paragraph}>
          {textContent}
        </Text>
      );

    case "h1":
      return (
        <Text key={key} style={styles.heading1}>
          {textContent}
        </Text>
      );

    case "h2":
      return (
        <Text key={key} style={styles.heading2}>
          {textContent}
        </Text>
      );

    case "h3":
      return (
        <Text key={key} style={styles.heading3}>
          {textContent}
        </Text>
      );

    case "ul":
    case "ol":
      const listItems: React.JSX.Element[] = [];
      $(element)
        .children("li")
        .each((index: number, listItem: any) => {
          const itemText = cleanText($(listItem).text());
          if (itemText) {
            listItems.push(
              <View
                key={`${key}-item-${index}`}
                style={{ flexDirection: "row", marginBottom: 4 }}
              >
                <Text style={styles.bulletPoint}>
                  {tagName === "ul" ? "•" : `${index + 1}.`}
                </Text>
                <Text style={styles.listItem}>{itemText}</Text>
              </View>
            );
          }
        });

      if (listItems.length > 0) {
        return (
          <View key={key} style={styles.listContainer}>
            {listItems}
          </View>
        );
      }
      return null;

    case "div":
    case "section":
    case "article":
      // For container elements, process children
      const children: React.JSX.Element[] = [];
      $(element)
        .children()
        .each((index: number, child: any) => {
          const childElement = convertElementToReactPDF(
            $,
            child,
            `${key}-child-${index}` as any,
            styles
          );
          if (childElement) {
            children.push(childElement);
          }
        });

      if (children.length > 0) {
        return (
          <View key={key} style={{ marginBottom: 8 }}>
            {children}
          </View>
        );
      }

      // If no children but has direct text content
      if (textContent) {
        return (
          <Text key={key} style={styles.paragraph}>
            {textContent}
          </Text>
        );
      }
      return null;

    case "br":
      return (
        <Text key={key} style={styles.paragraph}>
          {"\n"}
        </Text>
      );

    case "strong":
    case "b":
      return (
        <Text key={key} style={[styles.paragraph, { fontWeight: "bold" }]}>
          {textContent}
        </Text>
      );

    case "em":
    case "i":
      return (
        <Text key={key} style={[styles.paragraph, { fontStyle: "italic" }]}>
          {textContent}
        </Text>
      );

    default:
      // For unhandled elements, just render as text if they have content
      if (textContent) {
        return (
          <Text key={key} style={styles.paragraph}>
            {textContent}
          </Text>
        );
      }
      return null;
  }
}

export function parseHTMLContent(
  htmlContent: string,
  variables: Record<string, any>,
  styles: ReactPDFStyles
): React.JSX.Element[] {
  // First interpolate variables
  const interpolatedHTML = interpolateVariables(htmlContent, variables);

  // Parse HTML structure
  const cheerioApi = cheerio.load(`<div>${interpolatedHTML}</div>`);
  const elements: React.JSX.Element[] = [];

  // Process each top-level element in the content
  cheerioApi("body > div")
    .children()
    .each((index: number, element: cheerio.Element) => {
      const reactPdfElement = convertElementToReactPDF(
        cheerioApi,
        element,
        index,
        styles
      );
      if (reactPdfElement) {
        elements.push(reactPdfElement);
      }
    });

  // If no elements were found, try to process the entire content as text
  if (elements.length === 0 && interpolatedHTML.trim()) {
    const textContent = cheerioApi("body").text().trim();
    if (textContent) {
      elements.push(
        <Text key="fallback" style={styles.paragraph}>
          {textContent}
        </Text>
      );
    }
  }

  return elements;
}
