import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
} from '@react-email/components';
import { EmailFooter } from './_shared';
import { DummyData } from './_shared/data';
import { EmailStyles } from './_shared/SharedStyle';
import type { Member } from '@subtrees/types';
interface ResetSuccessEmailProps {
  member: Pick<Member, 'firstName' | 'lastName' | 'email'>;
  monstro: { fullAddress: string };
}

// Combined all styles into a single object for easier management
const styles: Record<string, React.CSSProperties> = EmailStyles

export default function ResetSuccessEmail({
  member,
}: ResetSuccessEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.content}>
            <Text style={styles.paragraph}>
              Dear {member.firstName} {member.lastName},
            </Text>

            <Text style={styles.paragraph}>
              The password for your Monstro account ({member.email}) has been
              successfully reset.
            </Text>

            <Text style={styles.paragraph}>
              If you didn't make this change or if you believe an unauthorized
              person has accessed your account, go to your Monstro App to reset
              your password immediately.
            </Text>

            <Text style={styles.paragraph}>
              If you need additional help, contact{' '}
              <strong>support@mymonstro.com</strong>
            </Text>


          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

ResetSuccessEmail.PreviewProps = DummyData
