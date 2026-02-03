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

// Combined styles in a single object for easier management
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
  confirmationBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    borderLeft: '4px solid #10B981',
  },
  confirmationLabel: {
    fontSize: '12px',
    color: '#047857',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  className: {
    fontSize: '18px',
    color: '#064E3B',
    margin: '0 0 4px 0',
    fontWeight: '600',
  },
  classDate: {
    fontSize: '15px',
    color: '#065F46',
    margin: '0 0 2px 0',
    fontWeight: '500',
  },
  classTime: {
    fontSize: '14px',
    color: '#047857',
    margin: '0 0 8px 0',
  },
  instructor: {
    fontSize: '13px',
    color: '#059669',
    margin: '0',
  },
  originalBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  originalLabel: {
    fontSize: '11px',
    color: '#6B7280',
    margin: '0 0 4px 0',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  originalClass: {
    fontSize: '14px',
    color: '#374151',
    margin: '0 0 2px 0',
    fontWeight: '500',
  },
  originalDetails: {
    fontSize: '13px',
    color: '#6B7280',
    margin: '0',
  },
  creditsBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
  },
  creditsLabel: {
    fontSize: '11px',
    color: '#3B82F6',
    margin: '0 0 4px 0',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  creditsValue: {
    fontSize: '14px',
    color: '#1D4ED8',
    margin: '0',
    fontWeight: '500',
  },
  separator: {
    borderTop: '1px solid #E5E7EB',
    margin: '24px 0',
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
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.content}>
            <Text style={styles.greeting}>Hi {member.firstName},</Text>

            <Text style={styles.message}>
              Great news! Your makeup class has been successfully scheduled.
            </Text>

            <Section style={styles.confirmationBox}>
              <Text style={styles.confirmationLabel}>Confirmed</Text>
              <Text style={styles.className}>{makeupClass.name}</Text>
              <Text style={styles.classDate}>{formatDate(makeupClass.date)}</Text>
              <Text style={styles.classTime}>{makeupClass.time}</Text>
              {makeupClass.instructor && (
                <Text style={styles.instructor}>
                  Instructor: {makeupClass.instructor.firstName} {makeupClass.instructor.lastName}
                </Text>
              )}
            </Section>

            <Section style={styles.originalBox}>
              <Text style={styles.originalLabel}>Original Missed Class</Text>
              <Text style={styles.originalClass}>{originalClass.name}</Text>
              <Text style={styles.originalDetails}>
                {formatDate(originalClass.date)} at {originalClass.time}
              </Text>
            </Section>

            {creditsRemaining !== undefined && (
              <Section style={styles.creditsBox}>
                <Text style={styles.creditsLabel}>Makeup Credits</Text>
                <Text style={styles.creditsValue}>
                  {creditsRemaining} credit{creditsRemaining !== 1 ? 's' : ''} remaining
                </Text>
              </Section>
            )}

            <Hr style={styles.separator} />

            <Text style={styles.message}>
              Please arrive a few minutes early to check in. We look forward to seeing you!
            </Text>

            <Text style={styles.signOff}>See you soon,</Text>

            <Text style={styles.location}>{location.name}</Text>
            {location.address && <Text style={styles.address}>{location.address}</Text>}

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
