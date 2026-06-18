import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { List, ListItem, PhrasingContent, Root, RootContent } from "mdast";

interface ReactPDFStyles {
    [key: string]: any;
}

const markdownParser = unified().use(remarkParse).use(remarkGfm);

function renderPhrasing(
    nodes: PhrasingContent[],
    keyPrefix: string,
): React.ReactNode[] {
    return nodes.map((node, index) => {
        const key = `${keyPrefix}-${index}`;

        switch (node.type) {
            case "text":
                return node.value;
            case "strong":
                return (
                    <Text key={key} style={{ fontWeight: "bold" }}>
                        {renderPhrasing(node.children, key)}
                    </Text>
                );
            case "emphasis":
                return (
                    <Text key={key} style={{ fontStyle: "italic" }}>
                        {renderPhrasing(node.children, key)}
                    </Text>
                );
            case "inlineCode":
                return node.value;
            case "break":
                return "\n";
            case "delete":
                return renderPhrasing(node.children, key);
            default:
                return null;
        }
    });
}

function renderListItemContent(
    item: ListItem,
    keyPrefix: string,
    styles: ReactPDFStyles,
): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];

    for (const [index, child] of item.children.entries()) {
        if (child.type === "paragraph") {
            nodes.push(...renderPhrasing(child.children, `${keyPrefix}-p-${index}`));
            continue;
        }
        if (child.type === "list") {
            const element = renderBlock(child, `${keyPrefix}-list-${index}`, styles);
            if (element) nodes.push(element);
        }
    }

    return nodes;
}

function renderBlock(
    node: RootContent,
    key: string,
    styles: ReactPDFStyles,
): React.JSX.Element | null {
    switch (node.type) {
        case "heading": {
            const headingStyle = node.depth === 1
                ? styles.heading1
                : node.depth === 2
                    ? styles.heading2
                    : styles.heading3;

            return (
                <Text key={key} style={headingStyle}>
                    {renderPhrasing(node.children, key)}
                </Text>
            );
        }

        case "paragraph":
            return (
                <Text key={key} style={styles.paragraph}>
                    {renderPhrasing(node.children, key)}
                </Text>
            );

        case "list": {
            const list = node as List;
            const items = list.children.map((item, index) => {
                if (item.type !== "listItem") return null;

                return (
                    <View
                        key={`${key}-item-${index}`}
                        style={{ flexDirection: "row", marginBottom: 4 }}
                    >
                        <Text style={styles.bulletPoint}>
                            {list.ordered ? `${index + 1}.` : "•"}
                        </Text>
                        <Text style={styles.listItem}>
                            {renderListItemContent(item, `${key}-item-${index}`, styles)}
                        </Text>
                    </View>
                );
            }).filter((item): item is React.JSX.Element => item !== null);

            if (items.length === 0) return null;

            return (
                <View key={key} style={styles.listContainer}>
                    {items}
                </View>
            );
        }

        case "blockquote": {
            const children = node.children
                .map((child, index) => renderBlock(child, `${key}-quote-${index}`, styles))
                .filter((child): child is React.JSX.Element => child !== null);

            if (children.length === 0) return null;

            return (
                <View key={key} style={{ marginBottom: 12, paddingLeft: 12 }}>
                    {children}
                </View>
            );
        }

        case "thematicBreak":
            return (
                <View
                    key={key}
                    style={{
                        borderBottomWidth: 1,
                        borderBottomColor: "#e5e7eb",
                        marginVertical: 12,
                    }}
                />
            );

        default:
            return null;
    }
}

export function parseMarkdownToPdf(
    content: string,
    styles: ReactPDFStyles,
): React.JSX.Element[] {
    const trimmed = content.trim();
    if (!trimmed) return [];

    const tree = markdownParser.parse(trimmed) as Root;
    const elements = tree.children
        .map((node, index) => renderBlock(node, String(index), styles))
        .filter((element): element is React.JSX.Element => element !== null);

    if (elements.length === 0) {
        return [
            <Text key="fallback" style={styles.paragraph}>
                {trimmed}
            </Text>,
        ];
    }

    return elements;
}
