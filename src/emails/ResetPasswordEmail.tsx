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

export default function ResetPasswordEmail({
  member,
  ui,
  monstro,
}: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          <Section style={contentStyle}>
            <Text style={greetingStyle}>
              Dear {member.firstName} {member.lastName},
            </Text>

            <Text style={paragraphStyle}>
              A request to reset your password was made for your Monstro Account,{' '}
              <strong>{member.email}</strong>. To continue with this request, click
              the button below to reset your password. Your reset link will expire
              in 30 minutes:
            </Text>

            <Section style={buttonSectionStyle}>
              <Button
                style={buttonStyle}
                href={ui.btnUrl}
              >
                {ui.btnText}
              </Button>
            </Section>

            <Text style={warningStyle}>
              If you didn't make this change or you believe an unauthorized person
              has attempted to access your account, you can simply ignore this
              email.
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
  margin: '0 0 20px 0',
  lineHeight: '1.5',
};

const buttonSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '24px 0',
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#4338ca',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  borderRadius: '3px',
  textDecoration: 'none',
  display: 'inline-block',
  padding: '10px 25px'
};

const warningStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#000000',
  margin: '20px 0',
  lineHeight: '1.6',
};

const footerStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7280',
  margin: '20px 0 0 0',
  paddingTop: '20px',
  borderTop: '1px solid #e5e7eb',
};

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
