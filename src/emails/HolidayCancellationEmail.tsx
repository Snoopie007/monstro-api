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

interface CancelledReservation {
  className: string;
  originalDate: string;
  originalTime: string;
}

interface HolidayCancellationEmailProps {
  member: { firstName: string; lastName?: string; email?: string };
  location: { name: string; address?: string; email?: string; phone?: string };
  holiday: {
    name: string;
    date: string;
  };
  cancelledReservations: CancelledReservation[];
  makeupUrl?: string;
  monstro?: {
    fullAddress?: string;
    privacyUrl?: string;
    unsubscribeUrl?: string;
  };
}

export default function HolidayCancellationEmail({
  member,
  location,
  holiday,
  cancelledReservations,
  makeupUrl,
  monstro,
}: HolidayCancellationEmailProps) {
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
              We wanted to let you know that your upcoming class{cancelledReservations.length > 1 ? 'es have' : ' has'} been cancelled due to a facility closure:
            </Text>

            <Section style={holidayBoxStyle}>
              <Text style={holidayLabelStyle}>Closure Reason</Text>
              <Text style={holidayNameStyle}>{holiday.name}</Text>
              <Text style={holidayDateStyle}>{formatDate(holiday.date)}</Text>
            </Section>

            <Text style={sectionTitleStyle}>Affected Class{cancelledReservations.length > 1 ? 'es' : ''}:</Text>
            
            {cancelledReservations.map((reservation) => (
              <Section key={`${reservation.className}-${reservation.originalDate}`} style={classBoxStyle}>
                <Text style={classNameStyle}>{reservation.className}</Text>
                <Text style={classDetailsStyle}>
                  {formatDate(reservation.originalDate)} at {reservation.originalTime}
                </Text>
              </Section>
            ))}

            <Hr style={separatorStyle} />

            <Text style={messageStyle}>
              You can schedule a makeup class at your convenience. We apologize for any inconvenience this may cause.
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

const holidayBoxStyle: React.CSSProperties = {
  backgroundColor: '#FEF3C7',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '24px',
  borderLeft: '4px solid #F59E0B',
};

const holidayLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#92400E',
  margin: '0 0 4px 0',
  textTransform: 'uppercase',
  fontWeight: '600',
  letterSpacing: '0.5px',
};

const holidayNameStyle: React.CSSProperties = {
  fontSize: '18px',
  color: '#78350F',
  margin: '0 0 4px 0',
  fontWeight: '600',
};

const holidayDateStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#92400E',
  margin: '0',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7280',
  margin: '0 0 12px 0',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const classBoxStyle: React.CSSProperties = {
  backgroundColor: '#F3F4F6',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '8px',
};

const classNameStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#111827',
  margin: '0 0 4px 0',
  fontWeight: '600',
};

const classDetailsStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7280',
  margin: '0',
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

HolidayCancellationEmail.PreviewProps = {
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
  holiday: {
    name: 'Christmas Day',
    date: '2026-12-25',
  },
  cancelledReservations: [
    {
      className: 'Morning Yoga',
      originalDate: '2026-12-25',
      originalTime: '10:00 AM',
    },
    {
      className: 'HIIT Training',
      originalDate: '2026-12-25',
      originalTime: '2:00 PM',
    },
  ],
  makeupUrl: 'https://app.monstro-x.com/schedule',
  monstro: {
    fullAddress: 'PO Box 123, City, State 12345\nCopyright 2026 Monstro',
    privacyUrl: 'https://monstro-x.com/privacy',
    unsubscribeUrl: 'https://monstro-x.com/unsubscribe',
  },
} as HolidayCancellationEmailProps;
