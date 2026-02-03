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
  message: {
    fontSize: '16px',
    color: '#000000',
    margin: '0 0 20px 0',
    lineHeight: '1.6',
  },
  cancellationBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    borderLeft: '4px solid #EF4444',
  },
  cancellationLabel: {
    fontSize: '12px',
    color: '#DC2626',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    fontWeight: 600,
    letterSpacing: '0.5px',
  },
  className: {
    fontSize: '18px',
    color: '#991B1B',
    margin: '0 0 4px 0',
    fontWeight: 600,
  },
  classDate: {
    fontSize: '15px',
    color: '#B91C1C',
    margin: '0 0 2px 0',
    fontWeight: 500,
  },
  classTime: {
    fontSize: '14px',
    color: '#DC2626',
    margin: '0 0 8px 0',
  },
  instructor: {
    fontSize: '13px',
    color: '#DC2626',
    margin: '0',
  },
  reasonBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  reasonLabel: {
    fontSize: '11px',
    color: '#6B7280',
    margin: '0 0 4px 0',
    textTransform: 'uppercase',
    fontWeight: 600,
    letterSpacing: '0.5px',
  },
  reasonText: {
    fontSize: '14px',
    color: '#374151',
    margin: '0',
    lineHeight: '1.5',
  },
  separator: {
    borderTop: '1px solid #E5E7EB',
    margin: '24px 0',
  },
  buttonContainer: {
    textAlign: 'center',
    margin: '32px 0',
  },
  button: {
    backgroundColor: '#000000',
    color: '#ffffff',
    padding: '12px 32px',
    borderRadius: '6px',
    textDecoration: 'none',
    display: 'inline-block',
    fontWeight: 600,
    fontSize: '16px',
  },
  signOff: {
    fontSize: '16px',
    color: '#000000',
    margin: '24px 0 8px 0',
    fontWeight: 'normal',
    lineHeight: '1.5',
  },
  location: {
    fontSize: '16px',
    color: '#1F2937',
    margin: '0 0 4px 0',
    fontWeight: 'normal',
    lineHeight: '1.4',
  },
  address: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 8px 0',
    lineHeight: '1.4',
  },
  contact: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 32px 0',
    lineHeight: '1.4',
  },
  footer: {
    marginTop: '40px',
    borderTop: '1px solid #E5E7EB',
    paddingTop: '20px',
  },
  footerText: {
    fontSize: '12px',
    color: '#9CA3AF',
    margin: '0 0 8px 0',
    lineHeight: '1.4',
  },
  footerLinks: {
    fontSize: '12px',
    color: '#9CA3AF',
    margin: '0',
    lineHeight: '1.4',
  },
  link: {
    color: '#9CA3AF',
    textDecoration: 'underline',
  },
};

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
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.content}>
            <Text style={styles.greeting}>Hi {member.firstName},</Text>

            <Text style={styles.message}>
              We're sorry to inform you that your upcoming class has been cancelled.
            </Text>

            <Section style={styles.cancellationBox}>
              <Text style={styles.cancellationLabel}>Cancelled</Text>
              <Text style={styles.className}>{session.className}</Text>
              <Text style={styles.classDate}>{formatDate(session.date)}</Text>
              <Text style={styles.classTime}>{session.time}</Text>
              {session.instructor && (
                <Text style={styles.instructor}>
                  Instructor: {session.instructor.firstName} {session.instructor.lastName}
                </Text>
              )}
            </Section>

            {reason && (
              <Section style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Reason</Text>
                <Text style={styles.reasonText}>{reason}</Text>
              </Section>
            )}

            <Hr style={styles.separator} />

            <Text style={styles.message}>
              We apologize for any inconvenience. You can schedule a makeup class at your convenience.
            </Text>

            {makeupUrl && (
              <Section style={styles.buttonContainer}>
                <Button href={makeupUrl} style={styles.button}>
                  Schedule Makeup Class
                </Button>
              </Section>
            )}

            <Text style={styles.signOff}>Best regards,</Text>

            <Text style={styles.location}>{location.name}</Text>
            {location.address && <Text style={styles.address}>{location.address}</Text>}
            {location.email && (
              <Text style={styles.contact}>
                Questions? Contact us at {location.email}
                {location.phone && ` or ${location.phone}`}
              </Text>
            )}

            {monstro && (
              <Section style={styles.footer}>
                {monstro.fullAddress && (
                  <Text style={styles.footerText}>{monstro.fullAddress}</Text>
                )}
                <Text style={styles.footerLinks}>
                  {monstro.privacyUrl && (
                    <a href={monstro.privacyUrl} style={styles.link}>
                      Privacy Policy
                    </a>
                  )}
                  {monstro.privacyUrl && monstro.unsubscribeUrl && ' | '}
                  {monstro.unsubscribeUrl && (
                    <a href={monstro.unsubscribeUrl} style={styles.link}>
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
