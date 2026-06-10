import * as React from 'react';
import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
} from '@react-email/components';
import { EmailFooter } from './_shared';
import {
    EmailInvoiceAmount,
    EmailInvoiceBox,
    EmailInvoiceBoxDivider,
    EmailInvoiceLabel,
    EmailInvoiceReceiptMeta,
} from './_shared/EmailInvoiceBox';
import { EmailStyles } from './_shared/SharedStyle';

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
});

const statusLabels: Record<string, string> = {
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
};

const statusMessages: Record<string, string> = {
    shipped: 'Your order is on its way.',
    delivered: 'Your order has been marked as delivered.',
    cancelled: 'Your order has been cancelled.',
    refunded: 'Your order has been refunded.',
};

type OrderStatusUpdateEmailProps = {
    member: {
        firstName: string;
        lastName?: string | null;
    };
    location: {
        name: string;
        email?: string | null;
        phone?: string | null;
    };
    order: {
        id: string;
        trackingNumber?: string | number | null;
        status: string;
        total: number;
    };
};

const styles: Record<string, React.CSSProperties> = {
    ...EmailStyles,
};


export default function OrderStatusUpdateEmail({ member, location, order }: OrderStatusUpdateEmailProps) {
    const displayOrderNumber = String(order.trackingNumber || order.id);
    const memberName = [member.firstName, member.lastName].filter(Boolean).join(' ');
    const statusLabel = statusLabels[order.status] || order.status;

    return (
        <Html>
            <Head />
            <Body style={styles.main}>
                <Container style={styles.container}>
                    <Section style={styles.content}>
                        <Text style={styles.paragraph}>Hi {memberName},</Text>
                        <Text style={styles.paragraph}>
                            {statusMessages[order.status] || `Your order status changed to ${statusLabel}.`}
                        </Text>

                        <EmailInvoiceBox>
                            <EmailInvoiceLabel label={`Order #${displayOrderNumber}`} />
                            <EmailInvoiceAmount amount={order.total} />
                            <EmailInvoiceLabel label={`Status: ${statusLabel}`} />
                            <EmailInvoiceBoxDivider />
                            <EmailInvoiceReceiptMeta MetaData={[
                                { label: 'Order number', value: displayOrderNumber },
                                { label: 'Status', value: statusLabel },
                                { label: 'Total', value: currencyFormatter.format(order.total / 100) },
                            ]} />
                        </EmailInvoiceBox>

                        <Text style={styles.paragraph}>
                            If you have questions about this order, contact <strong>{location.name}</strong>
                            {location.email ? <> at {location.email}</> : null}
                            {location.phone ? <> or {location.phone}</> : null}.
                        </Text>
                    </Section>
                    <EmailFooter />
                </Container>
            </Body>
        </Html>
    );
}

OrderStatusUpdateEmail.PreviewProps = {
    member: { firstName: 'Allen', lastName: 'Ponce' },
    location: { name: 'Virtues Jiu-Jitsu', email: 'hello@example.com', phone: '(555) 555-0100' },
    order: {
        id: 'ord_123',
        trackingNumber: 123456789,
        status: 'shipped',
        total: 4330,
    },
};
