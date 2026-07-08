import * as React from 'react';
import { Body, Container, Head, Html, Hr, Section, Text } from '@react-email/components';
import { EmailFooter } from './_shared';
import { EmailStyles } from './_shared/SharedStyle';

type InternalSupportCaseMessageEmailProps = {
    case: {
        id: number;
        subject: string;
        severity?: string | null;
        category?: string | null;
        status?: string | null;
    };
    vendor: {
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
        phone?: string | null;
    };
    agent?: {
        name?: string | null;
        email?: string | null;
    } | null;
    message: {
        content: string;
    };
};

const detailStyle: React.CSSProperties = {
    ...EmailStyles.paragraph,
    margin: '0 0 8px 0',
};

const labelStyle: React.CSSProperties = {
    fontWeight: 'bold',
};

export default function InternalSupportCaseMessageEmail({ case: supportCase, vendor, agent, message }: InternalSupportCaseMessageEmailProps) {
    const vendorName = [vendor.firstName, vendor.lastName].filter(Boolean).join(' ');
    const agentName = agent?.name || agent?.email;

    return (
        <Html>
            <Head />
            <Body style={EmailStyles.main}>
                <Container style={EmailStyles.container}>
                    <Section style={EmailStyles.content}>
                        <Text style={EmailStyles.h1}>New vendor support message</Text>
                        <Text style={detailStyle}><span style={labelStyle}>Case:</span> #{supportCase.id} — {supportCase.subject}</Text>
                        <Text style={detailStyle}><span style={labelStyle}>Severity:</span> {supportCase.severity || 'Not set'}</Text>
                        <Text style={detailStyle}><span style={labelStyle}>Category:</span> {supportCase.category || 'Not set'}</Text>
                        <Text style={detailStyle}><span style={labelStyle}>Status:</span> {supportCase.status || 'Not set'}</Text>
                        <Hr style={EmailStyles.divider} />
                        <Text style={detailStyle}><span style={labelStyle}>Vendor:</span> {vendorName || vendor.email || 'Not set'}</Text>
                        <Text style={detailStyle}><span style={labelStyle}>Vendor email:</span> {vendor.email || 'Not set'}</Text>
                        <Text style={detailStyle}><span style={labelStyle}>Vendor phone:</span> {vendor.phone || 'Not set'}</Text>
                        <Text style={detailStyle}><span style={labelStyle}>Assigned agent:</span> {agentName || 'Not set'}</Text>
                        <Hr style={EmailStyles.divider} />
                        <Text style={EmailStyles.sectionTitle}>Message</Text>
                        <Text style={EmailStyles.paragraph}>{message.content}</Text>
                        <Hr style={EmailStyles.divider} />
                        <Text style={EmailStyles.paragraph}>Internal Monstro support notification.</Text>
                    </Section>
                    <EmailFooter />
                </Container>
            </Body>
        </Html>
    );
}

InternalSupportCaseMessageEmail.PreviewProps = {
    case: {
        id: 101,
        subject: 'Billing question',
        severity: 'medium',
        category: 'billing',
        status: 'open',
    },
    vendor: {
        firstName: 'Sam',
        lastName: 'Vendor',
        email: 'sam@example.com',
        phone: '555-0100',
    },
    agent: {
        name: 'Agent Smith',
        email: 'agent@mymonstro.com',
    },
    message: {
        content: 'Can someone help with this invoice?',
    },
};
