import * as React from 'react';
import {
	Html,
	Head,
	Body,
	Container,
	Section,
	Text,
} from '@react-email/components';
import { OTPBox, EmailFooter, EmailHeader } from './_shared';
import { EmailStyles } from './_shared/SharedStyle';
import { DummyData } from './_shared/DummyData';

interface LoginTokenEmailProps {
	user: { name: string; email: string };
	otp: { token: string };
}

// Combine all styles into a single object for easier management
const styles: Record<string, React.CSSProperties> = EmailStyles;

export default function LoginTokenEmail({
	user,
	otp,
}: LoginTokenEmailProps) {
	return (
		<Html>
			<Head />
			<Body style={styles.main}>
				<Container style={styles.container}>
					<EmailHeader />
					<Section style={styles.content}>
						<Text style={styles.paragraph}>Hi {user.name},</Text>

						<Text style={styles.paragraph}>
							A request has been received to login to your Monstro Account,{' '}
							<strong>{user.email}</strong>. To continue with this request, use
							the verification code below in the next 30 minutes:
						</Text>

						<OTPBox token={otp.token} />

						<Text style={styles.paragraph}>
							If you didn't make this change or you believe an unauthorized
							person has attempted to access your account, you can simply ignore
							this email.
						</Text>

					</Section>
					<EmailFooter />
				</Container>
			</Body>
		</Html>
	);
}

LoginTokenEmail.PreviewProps = {
	user: {
		name: `${DummyData.member.firstName} ${DummyData.member.lastName}`,
		email: DummyData.member.email,
	},
	otp: {
		token: '650500',
	},
};

