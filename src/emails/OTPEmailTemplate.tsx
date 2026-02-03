import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Link,
  Hr,
  Img,
} from '@react-email/components';

interface OTPEmailTemplateProps {
  member: { firstName: string };
  location: { name: string; email: string };
  otp: { token: string };
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

// Combined all styles into a single object for easier management
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
  header: {
    padding: '20px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  logoColumn: {
    width: '50%',
  },
  logo: {
    display: 'block',
  },
  viewBrowserColumn: {
    width: '50%',
    textAlign: 'right',
  },
  viewBrowser: {
    fontSize: '10px',
    color: '#6F7782',
    textDecoration: 'underline',
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
  otpBox: {
    backgroundColor: '#FAFAFA',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    margin: '24px 0',
    textAlign: 'center',
  },
  otpCode: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#000000',
    margin: '0',
    letterSpacing: '4px',
    fontFamily: 'monospace',
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
  },
  socialSection: {
    padding: '20px 0 30px 0',
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
};

export default function OTPEmailTemplate({
  member,
  location,
  otp,
  monstro,
}: OTPEmailTemplateProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Row>
              <Column style={styles.logoColumn}>
                <Img
                  src="https://www.mymonstro.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo.5ee5f89f.png&w=96&q=75"
                  width={100}
                  height={29}
                  alt="Monstro"
                  style={styles.logo}
                />
              </Column>
              <Column align="right" style={styles.viewBrowserColumn}>
                <Link href="#" style={styles.viewBrowser}>
                  View in browser
                </Link>
              </Column>
            </Row>
          </Section>

          <Section style={styles.content}>
            <Text style={styles.greeting}>Hi {member.firstName}</Text>

            <Text style={styles.paragraph}>
              An invite to setup an Monstro account was made by{' '}
              <strong>{location.name}</strong>. We've sent you this email to verify
              that it is indeed you who are setting up the account. To continue,
              enter the code below on the verification page:
            </Text>

            <Section style={styles.otpBox}>
              <Text style={styles.otpCode}>{otp.token}</Text>
            </Section>

            <Text style={styles.paragraph}>
              If you didn't make this change or you believe an unauthorized person
              has attempted to access your account, you can simply ignore this
              email or contact{' '}
              <Link href={`mailto:${location.email}`} style={styles.link}>
                {location.email}
              </Link>
              .
            </Text>

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

          <Section style={styles.socialSection}>
            <Row>
              <Column align="center" style={styles.socialColumn}>
                <Link href={monstro.xUrl} style={styles.socialLink}>
                  <Img
                    src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/twitter_icon-circle.png"
                    width={32}
                    height={32}
                    alt="Twitter"
                    style={styles.socialIcon}
                  />
                </Link>
                <Link href={monstro.linkedinUrl} style={styles.socialLink}>
                  <Img
                    src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/linkedin_icon-circle_1.png"
                    width={32}
                    height={32}
                    alt="LinkedIn"
                    style={styles.socialIcon}
                  />
                </Link>
                <Link href={monstro.instagramUrl} style={styles.socialLink}>
                  <Img
                    src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/instagram_icon-circle_1.png"
                    width={32}
                    height={32}
                    alt="Instagram"
                    style={styles.socialIcon}
                  />
                </Link>
                <Link href={monstro.facebookUrl} style={styles.socialLink}>
                  <Img
                    src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/facebook_icon-circle_1.png"
                    width={32}
                    height={32}
                    alt="Facebook"
                    style={styles.socialIcon}
                  />
                </Link>
                <Link href={monstro.youtubeUrl} style={styles.socialLink}>
                  <Img
                    src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/youtube_icon-circle_1.png"
                    width={32}
                    height={32}
                    alt="YouTube"
                    style={styles.socialIcon}
                  />
                </Link>
              </Column>
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

OTPEmailTemplate.PreviewProps = {
  member: {
    firstName: 'John',
  },
  location: {
    name: 'Fit Studio',
    email: 'contact@fitstudio.com',
  },
  otp: {
    token: '650500',
  },
  monstro: {
    fullAddress: 'PO Box 263, Culver City, CA 90232',
    unsubscribeUrl: 'https://example.com/unsubscribe',
    privacyUrl: 'https://example.com/privacy',
    xUrl: 'https://twitter.com/monstro',
    linkedinUrl: 'https://linkedin.com/company/monstro',
    instagramUrl: 'https://instagram.com/monstro',
    facebookUrl: 'https://facebook.com/monstro',
    youtubeUrl: 'https://youtube.com/@monstro',
  },
} as OTPEmailTemplateProps;
