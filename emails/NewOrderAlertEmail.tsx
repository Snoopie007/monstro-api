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

type OrderEmailItem = {
    productName: string;
    quantity: number;
    unitCost: number;
};

type NewOrderAlertEmailProps = {
    member: {
        firstName: string;
        lastName?: string | null;
        email: string;
        phone?: string | null;
    };
    location: {
        name: string;
    };
    order: {
        id: string;
        trackingNumber?: string | number | null;
        subtotal: number;
        shipping?: number | null;
        tax?: number | null;
        processingFee?: number | null;
        total: number;
        items: OrderEmailItem[];
    };
};

const styles: Record<string, React.CSSProperties> = {
    ...EmailStyles,
    itemsTable: {
        width: '100%',
        borderCollapse: 'collapse',
        margin: '16px 0',
    },
    itemCell: {
        padding: '8px 0',
        borderBottom: '1px solid rgba(67, 56, 202, 0.16)',
        verticalAlign: 'top',
    },
    itemPriceCell: {
        padding: '8px 0 8px 12px',
        borderBottom: '1px solid rgba(67, 56, 202, 0.16)',
        textAlign: 'right',
        verticalAlign: 'top',
        whiteSpace: 'nowrap',
    },
    itemName: {
        color: '#111827',
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
    },
    itemQuantity: {
        color: '#6b7280',
        display: 'block',
        fontSize: '12px',
        marginTop: '2px',
    },
};

function formatCurrency(amount: number | null | undefined) {
    return currencyFormatter.format((amount ?? 0) / 100);
}

function OrderItemsTable({ items }: { items: OrderEmailItem[] }) {
    return (
        <table cellPadding={0} cellSpacing={0} style={styles.itemsTable}>
            <tbody>
                {items.map((item, index) => (
                    <tr key={`${item.productName}-${index}`}>
                        <td style={styles.itemCell}>
                            <span style={styles.itemName}>{item.productName}</span>
                            <span style={styles.itemQuantity}>Qty {item.quantity}</span>
                        </td>
                        <td style={styles.itemPriceCell}>{formatCurrency(item.unitCost * item.quantity)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function NewOrderAlertEmail({ member, location, order }: NewOrderAlertEmailProps) {
    const displayOrderNumber = String(order.trackingNumber || order.id);
    const memberName = [member.firstName, member.lastName].filter(Boolean).join(' ');
    const meta = [
        { label: 'Order number', value: displayOrderNumber },
        { label: 'Customer', value: memberName },
        { label: 'Email', value: member.email },
        ...(member.phone ? [{ label: 'Phone', value: member.phone }] : []),
        { label: 'Subtotal', value: formatCurrency(order.subtotal) },
        ...(order.shipping ? [{ label: 'Shipping', value: formatCurrency(order.shipping) }] : []),
        ...(order.tax ? [{ label: 'Tax', value: formatCurrency(order.tax) }] : []),
        ...(order.processingFee ? [{ label: 'Processing fee', value: formatCurrency(order.processingFee) }] : []),
    ];

    return (
        <Html>
            <Head />
            <Body style={styles.main}>
                <Container style={styles.container}>
                    <Section style={styles.content}>
                        <Text style={styles.paragraph}>New paid ecommerce order for <strong>{location.name}</strong>.</Text>

                        <EmailInvoiceBox style={{ backgroundColor: '#eef2ff', border: '1px solid #4338ca' }}>
                            <EmailInvoiceLabel label="Order total" />
                            <EmailInvoiceAmount amount={order.total} />
                            <EmailInvoiceLabel label={`Order #${displayOrderNumber}`} />
                            <EmailInvoiceBoxDivider borderColor="rgba(67, 56, 202, 0.2)" />
                            <OrderItemsTable items={order.items} />
                            <EmailInvoiceReceiptMeta MetaData={meta} />
                        </EmailInvoiceBox>

                        <Text style={styles.paragraph}>Review the order in Monstro before fulfillment.</Text>
                    </Section>
                    <EmailFooter />
                </Container>
            </Body>
        </Html>
    );
}

NewOrderAlertEmail.PreviewProps = {
    member: { firstName: 'Allen', lastName: 'Ponce', email: 'allen@example.com', phone: '(555) 555-0100' },
    location: { name: 'Virtues Jiu-Jitsu' },
    order: {
        id: 'ord_123',
        trackingNumber: 123456789,
        subtotal: 4000,
        shipping: 0,
        tax: 330,
        processingFee: 0,
        total: 4330,
        items: [
            { productName: 'Academy T-Shirt', quantity: 1, unitCost: 2000 },
            { productName: 'Academy Rashguard', quantity: 1, unitCost: 2000 },
        ],
    },
};
