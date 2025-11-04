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

export default function MemberInviteEmail({
  member,
  location,
  ui,
  monstro,
}: MemberInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          <Section style={logoSectionStyle}>
            <Img
              src="https://www.mymonstro.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo.5ee5f89f.png&w=96&q=75"
              width={100}
              height={29}
              alt="Monstro"
              style={logoStyle}
            />
          </Section>

          <Section style={contentStyle}>
            <Text style={greetingStyle}>Hi {member.firstName}</Text>

            <Text style={paragraphStyle}>
              Great news! <strong>{location.name}</strong> invites you to join
              their classes. Let's get you all set up and ready to go. First,
              please complete your account setup by clicking the Accept Invite
              button below.
            </Text>

            <Section style={buttonSectionStyle}>
              <Button
                style={buttonStyle}
                href={ui.btnUrl}
              >
                {ui.btnText}
              </Button>
            </Section>

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

const logoSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '20px 0',
};

const logoStyle: React.CSSProperties = {
  display: 'block',
  margin: '0 auto',
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

const buttonSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '24px 0',
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#4338ca',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  borderRadius: '3px',
  textDecoration: 'none',
  display: 'inline-block',
  padding: '10px 25px'
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
  padding: '20px 0',
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
    privacyUrl: 'https://example.com/privacy',
    xUrl: 'https://twitter.com/monstro',
    linkedinUrl: 'https://linkedin.com/company/monstro',
    instagramUrl: 'https://instagram.com/monstro',
    facebookUrl: 'https://facebook.com/monstro',
    youtubeUrl: 'https://youtube.com/@monstro',
  },
} as MemberInviteEmailProps;
