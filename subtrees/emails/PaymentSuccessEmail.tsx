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
import { EmailStyles } from './_shared/SharedStyle';
import {
  EmailFooter, EmailInvoiceBox, EmailInvoiceDownloadLink,
  EmailInvoiceLabel, EmailInvoiceAmount, EmailInvoiceReceiptMeta, EmailInvoiceBoxDivider
} from './_shared';
import { DummyData } from './_shared/DummyData';
import { format } from 'date-fns';

interface PaymentSuccessEmailProps {
  member: { firstName: string; lastName: string };
  invoice: {
    id: string;
    total: number;
    paidDate: string;
    description: string;
    paymentMethod?: {
      type: 'card' | 'us_bank_account';
      brand: string;
      last4: string;
    };
  };
  location: { name: string; address: string; email?: string; phone?: string };
  downloadInvoiceUrl?: string;

}

// Combined all styles into a single object for easier management
const styles: Record<string, React.CSSProperties> = {
  ...EmailStyles,

}
export default function PaymentSuccessEmail({
  member,
  invoice,
  location,
  downloadInvoiceUrl,
}: PaymentSuccessEmailProps) {

  const paymentMethod = invoice.paymentMethod ? `${invoice.paymentMethod.brand} - ${invoice.paymentMethod.last4}` : 'N/A';
  return (
    <Html>
      <Head />
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.content}>
            <Text style={styles.paragraph}>
              Hi {member.firstName} {member.lastName},
            </Text>

            <Text style={styles.paragraph}>
              Thank you! We've received your payment for{' '}
              <strong>{invoice.description}</strong>.
            </Text>

            <EmailInvoiceBox style={{ backgroundColor: '#f0fdf4', border: '1px solid #16a34a' }}>
              <EmailInvoiceLabel label={`Receipt from ${location.name}`} />
              <EmailInvoiceAmount amount={invoice.total} />
              <EmailInvoiceLabel label={`Paid ${format(new Date(invoice.paidDate), 'MMMM d, yyyy')}`} />
              <EmailInvoiceBoxDivider borderColor="rgba(22, 163, 74, 0.2)" />
              {downloadInvoiceUrl && (
                <EmailInvoiceDownloadLink href={downloadInvoiceUrl} />
              )}
              <Section style={{ margin: '16px 0' }}>

                <EmailInvoiceReceiptMeta MetaData={[
                  { label: 'Invoice number', value: invoice.id },
                  { label: 'Payment method', value: paymentMethod },
                ]} />
              </Section>
            </EmailInvoiceBox>

            <Text style={styles.paragraph}>
              Your payment has been successfully processed. If you have any
              questions about this payment, please contact{' '}
              <strong>{location.name}</strong>.
            </Text>


          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

PaymentSuccessEmail.PreviewProps = {
  ...DummyData,
  invoice: {
    id: 'inv_abc123',
    total: 15000,
    paidDate: new Date().toISOString(),
    description: 'Monthly Membership - January 2025',
    paymentMethod: {
      type: 'card',
      brand: 'Visa',
      last4: '1234',
    }
  },
  downloadInvoiceUrl: 'https://example.com/download',
};

