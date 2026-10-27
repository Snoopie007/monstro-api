import { Img, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { APP_STORE_BADGES } from './data';

const DEFAULT_MESSAGE =
    'Manage your memberships in one place Download our Android or Apple App below';

export function AppDownloadSection({
    message = DEFAULT_MESSAGE,
}: {
    message?: string;
}) {
    return (
        <Section style={styles.section}>
            <Text style={styles.message}>{message}</Text>
            <Section style={styles.badges}>
                {APP_STORE_BADGES.map(({ href, src, alt }, index) => (
                    <Link key={index} href={href} style={styles.badgeLink}>
                        <Img src={src} height={40} alt={alt} style={styles.badge} />
                    </Link>
                ))}
            </Section>
        </Section>
    );
}

const styles: Record<string, React.CSSProperties> = {
    section: {
        textAlign: 'left',
        margin: '24px 0',
        backgroundColor: '#EEF2FF',
        border: '1px solid #C7D2FE',
        padding: '24px 20px',
        borderRadius: '12px',
    },
    message: {
        fontSize: '16px',
        color: '#312E81',
        margin: '0 0 16px 0',
        lineHeight: '1.6',
        textAlign: 'left',
    },
    badges: {
        textAlign: 'left',
    },
    badgeLink: {
        display: 'inline-block',
        margin: '0 6px',
        textDecoration: 'none',
    },
    badge: {
        display: 'inline-block',
        border: 'none',
    },
};
