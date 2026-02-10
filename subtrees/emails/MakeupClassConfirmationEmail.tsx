import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
} from '@react-email/components';
import { EmailFooter, EmailBoxTitle, EmailBoxContent, EmailBox, EmailBoxLabel, LocationInfoBox } from './_shared';
import { EmailStyles } from './_shared/SharedStyle';
import { DummyData } from './_shared/data';
import { format } from 'date-fns';
import type { Member, Location } from '@subtrees/types';


interface MakeupClassConfirmationEmailProps {
  member: Pick<Member, 'firstName' | 'lastName'>;
  location: Pick<Location, 'name' | 'address' | 'email' | 'phone'>;
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
}

// Combined styles in a single object for easier management
const styles: Record<string, React.CSSProperties> = {
  ...EmailStyles,

  dateTime: {
    fontSize: '15px',
    lineHeight: '2',
    margin: '0',
  },

  creditsRemaining: {
    fontSize: '16px',
    lineHeight: '2',
    margin: '0',
  },

};

export default function MakeupClassConfirmationEmail({
  member,
  location,
  originalClass,
  makeupClass,
  creditsRemaining,
}: MakeupClassConfirmationEmailProps) {

  return (
    <Html>
      <Head />
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.content}>
            <Text style={styles.paragraph}>Hi {member.firstName},</Text>

            <Text style={styles.paragraph}>
              Great news! Your makeup class has been successfully scheduled.
            </Text>

            <EmailBox bgColor="#ECFDF5">
              <EmailBoxLabel label="Confirmed" color="#064E3B" />
              <EmailBoxTitle title={makeupClass.name} />
              <EmailBoxContent >
                <Text style={styles.dateTime}>{format(new Date(makeupClass.date), 'MMM d, yyyy')} at {makeupClass.time}</Text>

                {makeupClass.instructor && (
                  <Text style={styles.dateTime}>
                    Instructor: {makeupClass.instructor.firstName} {makeupClass.instructor.lastName}
                  </Text>
                )}
              </EmailBoxContent>
            </EmailBox>

            <EmailBox bgColor="#F3F4F6">
              <EmailBoxLabel label="Original Missed Class" color="#6B7280" />
              <EmailBoxTitle title={originalClass.name} />
              <EmailBoxContent>
                <Text style={styles.dateTime}>{format(new Date(originalClass.date), 'MMM d, yyyy')} at {originalClass.time}</Text>
              </EmailBoxContent>
            </EmailBox>

            {creditsRemaining !== undefined && (
              <EmailBox bgColor="#EFF6FF">
                <EmailBoxLabel label="Makeup Credits" color="#3B82F6" />
                <EmailBoxContent>
                  <Text style={styles.creditsRemaining}>
                    {creditsRemaining} credit{creditsRemaining !== 1 ? 's' : ''} remaining
                  </Text>
                </EmailBoxContent>
              </EmailBox>
            )}

            <Text style={styles.paragraph}>
              Please arrive a few minutes early to check in. We look forward to seeing you!
            </Text>

            <LocationInfoBox
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

MakeupClassConfirmationEmail.PreviewProps = {
  ...DummyData,
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

} as MakeupClassConfirmationEmailProps;
