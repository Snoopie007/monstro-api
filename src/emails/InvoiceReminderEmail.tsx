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

interface InvoiceReminderEmailProps {
  member: { firstName: string; lastName: string; email: string };
  invoice: {
    id: string;
    total: number;
    dueDate: string;
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

export default function InvoiceReminderEmail({
  member,
  invoice,
  location,
  monstro,
}: InvoiceReminderEmailProps) {
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
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          <Section style={contentStyle}>
            <Text style={greetingStyle}>
              Hi {member.firstName} {member.lastName},
            </Text>

            <Text style={paragraphStyle}>
              This is a reminder that you have an invoice due from{' '}
              <strong>{location.name}</strong>.
            </Text>

            <Section style={invoiceBoxStyle}>
              <Text style={invoiceHeaderStyle}>Invoice Details</Text>
              
              <Text style={invoiceDetailStyle}>
                <strong>Invoice ID:</strong> {invoice.id}
              </Text>
              
              <Text style={invoiceDetailStyle}>
                <strong>Description:</strong> {invoice.description}
              </Text>
              
              <Text style={invoiceDetailStyle}>
                <strong>Due Date:</strong> {formatDate(invoice.dueDate)}
              </Text>
              
              <Hr style={dividerStyle} />
              
              <Section style={itemsSection}>
                <Text style={itemsHeaderStyle}>Items:</Text>
                {invoice.items.map((item, index) => (
                  <Section key={index} style={itemStyle}>
                    <Text style={itemNameStyle}>
                      {item.name} {item.description && `- ${item.description}`}
                    </Text>
                    <Text style={itemDetailStyle}>
                      Qty: {item.quantity} × {formatCurrency(item.price)} = {formatCurrency(item.quantity * item.price)}
                    </Text>
                  </Section>
                ))}
              </Section>
              
              <Hr style={dividerStyle} />
              
              <Text style={totalStyle}>
                <strong>Amount Due:</strong> {formatCurrency(invoice.total)}
              </Text>
            </Section>

            <Text style={paragraphStyle}>
              Please submit your payment to <strong>{location.name}</strong>.
            </Text>

            {location.phone && (
              <Text style={contactStyle}>
                <strong>Phone:</strong> {location.phone}
              </Text>
            )}
            
            {location.email && (
              <Text style={contactStyle}>
                <strong>Email:</strong> {location.email}
              </Text>
            )}
            
            {location.address && (
              <Text style={contactStyle}>
                <strong>Address:</strong> {location.address}
              </Text>
            )}

            <Text style={signOffStyle}>
              Thank you,
              <br />
              {location.name}
            </Text>

            <Hr style={dividerStyle} />

            <Text style={legalStyle}>
              You can opt out of receiving future emails by clicking{' '}
              <Link href={monstro.unsubscribeUrl} style={linkStyle}>
                unsubscribe
              </Link>
              . For more information about how we process data, please see our{' '}
              <Link href={monstro.privacyUrl} style={linkStyle}>
                Privacy Policy
              </Link>
              .
            </Text>

            <Text style={footerStyle}>{monstro.fullAddress}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const mainStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Helvetica, Arial, sans-serif',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px',
};

const contentStyle: React.CSSProperties = {
  padding: '20px 0',
};

const greetingStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 'normal',
  color: '#000000',
  margin: '0 0 16px 0',
  lineHeight: '1.5',
};

const paragraphStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#000000',
  margin: '0 0 16px 0',
  lineHeight: '1.5',
};

const invoiceBoxStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const invoiceHeaderStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#111827',
  margin: '0 0 16px 0',
};

const invoiceDetailStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#374151',
  margin: '0 0 8px 0',
  lineHeight: '1.5',
};

const dividerStyle: React.CSSProperties = {
  borderColor: '#e5e7eb',
  borderStyle: 'solid',
  borderWidth: '1px 0 0 0',
  margin: '16px 0',
};

const itemsSection: React.CSSProperties = {
  margin: '16px 0',
};

const itemsHeaderStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#374151',
  margin: '0 0 12px 0',
};

const itemStyle: React.CSSProperties = {
  marginBottom: '12px',
};

const itemNameStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#111827',
  margin: '0 0 4px 0',
  fontWeight: '500',
};

const itemDetailStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0',
};

const totalStyle: React.CSSProperties = {
  fontSize: '18px',
  color: '#111827',
  margin: '16px 0 0 0',
  fontWeight: 'bold',
};

const contactStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#374151',
  margin: '0 0 8px 0',
  lineHeight: '1.5',
};

const signOffStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#000000',
  margin: '24px 0 0 0',
  lineHeight: '1.5',
};

const legalStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#6B7280',
  margin: '16px 0',
  lineHeight: '1.5',
};

const linkStyle: React.CSSProperties = {
  color: '#4338ca',
  textDecoration: 'none',
  fontWeight: 'bold',
};

const footerStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#9CA3AF',
  margin: '16px 0 0 0',
  lineHeight: '1.4',
};

InvoiceReminderEmail.PreviewProps = {
  member: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  invoice: {
    id: 'inv_abc123',
    total: 15000,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
  monstro: {
    fullAddress: 'PO Box 123, City, State 12345\nCopyright 2025 Monstro',
    privacyUrl: 'https://mymonstro.com/privacy',
    unsubscribeUrl: 'https://mymonstro.com/unsubscribe',
  },
} as InvoiceReminderEmailProps;

