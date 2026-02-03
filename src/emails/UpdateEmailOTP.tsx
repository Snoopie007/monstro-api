import * as React from 'react';
import {
	Html,
	Head,
	Body,
	Container,
	Section,
	Text,
} from '@react-email/components';

interface UpdateEmailOTPEmailProps {
	member: { firstName: string; lastName: string };
	update: { email: string; token: string };
	monstro: { fullAddress: string };
}

const styles: { [key: string]: React.CSSProperties } = {
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
	warning: {
		fontSize: '16px',
		color: '#000000',
		margin: '20px 0',
		lineHeight: '1.6',
	},
	footer: {
		fontSize: '14px',
		color: '#6B7280',
		margin: '20px 0 0 0',
		paddingTop: '20px',
		borderTop: '1px solid #e5e7eb',
	},
};

export default function UpdateEmailOTPEmail({
	member,
	update,
	monstro,
}: UpdateEmailOTPEmailProps) {
	return (
		<Html>
			<Head />
			<Body style={styles.main}>
				<Container style={styles.container}>
					<Section style={styles.content}>
						<Text style={styles.greeting}>
							Dear {member.firstName} {member.lastName},
						</Text>

						<Text style={styles.paragraph}>
							A request to update your current account email to{' '}
							<strong>{update.email}</strong> was made. To complete this request,
							click the button below. Your request link will expire in 24 hours.
						</Text>

						<Section style={styles.otpBox}>
							<Text style={styles.otpCode}>{update.token}</Text>
						</Section>

						<Text style={styles.warning}>
							If you didn't make this change or you believe an unauthorized person
							has attempted to access your account, you can simply ignore this
							email.
						</Text>

						<Text style={styles.footer}>{monstro.fullAddress}</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

UpdateEmailOTPEmail.PreviewProps = {
	member: {
		firstName: 'John',
		lastName: 'Doe',
	},
	update: {
		email: 'newemail@example.com',
		token: '123456',
	},
	monstro: {
		fullAddress: 'PO Box 123, City, State 12345\nCopyright 2025 Monstro',
	},
} as UpdateEmailOTPEmailProps;
