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
import { EmailHeader, EmailFooter } from './_shared';
import { EmailStyles } from './_shared/SharedStyle';
import { DummyData } from './_shared/DummyData';


interface MemberInviteEmailProps {
    member: { firstName: string, id: string };
    location: { name: string, id: string };
}

const styles: Record<string, React.CSSProperties> = {
    ...EmailStyles,
    buttonSection: {
        textAlign: 'center',
        margin: '12px 0',
    },
};
export default function MemberInviteEmail({
    member,
    location,
}: MemberInviteEmailProps) {
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
                            <Button style={styles.button} href={`https://m.monstro-x.com/register?slug=${location.id}memberId=${member.id}`}>
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

MemberInviteEmail.PreviewProps = DummyData;