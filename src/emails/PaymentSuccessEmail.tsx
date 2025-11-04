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

interface PaymentSuccessEmailProps {
  member: { firstName: string; lastName: string };
  invoice: {
    id: string;
    total: number;
    paidDate: string;
    description: string;
  };
  location: { name: string; address: string };
  monstro: {
    fullAddress: string;
    privacyUrl: string;
    unsubscribeUrl: string;
  };
}

export default function PaymentSuccessEmail({
  member,
  invoice,
  location,
  monstro,
}: PaymentSuccessEmailProps) {
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
              Thank you! We've received your payment for{' '}
              <strong>{invoice.description}</strong>.
            </Text>

            <Section style={receiptBoxStyle}>
              <Text style={receiptHeaderStyle}>Payment Receipt</Text>
              
              <Text style={receiptDetailStyle}>
                <strong>Invoice ID:</strong> {invoice.id}
              </Text>
              
              <Text style={receiptDetailStyle}>
                <strong>Description:</strong> {invoice.description}
              </Text>
              
              <Text style={receiptDetailStyle}>
                <strong>Payment Date:</strong> {formatDate(invoice.paidDate)}
              </Text>
              
              <Hr style={dividerStyle} />
              
              <Text style={totalStyle}>
                <strong>Amount Paid:</strong> {formatCurrency(invoice.total)}
              </Text>
            </Section>

            <Text style={paragraphStyle}>
              Your payment has been successfully processed. If you have any
              questions about this payment, please contact{' '}
              <strong>{location.name}</strong>.
            </Text>

            {location.address && (
              <Text style={locationInfoStyle}>
                <strong>{location.name}</strong>
                <br />
                {location.address}
              </Text>
            )}

            <Text style={signOffStyle}>
              Thank you for your business!
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

const receiptBoxStyle: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const receiptHeaderStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#15803d',
  margin: '0 0 16px 0',
};

const receiptDetailStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#166534',
  margin: '0 0 8px 0',
  lineHeight: '1.5',
};

const dividerStyle: React.CSSProperties = {
  borderColor: '#86efac',
  borderStyle: 'solid',
  borderWidth: '1px 0 0 0',
  margin: '16px 0',
};

const totalStyle: React.CSSProperties = {
  fontSize: '18px',
  color: '#15803d',
  margin: '16px 0 0 0',
  fontWeight: 'bold',
};

const locationInfoStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#374151',
  margin: '20px 0',
  lineHeight: '1.6',
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

PaymentSuccessEmail.PreviewProps = {
  member: {
    firstName: 'John',
    lastName: 'Doe',
  },
  invoice: {
    id: 'inv_abc123',
    total: 15000,
    paidDate: new Date().toISOString(),
    description: 'Monthly Membership - January 2025',
  },
  location: {
    name: 'Fit Studio',
    address: '123 Main St, City, State 12345',
  },
  monstro: {
    fullAddress: 'PO Box 123, City, State 12345\nCopyright 2025 Monstro',
    privacyUrl: 'https://mymonstro.com/privacy',
    unsubscribeUrl: 'https://mymonstro.com/unsubscribe',
  },
} as PaymentSuccessEmailProps;

