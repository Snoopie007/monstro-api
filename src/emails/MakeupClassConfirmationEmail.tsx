import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from '@react-email/components';

interface MakeupClassConfirmationEmailProps {
  member: { firstName: string; lastName?: string; email?: string };
  location: { name: string; address?: string; email?: string; phone?: string };
  originalClass: {
    name: string;
    date: string;
    time: string;
  };
  makeupClass: {
    name: string;
    date: string;
    time: string;
    instructor?: { firstName: string; lastName: string } | null;
  };
  creditsRemaining?: number;
  monstro?: {
    fullAddress?: string;
    privacyUrl?: string;
    unsubscribeUrl?: string;
  };
}

export default function MakeupClassConfirmationEmail({
  member,
  location,
  originalClass,
  makeupClass,
  creditsRemaining,
  monstro,
}: MakeupClassConfirmationEmailProps) {
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
              Great news! Your makeup class has been successfully scheduled.
            </Text>

            <Section style={confirmationBoxStyle}>
              <Text style={confirmationLabelStyle}>Confirmed</Text>
              <Text style={classNameStyle}>{makeupClass.name}</Text>
              <Text style={classDateStyle}>{formatDate(makeupClass.date)}</Text>
              <Text style={classTimeStyle}>{makeupClass.time}</Text>
              {makeupClass.instructor && (
                <Text style={instructorStyle}>
                  Instructor: {makeupClass.instructor.firstName} {makeupClass.instructor.lastName}
                </Text>
              )}
            </Section>

            <Section style={originalBoxStyle}>
              <Text style={originalLabelStyle}>Original Missed Class</Text>
              <Text style={originalClassStyle}>{originalClass.name}</Text>
              <Text style={originalDetailsStyle}>
                {formatDate(originalClass.date)} at {originalClass.time}
              </Text>
            </Section>

            {creditsRemaining !== undefined && (
              <Section style={creditsBoxStyle}>
                <Text style={creditsLabelStyle}>Makeup Credits</Text>
                <Text style={creditsValueStyle}>
                  {creditsRemaining} credit{creditsRemaining !== 1 ? 's' : ''} remaining
                </Text>
              </Section>
            )}

            <Hr style={separatorStyle} />

            <Text style={messageStyle}>
              Please arrive a few minutes early to check in. We look forward to seeing you!
            </Text>

            <Text style={signOffStyle}>See you soon,</Text>

            <Text style={locationStyle}>{location.name}</Text>
            {location.address && <Text style={addressStyle}>{location.address}</Text>}

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

const confirmationBoxStyle: React.CSSProperties = {
  backgroundColor: '#ECFDF5',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
  borderLeft: '4px solid #10B981',
};

const confirmationLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#047857',
  margin: '0 0 8px 0',
  textTransform: 'uppercase',
  fontWeight: '600',
  letterSpacing: '0.5px',
};

const classNameStyle: React.CSSProperties = {
  fontSize: '18px',
  color: '#064E3B',
  margin: '0 0 4px 0',
  fontWeight: '600',
};

const classDateStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#065F46',
  margin: '0 0 2px 0',
  fontWeight: '500',
};

const classTimeStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#047857',
  margin: '0 0 8px 0',
};

const instructorStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#059669',
  margin: '0',
};

const originalBoxStyle: React.CSSProperties = {
  backgroundColor: '#F3F4F6',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '16px',
};

const originalLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#6B7280',
  margin: '0 0 4px 0',
  textTransform: 'uppercase',
  fontWeight: '600',
  letterSpacing: '0.5px',
};

const originalClassStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#374151',
  margin: '0 0 2px 0',
  fontWeight: '500',
};

const originalDetailsStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#6B7280',
  margin: '0',
};

const creditsBoxStyle: React.CSSProperties = {
  backgroundColor: '#EFF6FF',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '24px',
};

const creditsLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#3B82F6',
  margin: '0 0 4px 0',
  textTransform: 'uppercase',
  fontWeight: '600',
  letterSpacing: '0.5px',
};

const creditsValueStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#1D4ED8',
  margin: '0',
  fontWeight: '500',
};

const separatorStyle: React.CSSProperties = {
  borderTop: '1px solid #E5E7EB',
  margin: '24px 0',
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

MakeupClassConfirmationEmail.PreviewProps = {
  member: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  location: {
    name: 'Monstro Studio',
    address: '123 Main St, Los Angeles, CA 90001',
  },
  originalClass: {
    name: 'Morning Yoga',
    date: '2026-12-20',
    time: '10:00 AM',
  },
  makeupClass: {
    name: 'Morning Yoga',
    date: '2026-12-28',
    time: '10:00 AM',
    instructor: {
      firstName: 'Jane',
      lastName: 'Smith',
    },
  },
  creditsRemaining: 2,
  monstro: {
    fullAddress: 'PO Box 123, City, State 12345\nCopyright 2026 Monstro',
    privacyUrl: 'https://monstro-x.com/privacy',
    unsubscribeUrl: 'https://monstro-x.com/unsubscribe',
  },
} as MakeupClassConfirmationEmailProps;
