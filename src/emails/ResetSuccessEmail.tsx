import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
} from '@react-email/components';

interface ResetSuccessEmailProps {
  member: { firstName: string; lastName: string; email: string };
  monstro: { fullAddress: string };
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
  signOff: {
    fontSize: '16px',
    color: '#000000',
    margin: '20px 0 0 0',
    fontWeight: 'normal',
  },
  footer: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '20px 0 0 0',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
  },
};

export default function ResetSuccessEmail({
  member,
  monstro,
}: ResetSuccessEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.content}>
            <Text style={styles.greeting}>
              Dear {member.firstName} {member.lastName},
            </Text>

            <Text style={styles.paragraph}>
              The password for your Monstro account ({member.email}) has been
              successfully reset.
            </Text>

            <Text style={styles.paragraph}>
              If you didn't make this change or if you believe an unauthorized
              person has accessed your account, go to your Monstro App to reset
              your password immediately.
            </Text>

            <Text style={styles.paragraph}>
              If you need additional help, contact{' '}
              <strong>support@mymonstro.com</strong>
            </Text>

            <Text style={styles.signOff}>Monstro Support</Text>

            <Text style={styles.footer}>{monstro.fullAddress}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

ResetSuccessEmail.PreviewProps = {
  member: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  monstro: {
    fullAddress: 'PO Box 123, City, State 12345\nCopyright 2025 Monstro',
  },
} as ResetSuccessEmailProps;
