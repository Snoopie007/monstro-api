import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Link,
} from '@react-email/components';

interface InvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  price: number;
}

interface OverdueInvoiceEmailProps {
  member: { firstName: string; lastName: string; email: string };
  invoice: {
    id: string;
    total: number;
    dueDate: string;
    daysOverdue: number;
    description: string;
    items: InvoiceItem[];
  };
  location: { name: string; address: string; email?: string; phone?: string };
  monstro: {
    fullAddress: string;
    privacyUrl: string;
    unsubscribeUrl: string;
  };
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica, Arial, sans-serif',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
  },
  content: {
    padding: '20px 0',
  },
  greeting: {
    fontSize: '16px',
    fontWeight: 'normal',
    color: '#000000',
    margin: '0 0 16px 0',
    lineHeight: '1.5',
  },
  paragraph: {
    fontSize: '16px',
    color: '#000000',
    margin: '0 0 16px 0',
    lineHeight: '1.5',
  },
  overdueBox: {
    backgroundColor: '#fee2e2',
    borderLeft: '4px solid #ef4444',
    padding: '16px 20px',
    margin: '20px 0',
  },
  overdueHeader: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#dc2626',
    margin: '0',
  },
  invoiceBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px 0',
  },
  invoiceHeader: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#111827',
    margin: '0 0 16px 0',
  },
  invoiceDetail: {
    fontSize: '14px',
    color: '#374151',
    margin: '0 0 8px 0',
    lineHeight: '1.5',
  },
  divider: {
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderWidth: '1px 0 0 0',
    margin: '16px 0',
  },
  itemsSection: {
    margin: '16px 0',
  },
  itemsHeader: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    margin: '0 0 12px 0',
  },
  item: {
    marginBottom: '12px',
  },
  itemName: {
    fontSize: '14px',
    color: '#111827',
    margin: '0 0 4px 0',
    fontWeight: '500',
  },
  itemDetail: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0',
  },
  total: {
    fontSize: '18px',
    color: '#111827',
    margin: '16px 0 0 0',
    fontWeight: 'bold',
  },
  actionText: {
    fontSize: '16px',
    color: '#dc2626',
    margin: '20px 0 16px 0',
    lineHeight: '1.5',
  },
  contact: {
    fontSize: '14px',
    color: '#374151',
    margin: '0 0 8px 0',
    lineHeight: '1.5',
  },
  signOff: {
    fontSize: '16px',
    color: '#000000',
    margin: '24px 0 0 0',
    lineHeight: '1.5',
  },
  legal: {
    fontSize: '12px',
    color: '#6B7280',
    margin: '16px 0',
    lineHeight: '1.5',
  },
  link: {
    color: '#4338ca',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  footer: {
    fontSize: '12px',
    color: '#9CA3AF',
    margin: '16px 0 0 0',
    lineHeight: '1.4',
  },
};

export default function OverdueInvoiceEmail({
  member,
  invoice,
  location,
  monstro,
}: OverdueInvoiceEmailProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Html>
      <Head />
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.content}>
            <Text style={styles.greeting}>
              Hi {member.firstName} {member.lastName},
            </Text>

            <Text style={styles.paragraph}>
              We have not received payment for your invoice from{' '}
              <strong>{location.name}</strong>.
            </Text>

            <Section style={styles.overdueBox}>
              <Text style={styles.overdueHeader}>
                {invoice.daysOverdue} {invoice.daysOverdue === 1 ? 'Day' : 'Days'} Overdue
              </Text>
            </Section>

            <Section style={styles.invoiceBox}>
              <Text style={styles.invoiceHeader}>Invoice Details</Text>

              <Text style={styles.invoiceDetail}>
                <strong>Invoice ID:</strong> {invoice.id}
              </Text>

              <Text style={styles.invoiceDetail}>
                <strong>Description:</strong> {invoice.description}
              </Text>

              <Text style={styles.invoiceDetail}>
                <strong>Original Due Date:</strong> {formatDate(invoice.dueDate)}
              </Text>

              <Hr style={styles.divider} />

              <Section style={styles.itemsSection}>
                <Text style={styles.itemsHeader}>Items:</Text>
                {invoice.items.map((item, index) => (
                  <Section key={index} style={styles.item}>
                    <Text style={styles.itemName}>
                      {item.name} {item.description && `- ${item.description}`}
                    </Text>
                    <Text style={styles.itemDetail}>
                      Qty: {item.quantity} × {formatCurrency(item.price)} = {formatCurrency(item.quantity * item.price)}
                    </Text>
                  </Section>
                ))}
              </Section>

              <Hr style={styles.divider} />

              <Text style={styles.total}>
                <strong>Amount Due:</strong> {formatCurrency(invoice.total)}
              </Text>
            </Section>

            <Text style={styles.actionText}>
              <strong>Please submit your payment immediately to:</strong>
            </Text>

            {location.phone && (
              <Text style={styles.contact}>
                <strong>Phone:</strong> {location.phone}
              </Text>
            )}

            {location.email && (
              <Text style={styles.contact}>
                <strong>Email:</strong> {location.email}
              </Text>
            )}

            {location.address && (
              <Text style={styles.contact}>
                <strong>Address:</strong> {location.address}
              </Text>
            )}

            <Text style={styles.paragraph}>
              If you have already submitted payment, please disregard this notice
              and contact us to confirm. If you need to discuss payment arrangements,
              please reach out to us as soon as possible.
            </Text>

            <Text style={styles.signOff}>
              Thank you,
              <br />
              {location.name}
            </Text>

            <Hr style={styles.divider} />

            <Text style={styles.legal}>
              You can opt out of receiving future emails by clicking{' '}
              <Link href={monstro.unsubscribeUrl} style={styles.link}>
                unsubscribe
              </Link>
              . For more information about how we process data, please see our{' '}
              <Link href={monstro.privacyUrl} style={styles.link}>
                Privacy Policy
              </Link>
              .
            </Text>

            <Text style={styles.footer}>{monstro.fullAddress}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

OverdueInvoiceEmail.PreviewProps = {
  member: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  invoice: {
    id: 'inv_abc123',
    total: 15000,
    dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    daysOverdue: 7,
    description: 'Monthly Membership - January 2025',
    items: [
      {
        name: 'Premium Membership',
        description: 'Unlimited access',
        quantity: 1,
        price: 15000,
      },
    ],
  },
  location: {
    name: 'Fit Studio',
    address: '123 Main St, City, State 12345',
    email: 'info@fitstudio.com',
    phone: '(555) 123-4567',
  },
  reminderNumber: 2,
  totalReminders: 5,
  monstro: {
    fullAddress: 'PO Box 123, City, State 12345\nCopyright 2025 Monstro',
    privacyUrl: 'https://monstro-x.com/privacy',
    unsubscribeUrl: 'https://monstro-x.com/unsubscribe',
  },
} as OverdueInvoiceEmailProps;

