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

interface SimpleOTPEmailProps {
  member: { firstName: string };
  location: { name: string; email: string };
  otp: { token: string };
  monstro: { fullAddress: string };
}

export default function SimpleOTPEmail({
  member,
  location,
  otp,
  monstro,
}: SimpleOTPEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          <Section style={contentStyle}>
            <Text style={greetingStyle}>Hi {member.firstName},</Text>

            <Text style={paragraphStyle}>
              An invite to set up a Monstro account was made by{' '}
              <strong>{location.name}</strong>. To continue, enter the code below
              on the verification page:
            </Text>

            <Section style={otpBoxStyle}>
              <Text style={otpCodeStyle}>{otp.token}</Text>
            </Section>

            <Text style={paragraphStyle}>
              If you didn't make this change, ignore this email or contact{' '}
              <Link href={`mailto:${location.email}`} style={linkStyle}>
                {location.email}
              </Link>
              .
            </Text>

            <Text style={legalStyle}>
              You can opt out by clicking{' '}
              <Link href="#" style={linkStyle}>
                unsubscribe
              </Link>
              . See our{' '}
              <Link href="#" style={linkStyle}>
                Privacy Policy
              </Link>{' '}
              for details.
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

const legalStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#6B7280',
  margin: '12px 0',
  lineHeight: '1.5',
};

const linkStyle: React.CSSProperties = {
  color: '#4338ca',
  textDecoration: 'none',
  fontWeight: 'bold',
};

const footerStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#6B7280',
  margin: '20px 0 0 0',
  paddingTop: '20px',
  borderTop: '1px solid #e5e7eb',
  textAlign: 'center',
};

SimpleOTPEmail.PreviewProps = {
  member: {
    firstName: 'John',
  },
  location: {
    name: 'Fit Studio',
    email: 'contact@fitstudio.com',
  },
  otp: {
    token: '650500',
  },
  monstro: {
    fullAddress: 'PO Box 263, Culver City, CA 90232',
  },
} as SimpleOTPEmailProps;
