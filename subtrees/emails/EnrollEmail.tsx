import * as React from 'react';
import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
} from '@react-email/components';
import { EmailStyles } from './_shared/SharedStyle';
import {
    EmailFooter,
    EmailInvoiceBox,
    EmailInvoiceLabel,
    EmailInvoiceAmount,
    EmailInvoiceReceiptMeta,
    EmailInvoiceBoxDivider,
    LocationInfoBox,
    AppDownloadSection,
} from './_shared';
import { DummyData } from './_shared/data';
import { format } from 'date-fns';
import type { Member, Location } from '../types';

interface EnrollEmailProps {
    member: Pick<Member, 'firstName' | 'lastName'>;
    location: Pick<Location, 'name' | 'address' | 'email' | 'phone'>;
    planType: 'subscription' | 'package';
    planName: string;
    receipt: {
        id: string;
        paidDate: string;
        subtotal: number;
        tax: number;
        fees: number;
        discount?: number;
        total: number;
    };
}

const styles: Record<string, React.CSSProperties> = {
    ...EmailStyles,
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount / 100);
}

export default function EnrollEmail({
    member,
    location,
    planType,
    planName,
    receipt,
}: EnrollEmailProps) {
    const planLabel = planType === 'subscription' ? 'subscription' : 'package';
    const meta = [
        { label: 'Receipt number', value: receipt.id },
        { label: 'Plan type', value: planType === 'subscription' ? 'Subscription' : 'Package' },
        { label: 'Plan', value: planName },
        { label: 'Subtotal', value: formatCurrency(receipt.subtotal) },
        ...(receipt.discount
            ? [{ label: 'Discount', value: `-${formatCurrency(receipt.discount)}` }]
            : []),
        ...(receipt.fees
            ? [{ label: 'Fees', value: formatCurrency(receipt.fees) }]
            : []),
        ...(receipt.tax
            ? [{ label: 'Tax', value: formatCurrency(receipt.tax) }]
            : []),
        { label: 'Total', value: formatCurrency(receipt.total) },
    ];

    return (
        <Html>
            <Head />
            <Body style={styles.main}>
                <Container style={styles.container}>
                    <Section style={styles.content}>
                        <Text style={styles.paragraph}>
                            Hi {member.firstName}{member.lastName ? ` ${member.lastName}` : ''},
                        </Text>

                        <Text style={styles.paragraph}>
                            Thank you for enrolling in <strong>{planName}</strong> at{' '}
                            <strong>{location.name}</strong>. Your {planLabel} is confirmed.
                        </Text>

                        <EmailInvoiceBox style={{ backgroundColor: '#f0fdf4', border: '1px solid #16a34a' }}>
                            <EmailInvoiceLabel label={`Receipt from ${location.name}`} />
                            <EmailInvoiceAmount amount={receipt.total} />
                            <EmailInvoiceLabel
                                label={`Paid ${format(new Date(receipt.paidDate), 'MMMM d, yyyy')}`}
                            />
                            <EmailInvoiceBoxDivider borderColor="rgba(22, 163, 74, 0.2)" />
                            <Section style={{ margin: '16px 0' }}>
                                <EmailInvoiceReceiptMeta MetaData={meta} />
                            </Section>
                        </EmailInvoiceBox>

                        <Text style={styles.paragraph}>
                            Looking forward to seeing you at your first class! Next step is to download our app and start your membership.
                        </Text>
                        <AppDownloadSection />
                        <LocationInfoBox
                            name={location.name}
                            address={location.address}
                            email={location.email}
                            phone={location.phone}
                        />
                    </Section>
                    <EmailFooter social={true} />
                </Container>
            </Body>
        </Html>
    );
}

EnrollEmail.PreviewProps = {
    ...DummyData,
    planType: 'subscription',
    planName: 'Adult Unlimited Monthly',
    receipt: {
        id: 'inv_enroll_123',
        paidDate: new Date().toISOString(),
        subtotal: 15000,
        tax: 1200,
        fees: 500,
        discount: 0,
        total: 16700,
    },
} as EnrollEmailProps;
