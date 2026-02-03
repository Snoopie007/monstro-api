import { Img, Link, Row, Column, Section } from '@react-email/components';
import * as React from 'react';

const styles: Record<string, React.CSSProperties> = {
    socialSection: {
        padding: '20px 0',
        textAlign: 'center',
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
}
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

export default function SocialFooter() {
    return (
        <Section style={styles.socialSection}>
            <Row>
                <Column align="center" style={styles.socialColumn}>
                    {SOCIAL_ICONS.map(({ href, src, alt }) => (
                        <Link href={href} style={styles.socialLink}>
                            <Img src={src} width={32} height={32} alt={alt} style={styles.socialIcon} />
                        </Link>
                    ))}
                </Column>
            </Row>
        </Section>
    )
}

