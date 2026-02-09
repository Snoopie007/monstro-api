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
import { EmailFooter, LocationInfoBox } from './_shared';
import { EmailStyles } from './_shared/SharedStyle';
import { DummyData } from './_shared/DummyData';
import { format } from 'date-fns';
interface MissedClassEmailProps {
  member: { id: string; firstName: string; lastName: string | null; email: string };
  class: {
    name: string;
    startTime: Date;
    endTime: Date;
    instructor?: { firstName: string; lastName: string | null } | null;
  };
  location: { id: string; name: string; address: string | null; email: string | null; phone: string | null };

}

// Combine all styles into a single object for easier management
const styles: Record<string, React.CSSProperties> = {
  ...EmailStyles,
  buttonContainer: {
    textAlign: 'center',
    margin: '32px 0',
  }
};

export default function MissedClassEmail({
  member,
  class: classData,
  location,
}: MissedClassEmailProps) {

  return (
    <Html>
      <Head />
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.content}>
            <Text style={styles.paragraph}>Hi {member.firstName},</Text>

            <Text style={styles.paragraph}>
              We noticed you missed your <strong>{classData.name}</strong>{' '}
              class scheduled for <strong>{format(new Date(classData.startTime), 'MMM d, yyyy')}</strong> at <strong>{format(new Date(classData.startTime), 'h:mm a')}</strong>.
            </Text>

            <Text style={styles.paragraph}>
              We hope everything is okay! We'd love to see you at your next
              class.
            </Text>

            <Section style={styles.buttonContainer}>
              <Button
                href={`https://m.monstro-x.com/location/${location.id}/${member.id}/sessions`}
                style={styles.button}
              >
                Book Your Next Class
              </Button>
            </Section>

            <LocationInfoBox
              regards="See you soon,"
              name={location.name}
              address={location.address}
              email={location.email}
              phone={location.phone}
            />
          </Section>
          <EmailFooter social={true} />
        </Container>
      </Body>
    </Html>
  );
}

MissedClassEmail.PreviewProps = {
  ...DummyData,
  class: {
    name: 'Morning Yoga',
    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 23 * 60 * 60 * 1000),
    instructor: {
      firstName: 'Jane',
      lastName: 'Smith',
    },
  },
} as MissedClassEmailProps;

