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
import EmailHeader from './_shared/EmailHeader';
import EmailFooter from './_shared/EmailFooter';
import { EmailStyles } from './_shared/SharedStyle';
import { DummyData } from './_shared/DummyData';


interface MigrationEmailProps {
    member: { firstName: string };
    location: { name: string };
    migrateId: string;
}

const styles: Record<string, React.CSSProperties> = EmailStyles;
export default function MigrationEmail({
    member,
    location,
    migrateId,
}: MigrationEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={styles.main}>
                <Container style={styles.container}>
                    <EmailHeader />
                    <Section style={styles.content}>
                        <Text style={styles.paragraph}>Hi {member.firstName}</Text>
                        <Text style={styles.paragraph}>
                            Great news! <strong>{location.name}</strong> invites you to join
                            their classes. Let's get you all set up and ready to go. First,
                            please complete your account setup by clicking the Accept Invite
                            button below.
                        </Text>
                        <Section style={styles.buttonSection}>
                            <Button style={styles.button} href={`https://monstro-x.com/register?migrateId=${migrateId}`} >
                                Accept Invite
                            </Button>
                        </Section>
                    </Section>
                    <EmailFooter social={true} />
                </Container>
            </Body>
        </Html>
    );
}

MigrationEmail.PreviewProps = {
    ...DummyData,
    migrateId: '1234567890',
};