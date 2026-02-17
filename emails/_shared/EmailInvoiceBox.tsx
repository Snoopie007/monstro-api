import { Button, Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';

type InvoiceItem = {
    name: string;
    quantity: number;
    price: number;
    productId?: string;
}
function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount / 100);
}
const styles: Record<string, React.CSSProperties> = {

    invoiceBox: {
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        margin: '0 0 20px 0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    },
    invoiceBoxLabel: {
        fontSize: '14px',
        lineHeight: '1.2',
        color: '#6b7280',
        margin: '0',
        fontWeight: '600',
    },
    invoiceBoxDivider: {
        width: '75%',
        margin: '14px 0',
        borderColor: 'rgba(0,0,0,0.1)',
        borderStyle: 'solid',
        borderWidth: '1px 0 0 0',
    },

    amount: {
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: '32px',
        lineHeight: '1.2',
        fontWeight: '700',
        margin: '6px 0 ',
    },

    downloadLink: {
        fontSize: '15px',
        color: '#6b7280',
        margin: '0 0 16px 0',
    },
    metaTable: {
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: '14px',
        width: '100%',
        borderCollapse: 'collapse' as const,
        margin: '0',
    },
    metaCellLabel: {
        color: '#374151',
        fontWeight: '400',
        padding: '4px 12px 4px 0',
        verticalAlign: 'top',
        whiteSpace: 'nowrap' as const,
    },
    metaCellValue: {
        color: '#222',
        fontWeight: '600',
        padding: '4px 0',
    },
    payButton: {
        color: '#fff',
        fontSize: '16px',
        fontWeight: 'bold',
        borderRadius: '10px',
        textDecoration: 'none',
        padding: '14px 25px',
        backgroundColor: '#4338ca',
        marginTop: '20px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        display: 'block',
        textAlign: 'center',
    },

    itemsTable: {
        width: '100%',
        borderCollapse: 'collapse' as const,
        fontFamily: 'Helvetica, Arial, sans-serif',
        margin: '0 0 16px 0',
    },

    itemRow: {
        borderBottom: '1px solid #e5e7eb',
    },
    itemCell: {
        verticalAlign: 'top',
        padding: '8px 0',
    },
    itemCellPrice: {
        verticalAlign: 'top',
        padding: '8px 0 8px 12px',
        textAlign: 'right' as const,
        width: '1%',
        whiteSpace: 'nowrap' as const,
    },
    itemValue: {
        fontSize: '14px',
        display: 'block',
        fontWeight: '600',
        color: '#111827',
        margin: '0',
    },
    itemQuantity: {
        fontSize: '12px',
        color: '#6b7280',
        margin: '0',
    },

    receiptMetaTable: {
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: '14px',
        width: '100%',
        borderCollapse: 'collapse',
    },
    receiptMetaCellLabel: {
        color: '#6b7280',
        padding: '4px 12px 4px 0',
        verticalAlign: 'top',
        width: '1%',
        fontWeight: '500',
        whiteSpace: 'nowrap',
    },
    receiptMetaCellValue: {
        color: '#000',
        padding: '4px 0',
        fontWeight: '500',
        textAlign: 'right',
        width: '99%',
    },



};

interface EmailInvoiceBoxProps extends React.HTMLAttributes<HTMLElement> {
    children: React.ReactNode;
    style?: React.CSSProperties;
}

export const EmailInvoiceBox = React.forwardRef<HTMLElement, EmailInvoiceBoxProps>(({ children, style, ...props }, ref) => {
    return (
        <Section ref={ref as React.RefObject<HTMLElement>} style={{ ...styles.invoiceBox, ...style }} {...props}>
            {children}
        </Section>
    );
});

EmailInvoiceBox.displayName = 'EmailInvoiceBox';


interface EmailInvoiceBoxDividerProps {
    borderColor?: string;
}
export const EmailInvoiceBoxDivider = React.forwardRef<HTMLHRElement, EmailInvoiceBoxDividerProps>(({ borderColor }, ref) => {
    return (
        <Hr ref={ref} style={{ ...styles.invoiceBoxDivider, borderColor }} />
    );
});

EmailInvoiceBoxDivider.displayName = 'EmailInvoiceBoxDivider';


interface EmailInvoiceBoxMetaDataProps {
    MetaData: { label: string; value: string }[];
}

export const EmailInvoiceBoxMetaData = React.forwardRef<HTMLElement, EmailInvoiceBoxMetaDataProps>(({ MetaData }, ref) => {
    return (
        <Section style={{ margin: '16px 0' }}>

            <table cellPadding={0} cellSpacing={0} style={styles.metaTable}>
                <tbody>
                    {MetaData.map((meta, idx) => (
                        <tr key={idx}>
                            <td style={styles.metaCellLabel}>{meta.label}</td>
                            <td style={styles.metaCellValue}>{meta.value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Section>
    );
});

EmailInvoiceBoxMetaData.displayName = 'EmailInvoiceBoxMetaData';

interface EmailInvoiceLabelProps {
    label: string;
    style?: React.CSSProperties;
}

export const EmailInvoiceLabel = React.forwardRef<HTMLParagraphElement, EmailInvoiceLabelProps>(({ label, style }, ref) => {
    return (
        <Text ref={ref} style={{ ...styles.invoiceBoxLabel, ...style }}>{label}</Text>
    );
});

EmailInvoiceLabel.displayName = 'EmailInvoiceLabel';

interface EmailInvoiceAmountProps {
    amount: number;
}

export const EmailInvoiceAmount = React.forwardRef<HTMLParagraphElement, EmailInvoiceAmountProps>(({ amount }, ref) => {
    return (
        <Text ref={ref} style={styles.amount}>{formatCurrency(amount)}</Text>
    );
});

EmailInvoiceAmount.displayName = 'EmailInvoiceAmount';

interface EmailInvoiceDownloadLinkProps {
    href: string;
}

export const EmailInvoiceDownloadLink = React.forwardRef<HTMLAnchorElement, EmailInvoiceDownloadLinkProps>(({ href }, ref) => {
    return (
        <Link href={href} style={styles.downloadLink}>Download invoice</Link>
    );
});

EmailInvoiceDownloadLink.displayName = 'EmailInvoiceDownloadLink';


interface EmailInvoicePayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    href: string;
    text: string;
}

export const EmailInvoicePayButton = React.forwardRef<HTMLButtonElement, EmailInvoicePayButtonProps>(({ href, text, ...props }, ref) => {
    return (
        <Button ref={ref} style={styles.payButton} href={href} {...props}>{text || 'Pay this invoice'}</Button>
    );
});

EmailInvoicePayButton.displayName = 'EmailInvoicePayButton';


interface EmailInvoiceItemsTableProps {
    items: InvoiceItem[];
    total: number;
}
export const EmailInvoiceItemsTable = React.forwardRef<HTMLTableElement, EmailInvoiceItemsTableProps>(({ items, total }, ref) => {


    return (
        <table cellPadding={0} cellSpacing={0} style={styles.itemsTable}>
            <tbody>
                {items.map((item, index) => (
                    <tr key={index} style={styles.itemRow}>
                        <td style={styles.itemCell}>
                            <span style={styles.itemValue}>{item.name}</span>
                            <span style={styles.itemQuantity}>Qty {item.quantity}</span>
                        </td>
                        <td style={styles.itemCellPrice}>
                            <span style={styles.itemValue}>{formatCurrency(item.quantity * item.price)}</span>
                        </td>
                    </tr>
                ))}

                <tr>
                    <td style={styles.itemCell}>
                        <span style={styles.itemValue}>Amount due</span>
                    </td>
                    <td style={styles.itemCellPrice}>
                        <span style={styles.itemValue}>{formatCurrency(total)}</span>
                    </td>
                </tr>
            </tbody>
        </table>
    );
});

interface EmailInvoiceReceiptMetaProps {
    MetaData: { label: string; value: string }[];
}
export const EmailInvoiceReceiptMeta = React.forwardRef<HTMLTableElement, EmailInvoiceReceiptMetaProps>(({ MetaData }, ref) => {
    return (
        <table cellPadding={0} cellSpacing={0} style={styles.receiptMetaTable}>
            <tbody>
                {MetaData.map((meta, idx) => (
                    <tr key={idx}>
                        <td style={styles.receiptMetaCellLabel}>{meta.label}</td>
                        <td style={styles.receiptMetaCellValue}>{meta.value}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
});