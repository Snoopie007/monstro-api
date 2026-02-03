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

// Combined all styles into a single object for easier management
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
  receiptBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px 0',
  },
  receiptHeader: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#15803d',
    margin: '0 0 16px 0',
  },
  receiptDetail: {
    fontSize: '14px',
    color: '#166534',
    margin: '0 0 8px 0',
    lineHeight: '1.5',
  },
  divider: {
    borderColor: '#86efac',
    borderStyle: 'solid',
    borderWidth: '1px 0 0 0',
    margin: '16px 0',
  },
  total: {
    fontSize: '18px',
    color: '#15803d',
    margin: '16px 0 0 0',
    fontWeight: 'bold',
  },
  locationInfo: {
    fontSize: '14px',
    color: '#374151',
    margin: '20px 0',
    lineHeight: '1.6',
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
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.content}>
            <Text style={styles.greeting}>
              Hi {member.firstName} {member.lastName},
            </Text>

            <Text style={styles.paragraph}>
              Thank you! We've received your payment for{' '}
              <strong>{invoice.description}</strong>.
            </Text>

            <Section style={styles.receiptBox}>
              <Text style={styles.receiptHeader}>Payment Receipt</Text>

              <Text style={styles.receiptDetail}>
                <strong>Invoice ID:</strong> {invoice.id}
              </Text>

              <Text style={styles.receiptDetail}>
                <strong>Description:</strong> {invoice.description}
              </Text>

              <Text style={styles.receiptDetail}>
                <strong>Payment Date:</strong> {formatDate(invoice.paidDate)}
              </Text>

              <Hr style={styles.divider} />

              <Text style={styles.total}>
                <strong>Amount Paid:</strong> {formatCurrency(invoice.total)}
              </Text>
            </Section>

            <Text style={styles.paragraph}>
              Your payment has been successfully processed. If you have any
              questions about this payment, please contact{' '}
              <strong>{location.name}</strong>.
            </Text>

            {location.address && (
              <Text style={styles.locationInfo}>
                <strong>{location.name}</strong>
                <br />
                {location.address}
              </Text>
            )}

            <Text style={styles.signOff}>
              Thank you for your business!
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

