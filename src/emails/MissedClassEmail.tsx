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

interface MissedClassEmailProps {
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

// Combine all styles into a single object for easier management
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
    fontWeight: '600',
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

export default function MissedClassEmail({
  member,
  class: classData,
  location,
  monstro,
}: MissedClassEmailProps) {
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
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.content}>
            <Text style={styles.greeting}>Hi {member.firstName},</Text>

            <Text style={styles.message}>
              We noticed you missed your <strong>{classData.name}</strong>{' '}
              class scheduled for <strong>{classDate}</strong> at <strong>{classTime}</strong>.
            </Text>

            <Text style={styles.message}>
              We hope everything is okay! We'd love to see you at your next
              class.
            </Text>

            <Section style={styles.buttonContainer}>
              <Button
                href={`https://app.monstro-x.com/schedule`}
                style={styles.button}
              >
                Book Your Next Class
              </Button>
            </Section>

            <Text style={styles.signOff}>See you soon,</Text>

            <Text style={styles.location}>{location.name}</Text>
            <Text style={styles.address}>{location.address}</Text>

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

MissedClassEmail.PreviewProps = {
  member: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  class: {
    name: 'Morning Yoga',
    description: 'Start your day with a relaxing yoga session',
    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
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
    privacyUrl: 'https://monstro-x.com/privacy',
    unsubscribeUrl: 'https://monstro-x.com/unsubscribe',
  },
} as MissedClassEmailProps;

