import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
} from '@react-email/components';

interface UpdateEmailOTPEmailProps {
  member: { firstName: string; lastName: string };
  update: { email: string; token: string };
  monstro: { fullAddress: string };
}

export default function UpdateEmailOTPEmail({
  member,
  update,
  monstro,
}: UpdateEmailOTPEmailProps) {
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
              A request to update your current account email to{' '}
              <strong>{update.email}</strong> was made. To complete this request,
              click the button below. Your request link will expire in 24 hours.
            </Text>

            <Section style={otpBoxStyle}>
              <Text style={otpCodeStyle}>{update.token}</Text>
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

const otpBoxStyle: React.CSSProperties = {
  backgroundColor: '#FAFAFA',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center',
};

const otpCodeStyle: React.CSSProperties = {
  fontSize: '36px',
  fontWeight: 'bold',
  color: '#000000',
  margin: '0',
  letterSpacing: '8px',
  fontFamily: 'monospace',
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

UpdateEmailOTPEmail.PreviewProps = {
  member: {
    firstName: 'John',
    lastName: 'Doe',
  },
  update: {
    email: 'newemail@example.com',
    token: '123456',
  },
  monstro: {
    fullAddress: 'PO Box 123, City, State 12345\nCopyright 2025 Monstro',
  },
} as UpdateEmailOTPEmailProps;
