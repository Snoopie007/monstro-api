import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
} from '@react-email/components';
import type { InvoiceItem } from 'subtrees/types/invoices';
import { EmailStyles } from './_shared/SharedStyle';
import {
  EmailFooter, EmailInvoiceBox, EmailInvoiceLabel,
  EmailInvoiceAmount, EmailInvoiceBoxMetaData, EmailInvoiceItemsTable, EmailInvoiceBoxDivider
} from './_shared';
import { DummyData } from './_shared/DummyData';
import { format } from 'date-fns';

interface OverdueInvoiceEmailProps {
  member: { firstName: string; lastName: string | null; email: string };
  invoice: {
    id: string;
    total: number;
    dueDate: Date;
    daysOverdue: number;
    description: string | null;
    items: InvoiceItem[];
  };
  location: { name: string; email: string | null; phone: string | null };

}

const styles: Record<string, React.CSSProperties> = {
  ...EmailStyles,

  contactLine: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '16px 0 0 0',
    whiteSpace: 'nowrap',
  },
}

export default function OverdueInvoiceEmail({
  member,
  invoice,
  location,
}: OverdueInvoiceEmailProps) {

  const MetaData = [
    { label: 'To', value: `${member.firstName} ${member.lastName}` },
    { label: 'From', value: location.name },
    ...(invoice.description
      ? [{ label: 'Memo', value: invoice.description }]
      : []),
  ];

  const overdueText = invoice.daysOverdue === 1 ? 'Day' : 'Days';
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
              Just a reminder that your invoice ${invoice.id} from <strong>{location.name} </strong>
              is <strong >${invoice.daysOverdue} ${overdueText} overdue</strong>.
              Please pay it as soon as possible, or contact us at <Link href={`mailto:${location.email}`} style={styles.link}>{location.email}</Link> to discuss payment arrangements.

            </Text>
            <EmailInvoiceBox style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}>
              <EmailInvoiceLabel label={`Invoice is ${invoice.daysOverdue} ${overdueText} Overdue`}
                style={{
                  color: '#b91c1c', // destructive color (red-700)
                }}
              />
              <EmailInvoiceAmount amount={invoice.total} />
              <EmailInvoiceLabel label={`Due ${format(new Date(invoice.dueDate), 'MMM d, yyyy')}`}
                style={{
                  color: '#b91c1c', // destructive color (red-700)
                }}
              />
              <EmailInvoiceBoxDivider borderColor="rgba(250, 17, 17, 0.2)" />
              <EmailInvoiceBoxMetaData MetaData={MetaData} />

            </EmailInvoiceBox>

            <EmailInvoiceBox>
              <EmailInvoiceLabel label={`Invoice #${invoice.id}`} style={{
                margin: '0 0 16px 0',
              }} />
              <EmailInvoiceItemsTable items={invoice.items} total={invoice.total} />
              <Text style={styles.contactLine}>
                Questions? Contact us at{' '}
                <Link href={`mailto:${location.email}`} style={styles.link}>
                  {location.email}
                </Link>
                .
              </Text>
            </EmailInvoiceBox>


            <Text style={styles.paragraph}>
              If you have already submitted payment, please disregard this notice
              and contact us to confirm. If you need to discuss payment arrangements,
              please reach out to us as soon as possible.
            </Text>


          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

OverdueInvoiceEmail.PreviewProps = {
  ...DummyData,
  invoice: {
    id: 'inv_abc123',
    total: 15000,
    dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    daysOverdue: 7,
    description: 'Monthly Membership - January 2025',
    items: [
      {
        name: 'Premium Membership',
        quantity: 1,
        price: 15000,
      },
    ],
  },
  reminderNumber: 2,
  totalReminders: 5,
};

