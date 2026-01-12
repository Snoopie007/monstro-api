import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';

interface SessionCancellationEmailProps {
  member: { firstName: string; lastName?: string; email?: string };
  location: { name: string; address?: string; email?: string; phone?: string };
  session: {
    className: string;
    date: string;
    time: string;
    instructor?: { firstName: string; lastName: string } | null;
  };
  reason?: string;
  makeupUrl?: string;
  monstro?: {
    fullAddress?: string;
    privacyUrl?: string;
    unsubscribeUrl?: string;
  };
}

export default function SessionCancellationEmail({
  member,
  location,
  session,
  reason,
  makeupUrl,
  monstro,
}: SessionCancellationEmailProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
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
            <Text style={greetingStyle}>Hi {member.firstName},</Text>

            <Text style={messageStyle}>
              We're sorry to inform you that your upcoming class has been cancelled.
            </Text>

            <Section style={cancellationBoxStyle}>
              <Text style={cancellationLabelStyle}>Cancelled</Text>
              <Text style={classNameStyle}>{session.className}</Text>
              <Text style={classDateStyle}>{formatDate(session.date)}</Text>
              <Text style={classTimeStyle}>{session.time}</Text>
              {session.instructor && (
                <Text style={instructorStyle}>
                  Instructor: {session.instructor.firstName} {session.instructor.lastName}
                </Text>
              )}
            </Section>

            {reason && (
              <Section style={reasonBoxStyle}>
                <Text style={reasonLabelStyle}>Reason</Text>
                <Text style={reasonTextStyle}>{reason}</Text>
              </Section>
            )}

            <Hr style={separatorStyle} />

            <Text style={messageStyle}>
              We apologize for any inconvenience. You can schedule a makeup class at your convenience.
            </Text>

            {makeupUrl && (
              <Section style={buttonContainerStyle}>
                <Button href={makeupUrl} style={buttonStyle}>
                  Schedule Makeup Class
                </Button>
              </Section>
            )}

            <Text style={signOffStyle}>Best regards,</Text>

            <Text style={locationStyle}>{location.name}</Text>
            {location.address && <Text style={addressStyle}>{location.address}</Text>}
            {location.email && (
              <Text style={contactStyle}>
                Questions? Contact us at {location.email}
                {location.phone && ` or ${location.phone}`}
              </Text>
            )}

            {monstro && (
              <Section style={footerStyle}>
                {monstro.fullAddress && (
                  <Text style={footerTextStyle}>{monstro.fullAddress}</Text>
                )}
                <Text style={footerLinksStyle}>
                  {monstro.privacyUrl && (
                    <a href={monstro.privacyUrl} style={linkStyle}>
                      Privacy Policy
                    </a>
                  )}
                  {monstro.privacyUrl && monstro.unsubscribeUrl && ' | '}
                  {monstro.unsubscribeUrl && (
                    <a href={monstro.unsubscribeUrl} style={linkStyle}>
                      Unsubscribe
                    </a>
                  )}
                </Text>
              </Section>
            )}
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

const messageStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#000000',
  margin: '0 0 20px 0',
  lineHeight: '1.6',
};

const cancellationBoxStyle: React.CSSProperties = {
  backgroundColor: '#FEF2F2',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
  borderLeft: '4px solid #EF4444',
};

const cancellationLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#DC2626',
  margin: '0 0 8px 0',
  textTransform: 'uppercase',
  fontWeight: '600',
  letterSpacing: '0.5px',
};

const classNameStyle: React.CSSProperties = {
  fontSize: '18px',
  color: '#991B1B',
  margin: '0 0 4px 0',
  fontWeight: '600',
};

const classDateStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#B91C1C',
  margin: '0 0 2px 0',
  fontWeight: '500',
};

const classTimeStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#DC2626',
  margin: '0 0 8px 0',
};

const instructorStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#DC2626',
  margin: '0',
};

const reasonBoxStyle: React.CSSProperties = {
  backgroundColor: '#F3F4F6',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '16px',
};

const reasonLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#6B7280',
  margin: '0 0 4px 0',
  textTransform: 'uppercase',
  fontWeight: '600',
  letterSpacing: '0.5px',
};

const reasonTextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#374151',
  margin: '0',
  lineHeight: '1.5',
};

const separatorStyle: React.CSSProperties = {
  borderTop: '1px solid #E5E7EB',
  margin: '24px 0',
};

const buttonContainerStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '32px 0',
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#000000',
  color: '#ffffff',
  padding: '12px 32px',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block',
  fontWeight: '600',
  fontSize: '16px',
};

const signOffStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#000000',
  margin: '24px 0 8px 0',
  fontWeight: 'normal',
  lineHeight: '1.5',
};

const locationStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#1F2937',
  margin: '0 0 4px 0',
  fontWeight: 'normal',
  lineHeight: '1.4',
};

const addressStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7280',
  margin: '0 0 8px 0',
  lineHeight: '1.4',
};

const contactStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7280',
  margin: '0 0 32px 0',
  lineHeight: '1.4',
};

const footerStyle: React.CSSProperties = {
  marginTop: '40px',
  borderTop: '1px solid #E5E7EB',
  paddingTop: '20px',
};

const footerTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#9CA3AF',
  margin: '0 0 8px 0',
  lineHeight: '1.4',
};

const footerLinksStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#9CA3AF',
  margin: '0',
  lineHeight: '1.4',
};

const linkStyle: React.CSSProperties = {
  color: '#9CA3AF',
  textDecoration: 'underline',
};

SessionCancellationEmail.PreviewProps = {
  member: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  location: {
    name: 'Monstro Studio',
    address: '123 Main St, Los Angeles, CA 90001',
    email: 'hello@monstrostudio.com',
    phone: '(555) 123-4567',
  },
  session: {
    className: 'Morning Yoga',
    date: '2026-01-15',
    time: '10:00 AM',
    instructor: {
      firstName: 'Jane',
      lastName: 'Smith',
    },
  },
  reason: 'Instructor unavailable due to illness',
  makeupUrl: 'https://app.monstro-x.com/schedule',
  monstro: {
    fullAddress: 'PO Box 123, City, State 12345\nCopyright 2026 Monstro',
    privacyUrl: 'https://monstro-x.com/privacy',
    unsubscribeUrl: 'https://monstro-x.com/unsubscribe',
  },
} as SessionCancellationEmailProps;
