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
import { EmailFooter, EmailHeader, OTPBox } from './_shared';
import { DummyData } from './_shared/DummyData';
import { EmailStyles } from './_shared/SharedStyle';

interface OTPEmailTemplateProps {
	member: { firstName: string };
	location: { name: string; email: string };
	otp: { token: string };
}

// Combined all styles into a single object for easier management
const styles: Record<string, React.CSSProperties> = EmailStyles;


export default function OTPEmailTemplate({
	member,
	location,
	otp,
}: OTPEmailTemplateProps) {
	return (
		<Html>
			<Head />
			<Body style={styles.main}>
				<Container style={styles.container}>
					<EmailHeader />
					<Section style={styles.content}>
						<Text style={styles.paragraph}>Hi {member.firstName}</Text>

						<Text style={styles.paragraph}>
							An invite to setup an Monstro account was made by{' '}
							<strong>{location.name}</strong>. We've sent you this email to verify
							that it is indeed you who are setting up the account. To continue,
							enter the code below on the verification page:
						</Text>

						<OTPBox token={otp.token} />

						<Text style={styles.paragraph}>
							If you didn't make this change or you believe an unauthorized person
							has attempted to access your account, you can simply ignore this
							email or contact{' '}
							<Link href={`mailto:${location.email}`} style={styles.link}>
								{location.email}
							</Link>
							.
						</Text>
					</Section>

					<EmailFooter />
				</Container>
			</Body>
		</Html>
	);
}

OTPEmailTemplate.PreviewProps = {
	...DummyData,
	otp: {
		token: '650500',
	}
};
