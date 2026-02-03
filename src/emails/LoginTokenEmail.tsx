import * as React from 'react';
import {
	Html,
	Head,
	Body,
	Container,
	Section,
	Text,
} from '@react-email/components';

interface LoginTokenEmailProps {
	user: { name: string; email: string };
	otp: { token: string };
	monstro: { fullAddress: string };
}

// Combine all styles into a single object for easier management
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
		fontSize: '36px',
		fontWeight: 'bold',
		color: '#000000',
		margin: '0',
		letterSpacing: '8px',
		fontFamily: 'monospace',
	},
	footer: {
		fontSize: '14px',
		color: '#6B7280',
		margin: '20px 0 0 0',
		paddingTop: '20px',
		borderTop: '1px solid #e5e7eb',
	},
};

export default function LoginTokenEmail({
	user,
	otp,
	monstro,
}: LoginTokenEmailProps) {
	return (
		<Html>
			<Head />
			<Body style={styles.main}>
				<Container style={styles.container}>
					<Section style={styles.content}>
						<Text style={styles.greeting}>Dear {user.name},</Text>

						<Text style={styles.paragraph}>
							A request has been received to login to your Monstro Account,{' '}
							<strong>{user.email}</strong>. To continue with this request, use
							the verification code below in the next 30 minutes:
						</Text>

						<Section style={styles.otpBox}>
							<Text style={styles.otpCode}>{otp.token}</Text>
						</Section>

						<Text style={styles.paragraph}>
							If you didn't make this change or you believe an unauthorized
							person has attempted to access your account, you can simply ignore
							this email.
						</Text>

						<Text style={styles.footer}>{monstro.fullAddress}</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

LoginTokenEmail.PreviewProps = {
	user: {
		name: 'John Doe',
		email: 'john@example.com',
	},
	otp: {
		token: '650500',
	},
	monstro: {
		fullAddress: 'PO Box 263, Culver City, CA 90232',
	},
} as LoginTokenEmailProps;

