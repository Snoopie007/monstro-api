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

export default function OTPEmailTemplate({
  member,
  location,
  otp,
  monstro,
}: OTPEmailTemplateProps) {
  return (
    <Html>
      <Head />
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Row>
              <Column style={logoColumnStyle}>
                <Img
                  src="https://www.mymonstro.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo.5ee5f89f.png&w=96&q=75"
                  width={100}
                  height={29}
                  alt="Monstro"
                  style={logoStyle}
                />
              </Column>
              <Column align="right" style={viewBrowserColumnStyle}>
                <Link href="#" style={viewBrowserStyle}>
                  View in browser
                </Link>
              </Column>
            </Row>
          </Section>

          <Section style={contentStyle}>
            <Text style={greetingStyle}>Hi {member.firstName}</Text>

            <Text style={paragraphStyle}>
              An invite to setup an Monstro account was made by{' '}
              <strong>{location.name}</strong>. We've sent you this email to verify
              that it is indeed you who are setting up the account. To continue,
              enter the code below on the verification page:
            </Text>

            <Section style={otpBoxStyle}>
              <Text style={otpCodeStyle}>{otp.token}</Text>
            </Section>

            <Text style={paragraphStyle}>
              If you didn't make this change or you believe an unauthorized person
              has attempted to access your account, you can simply ignore this
              email or contact{' '}
              <Link href={`mailto:${location.email}`} style={linkStyle}>
                {location.email}
              </Link>
              .
            </Text>

            <Hr style={dividerStyle} />

            <Text style={legalStyle}>
              You can opt out of receiving future emails by clicking{' '}
              <Link href={monstro.unsubscribeUrl} style={linkStyle}>
                unsubscribe
              </Link>
              . For more information about how we process data, please see our{' '}
              <Link href={monstro.privacyUrl} style={linkStyle}>
                Privacy Policy
              </Link>
              .
            </Text>

            <Text style={footerTextStyle}>{monstro.fullAddress}</Text>
          </Section>

          <Section style={socialSectionStyle}>
            <Row>
              <Column align="center" style={socialColumnStyle}>
                <Link href={monstro.xUrl} style={socialLinkStyle}>
                  <Img
                    src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/twitter_icon-circle.png"
                    width={32}
                    height={32}
                    alt="Twitter"
                    style={socialIconStyle}
                  />
                </Link>
                <Link href={monstro.linkedinUrl} style={socialLinkStyle}>
                  <Img
                    src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/linkedin_icon-circle_1.png"
                    width={32}
                    height={32}
                    alt="LinkedIn"
                    style={socialIconStyle}
                  />
                </Link>
                <Link href={monstro.instagramUrl} style={socialLinkStyle}>
                  <Img
                    src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/instagram_icon-circle_1.png"
                    width={32}
                    height={32}
                    alt="Instagram"
                    style={socialIconStyle}
                  />
                </Link>
                <Link href={monstro.facebookUrl} style={socialLinkStyle}>
                  <Img
                    src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/facebook_icon-circle_1.png"
                    width={32}
                    height={32}
                    alt="Facebook"
                    style={socialIconStyle}
                  />
                </Link>
                <Link href={monstro.youtubeUrl} style={socialLinkStyle}>
                  <Img
                    src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/youtube_icon-circle_1.png"
                    width={32}
                    height={32}
                    alt="YouTube"
                    style={socialIconStyle}
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

const mainStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Helvetica, Arial, sans-serif',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px',
};

const headerStyle: React.CSSProperties = {
  padding: '20px 0',
  borderBottom: '1px solid #e5e7eb',
};

const logoColumnStyle: React.CSSProperties = {
  width: '50%',
};

const logoStyle: React.CSSProperties = {
  display: 'block',
};

const viewBrowserColumnStyle: React.CSSProperties = {
  width: '50%',
  textAlign: 'right',
};

const viewBrowserStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#6F7782',
  textDecoration: 'underline',
};

const contentStyle: React.CSSProperties = {
  padding: '20px 0',
};

const greetingStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 'normal',
  color: '#000000',
  margin: '0 0 16px 0',
  lineHeight: '1.5',
};

const paragraphStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#000000',
  margin: '0 0 20px 0',
  lineHeight: '1.5',
};

const otpBoxStyle: React.CSSProperties = {
  backgroundColor: '#FAFAFA',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center',
};

const otpCodeStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#000000',
  margin: '0',
  letterSpacing: '4px',
  fontFamily: 'monospace',
};

const dividerStyle: React.CSSProperties = {
  borderColor: '#e5e7eb',
  borderStyle: 'solid',
  borderWidth: '1px 0 0 0',
  margin: '24px 0',
};

const legalStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#1F2937',
  margin: '16px 0',
  lineHeight: '1.5',
};

const linkStyle: React.CSSProperties = {
  color: '#4338ca',
  textDecoration: 'none',
  fontWeight: 'bold',
};

const footerTextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#1F2937',
  margin: '16px 0 0 0',
  lineHeight: '1.4',
};

const socialSectionStyle: React.CSSProperties = {
  padding: '20px 0 30px 0',
  textAlign: 'center',
};

const socialColumnStyle: React.CSSProperties = {
  width: '100%',
};

const socialLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  marginRight: '10px',
  textDecoration: 'none',
};

const socialIconStyle: React.CSSProperties = {
  display: 'inline-block',
  border: 'none',
};

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
