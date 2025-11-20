import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
} from '@react-email/components';

interface ClassReminderEmailProps {
  member: { firstName: string; lastName: string; email: string };
  class: {
    name: string;
    description?: string;
    startTime: string;
    endTime: string;
    instructor?: { firstName: string; lastName: string } | null;
  };
  location: { name: string; address: string; email?: string; phone?: string };
  monstro?: {
    fullAddress?: string;
    privacyUrl?: string;
    unsubscribeUrl?: string;
  };
}

export default function ClassReminderEmail({
  member,
  class: classData,
  location,
  monstro,
}: ClassReminderEmailProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const classDate = formatDate(classData.startTime);
  const classTime = formatTime(classData.startTime);

  return (
    <Html>
      <Head />
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          <Section style={contentStyle}>
            <Text style={greetingStyle}>Hi {member.firstName},</Text>

            <Text style={messageStyle}>
              Just a quick reminder that your class <strong>{classData.name}</strong>{' '}
              is coming up on <strong>{classDate}</strong> at <strong>{classTime}</strong>.
              {classData.instructor && (
                <> Your instructor is {classData.instructor.firstName} {classData.instructor.lastName}.</>
              )}
            </Text>

            {classData.description && (
              <Text style={descriptionStyle}>{classData.description}</Text>
            )}

            <Text style={messageStyle}>
              Don't forget to check in and arrive early!
            </Text>

            <Text style={signOffStyle}>See you soon,</Text>

            <Text style={locationStyle}>{location.name}</Text>
            <Text style={addressStyle}>{location.address}</Text>

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

const descriptionStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7280',
  margin: '0 0 16px 0',
  lineHeight: '1.5',
  fontStyle: 'italic',
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

ClassReminderEmail.PreviewProps = {
  member: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  class: {
    name: 'Morning Yoga',
    description: 'Start your day with a relaxing yoga session',
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    instructor: {
      firstName: 'Jane',
      lastName: 'Smith',
    },
  },
  location: {
    name: 'Monstro Studio',
    address: '123 Main St, Los Angeles, CA 90001',
  },
  monstro: {
    fullAddress: 'PO Box 123, City, State 12345\nCopyright 2025 Monstro',
    privacyUrl: 'https://mymonstro.com/privacy',
    unsubscribeUrl: 'https://mymonstro.com/unsubscribe',
  },
} as ClassReminderEmailProps;
