import {
    Section, Text

} from "@react-email/components";
import * as React from 'react';

const styles: Record<string, React.CSSProperties> = {
    emailBox: {
        backgroundColor: '#F3F4F6',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '8px',
    },
    emailBoxLabel: {
        fontSize: '12px',
        color: '#6B7280',
        textTransform: 'uppercase',
        margin: '0 0 4px 0',
        fontWeight: '600',
    },
    emailTitle: {
        fontSize: '16px',
        color: '#111827',
        margin: '0 0 4px 0',
        fontWeight: '600',
    },
    emailBoxContent: {
        fontSize: '15px',
        margin: '0',
    },
};

interface EmailBoxProps {
    bgColor: string;
    children: React.ReactNode;
}

export const EmailBox = React.forwardRef<HTMLElement, EmailBoxProps>(function EmailBox({ bgColor, children }, ref) {
    // Section from @react-email/components renders as <section> so HTMLElement as ref
    return (
        <Section ref={ref as React.RefObject<HTMLElement>} style={{
            ...styles.emailBox,
            backgroundColor: bgColor,
        }}>
            {children}
        </Section>
    );
});

interface EmailBoxTitleProps {
    title: string;
    color?: string;
}

export const EmailBoxTitle = React.forwardRef<HTMLParagraphElement, EmailBoxTitleProps>(function EmailBoxTitle({ title, color }, ref) {
    // Text from @react-email/components renders as <p> so HTMLParagraphElement for ref
    return (
        <Text ref={ref} style={{
            ...styles.emailTitle,
            color: color || '#111827',
        }}>{title}</Text>
    );
});

interface EmailBoxContentProps {
    children: React.ReactNode;
}

export const EmailBoxContent = React.forwardRef<HTMLParagraphElement, EmailBoxContentProps>(function EmailBoxContent({ children }, ref) {
    return (
        <>
            {children}
        </>
    );
});

interface EmailBoxLabelProps {
    label: string;
    color?: string;
}

export const EmailBoxLabel = React.forwardRef<HTMLParagraphElement, EmailBoxLabelProps>(function EmailBoxLabel({ label, color }, ref) {
    return (
        <Text ref={ref} style={{
            ...styles.emailBoxLabel,
            color: color || '#6B7280',
        }}>{label}</Text>
    );
});