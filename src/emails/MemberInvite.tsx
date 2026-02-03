import * as React from 'react';
import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Button,
    Link,
    Hr,
    Img,
} from '@react-email/components';

interface MemberInviteEmailProps {
    member: { firstName: string };
    location: { name: string };
    ui: { btnUrl: string; btnText: string };
    monstro: {
        fullAddress: string;
        unsubscribeUrl: string;
        privacyUrl: string;
        xUrl: string;
        linkedinUrl: string;
        instagramUrl: string;
        facebookUrl: string;
        youtubeUrl: string;
    };
}

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
    logoSection: {
        textAlign: 'center',
        padding: '20px 0',
    },
    logo: {
        display: 'block',
        margin: '0 auto',
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
    paragraph: {
        fontSize: '16px',
        color: '#000000',
        margin: '0 0 20px 0',
        lineHeight: '1.5',
    },
    buttonSection: {
        textAlign: 'left',
        margin: '24px 0',
    },
    button: {
        backgroundColor: '#4338ca',
        color: '#ffffff',
        fontSize: '16px',
        fontWeight: 'bold',
        borderRadius: '10px',
        textDecoration: 'none',
        display: 'inline-block',
        padding: '14px 25px',
    },
    divider: {
        borderColor: '#e5e7eb',
        borderStyle: 'solid',
        borderWidth: '1px 0 0 0',
        margin: '24px 0',
    },
    legal: {
        fontSize: '14px',
        color: '#1F2937',
        margin: '16px 0',
        lineHeight: '1.5',
    },
    link: {
        color: '#4338ca',
        textDecoration: 'none',
        fontWeight: 'bold',
    },
    footerText: {
        fontSize: '14px',
        color: '#1F2937',
        margin: '16px 0 0 0',
        lineHeight: '1.4',
    }
} as const;

export default function MemberInviteEmail({
    member,
    location,
    ui,
    monstro,
}: MemberInviteEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={styles.main}>
                <Container style={styles.container}>
                    <Section style={styles.logoSection}>
                        <Img
                            src="https://www.mymonstro.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo.5ee5f89f.png&w=96&q=75"
                            width={100}
                            height={29}
                            alt="Monstro"
                            style={styles.logo}
                        />
                    </Section>

                    <Section style={styles.content}>
                        <Text style={styles.greeting}>Hi {member.firstName}</Text>

                        <Text style={styles.paragraph}>
                            Great news! <strong>{location.name}</strong> invites you to join
                            their classes. Let's get you all set up and ready to go. First,
                            please complete your account setup by clicking the Accept Invite
                            button below.
                        </Text>

                        <Section style={styles.buttonSection}>
                            <Button
                                style={styles.button}
                                href={ui.btnUrl}
                            >
                                {ui.btnText}
                            </Button>
                        </Section>

                        <Hr style={styles.divider} />

                        <Text style={styles.legal}>
                            You can opt out of receiving future emails by clicking{' '}
                            <Link href={monstro.unsubscribeUrl} style={styles.link}>
                                unsubscribe
                            </Link>
                            . For more information about how we process data, please see our{' '}
                            <Link href={monstro.privacyUrl} style={styles.link}>
                                Privacy Policy
                            </Link>
                            .
                        </Text>

                        <Text style={styles.footerText}>{monstro.fullAddress}</Text>
                    </Section>

                </Container>
            </Body>
        </Html>
    );
}

MemberInviteEmail.PreviewProps = {
    member: {
        firstName: 'John',
    },
    location: {
        name: 'Fit Studio',
    },
    ui: {
        btnUrl: 'https://example.com/accept-invite',
        btnText: 'Accept Invite',
    },
    monstro: {
        fullAddress: 'PO Box 123, City, State 12345\nCopyright 2025 Monstro',
        unsubscribeUrl: 'https://example.com/unsubscribe',
    },
} as MemberInviteEmailProps;