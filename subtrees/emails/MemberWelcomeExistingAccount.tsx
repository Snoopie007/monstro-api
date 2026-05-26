import * as React from 'react';
import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Link,
} from '@react-email/components';
import { EmailHeader, EmailFooter } from './_shared';
import { EmailStyles } from './_shared/SharedStyle';
import { DummyData } from './_shared/data';
import type { Member, Location } from '../types';

interface MemberWelcomeExistingAccountEmailProps {
    member: Pick<Member, 'firstName'>;
    location: Pick<Location, 'name'>;
    iosAppUrl: string;
    androidAppUrl: string;
}

const styles: Record<string, React.CSSProperties> = {
    ...EmailStyles,
    buttonSection: {
        textAlign: 'center',
        margin: '12px 0',
    },
    appButton: {
        backgroundColor: '#4338ca',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 'bold',
        borderRadius: '10px',
        textDecoration: 'none',
        display: 'inline-block',
        padding: '12px 20px',
        margin: '4px',
    },
};

export default function MemberWelcomeExistingAccountEmail({
    member,
    location,
    iosAppUrl,
    androidAppUrl,
}: MemberWelcomeExistingAccountEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={styles.main}>
                <Container style={styles.container}>
                    <EmailHeader />
                    <Section style={styles.content}>
                        <Text style={styles.paragraph}>Hi {member.firstName}</Text>
                        <Text style={styles.paragraph}>
                            You've been added to a new location: <strong>{location.name}</strong>
                        </Text>
                        <Text style={styles.paragraph}>
                            Sign in with your existing Monstro account to get started.
                        </Text>

                        <Text style={styles.paragraph}>
                            Download the Monstro X App:
                        </Text>
                        <Section style={styles.buttonSection}>
                            <Link style={styles.appButton} href={iosAppUrl}>
                                Download for iOS
                            </Link>
                            <Link style={styles.appButton} href={androidAppUrl}>
                                Download for Android
                            </Link>
                        </Section>
                    </Section>
                    <EmailFooter social={true} />
                </Container>
            </Body>
        </Html>
    );
}

MemberWelcomeExistingAccountEmail.PreviewProps = {
    ...DummyData,
    iosAppUrl: 'https://apps.apple.com/app/monstro-x/id123456789',
    androidAppUrl: 'https://play.google.com/store/apps/details?id=com.monstro.x',
};
