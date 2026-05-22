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

interface MemberWelcomeNewAccountEmailProps {
    member: Pick<Member, 'firstName' | 'email'>;
    location: Pick<Location, 'name'>;
    tempPassword: string;
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
    credsBox: {
        backgroundColor: '#F3F4F6',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
    },
    credsLabel: {
        fontSize: '12px',
        color: '#6B7280',
        textTransform: 'uppercase' as const,
        margin: '0 0 4px 0',
        fontWeight: '600' as const,
    },
    credsValue: {
        fontSize: '15px',
        color: '#111827',
        margin: '0 0 12px 0',
    },
};

export default function MemberWelcomeNewAccountEmail({
    member,
    location,
    tempPassword,
    iosAppUrl,
    androidAppUrl,
}: MemberWelcomeNewAccountEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={styles.main}>
                <Container style={styles.container}>
                    <EmailHeader />
                    <Section style={styles.content}>
                        <Text style={styles.paragraph}>Hi {member.firstName}</Text>
                        <Text style={styles.paragraph}>
                            Great news! <strong>{location.name}</strong> has added you as a member.
                            Your account is ready. Use the credentials below to sign in.
                        </Text>

                        <Section style={styles.credsBox}>
                            <Text style={styles.credsLabel}>Email</Text>
                            <Text style={styles.credsValue}>{member.email}</Text>
                            <Text style={styles.credsLabel}>Temporary Password</Text>
                            <Text style={styles.credsValue}>{tempPassword}</Text>
                        </Section>

                        <Text style={styles.paragraph}>
                            After signing in, you can book classes and manage your membership.
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

MemberWelcomeNewAccountEmail.PreviewProps = {
    ...DummyData,
    tempPassword: 'Monstro2024!',
    iosAppUrl: 'https://apps.apple.com/app/monstro-x/id123456789',
    androidAppUrl: 'https://play.google.com/store/apps/details?id=com.monstro.x',
};
