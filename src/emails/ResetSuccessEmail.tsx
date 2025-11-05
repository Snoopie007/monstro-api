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

export default function ResetSuccessEmail({
  member,
  monstro,
}: ResetSuccessEmailProps) {
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
              The password for your Monstro account ({member.email}) has been
              successfully reset.
            </Text>

            <Text style={paragraphStyle}>
              If you didn't make this change or if you believe an unauthorized
              person has accessed your account, go to your Monstro App to reset
              your password immediately.
            </Text>

            <Text style={paragraphStyle}>
              If you need additional help, contact{' '}
              <strong>support@mymonstro.com</strong>
            </Text>

            <Text style={signOffStyle}>Monstro Support</Text>

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

const signOffStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#000000',
  margin: '20px 0 0 0',
  fontWeight: 'normal',
};

const footerStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7280',
  margin: '20px 0 0 0',
  paddingTop: '20px',
  borderTop: '1px solid #e5e7eb',
};

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
