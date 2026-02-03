import { Img, Link, Row, Column, Section, Hr, Text } from '@react-email/components';
import * as React from 'react';
import { MonstroData } from '@/constants/data';

const SOCIAL_ICONS = [
    {
        href: "https://twitter.com/monstro",
        src: "https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/twitter_icon-circle.png",
        alt: "Twitter",
    },
    {
        href: "https://linkedin.com/company/monstro",
        src: "https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/linkedin_icon-circle_1.png",
        alt: "LinkedIn",
    },
    {
        href: "https://instagram.com/monstro",
        src: "https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/instagram_icon-circle_1.png",
        alt: "Instagram",
    },
    {
        href: "https://facebook.com/monstro",
        src: "https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/facebook_icon-circle_1.png",
        alt: "Facebook",
    },
    {
        href: "https://youtube.com/@monstro",
        src: "https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/youtube_icon-circle_1.png",
        alt: "YouTube",
    },
]


export default function EmailFooter({ social }: { social?: boolean }) {
    return (
        <>
            <Hr style={styles.divider} />
            <Section style={{ textAlign: 'center' }}>
                {social && (
                    <Section style={styles.socialSection}>
                        <Row>
                            <Column align="center" style={styles.socialColumn}>
                                {SOCIAL_ICONS.map(({ href, src, alt }, index) => (
                                    <Link key={index} href={href} style={styles.socialLink}>
                                        <Img src={src} width={32} height={32} alt={alt} style={styles.socialIcon} />
                                    </Link>
                                ))}
                            </Column>
                        </Row>
                    </Section>
                )}

                <Text style={styles.legal}>
                    You can opt out of receiving future emails by clicking{' '}
                    <Link href={MonstroData.unsubscribeUrl} style={styles.link}>
                        unsubscribe
                    </Link>
                    . For more information about how we process data, please see our{' '}
                    <Link href={MonstroData.privacyUrl} style={styles.link}>
                        Privacy Policy
                    </Link>
                    .
                </Text>
                <Text style={styles.footerText}>{MonstroData.fullAddress}</Text>
            </Section>
        </>



    )
}


const styles: Record<string, React.CSSProperties> = {
    socialSection: {
        padding: '10px 0',
    },
    socialColumn: {
        width: '100%',
    },
    socialLink: {
        display: 'inline-block',
        marginRight: '10px',
        textDecoration: 'none',
    },
    socialIcon: {
        display: 'inline-block',
        border: 'none',
    },
    divider: {
        borderColor: '#e5e7eb',
        borderStyle: 'solid',
        borderWidth: '1px 0 0 0',
        margin: '24px 0',
    },
    legal: {
        fontSize: '16px',
        color: '#1F2937',
        margin: '16px 0',
        lineHeight: '1.6',
    },
    footerText: {

        fontSize: '15px',
        color: '#1F2937',
        margin: '16px 0 0 0',
        lineHeight: '1.6',
    },
}