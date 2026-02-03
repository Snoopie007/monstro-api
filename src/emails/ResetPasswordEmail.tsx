import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Link,
} from '@react-email/components';

interface ResetPasswordEmailProps {
  member: { firstName: string; lastName: string; email: string };
  ui: { btnUrl: string; btnText: string };
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
    margin: '0 0 20px 0',
    lineHeight: '1.5',
  },
  buttonSection: {
    textAlign: 'center',
    margin: '24px 0',
  },
  button: {
    backgroundColor: '#4338ca',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '3px',
    textDecoration: 'none',
    display: 'inline-block',
    padding: '10px 25px',
  },
  warning: {
    fontSize: '16px',
    color: '#000000',
    margin: '20px 0',
    lineHeight: '1.6',
  },
  footer: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '20px 0 0 0',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
  },
};

export default function ResetPasswordEmail({
  member,
  ui,
  monstro,
}: ResetPasswordEmailProps) {
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
              A request to reset your password was made for your Monstro Account,{' '}
              <strong>{member.email}</strong>. To continue with this request, click
              the button below to reset your password. Your reset link will expire
              in 30 minutes:
            </Text>

            <Section style={styles.buttonSection}>
              <Button
                style={styles.button}
                href={ui.btnUrl}
              >
                {ui.btnText}
              </Button>
            </Section>

            <Text style={styles.warning}>
              If you didn't make this change or you believe an unauthorized person
              has attempted to access your account, you can simply ignore this
              email.
            </Text>

            <Text style={styles.footer}>{monstro.fullAddress}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

ResetPasswordEmail.PreviewProps = {
  member: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  ui: {
    btnUrl: 'https://example.com/reset-password',
    btnText: 'Reset Password',
  },
  monstro: {
    fullAddress: 'PO Box 123, City, State 12345\nCopyright 2025 Monstro',
  },
} as ResetPasswordEmailProps;
