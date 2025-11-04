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
  user: { name: string };
  program: { name: string };
  schedule: { dayTime: string };
  location: { name: string; address: string };
}

export default function ClassReminderEmail({
  user,
  program,
  schedule,
  location,
}: ClassReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          <Section style={contentStyle}>
            <Text style={greetingStyle}>Hi {user.name},</Text>

            <Text style={messageStyle}>
              Just a quick reminder that your class <strong>{program.name}</strong>{' '}
              is coming up on <strong>{schedule.dayTime}</strong>. Don't forget to
              check in and arrive early.
            </Text>

            <Text style={signOffStyle}>See you soon,</Text>

            <Text style={locationStyle}>{location.name}</Text>
            <Text style={addressStyle}>{location.address}</Text>
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
  margin: '0',
  lineHeight: '1.4',
};

ClassReminderEmail.PreviewProps = {
  user: {
    name: 'John',
  },
  program: {
    name: 'Morning Yoga',
  },
  schedule: {
    dayTime: 'Monday, November 3 at 8:00 AM',
  },
  location: {
    name: 'Monstro Studio',
    address: '123 Main St, Los Angeles, CA 90001',
  },
} as ClassReminderEmailProps;
