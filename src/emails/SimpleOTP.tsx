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

interface SimpleOTPEmailProps {
	member: { firstName: string };
	location: { name: string; email: string };
	otp: { token: string };
	monstro: { fullAddress: string };
}

const style: Record<string, React.CSSProperties> = {
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
	legal: {
		fontSize: '12px',
		color: '#6B7280',
		margin: '12px 0',
		lineHeight: '1.5',
	},
	link: {
		color: '#4338ca',
		textDecoration: 'none',
		fontWeight: 'bold',
	},
	footer: {
		fontSize: '12px',
		color: '#6B7280',
		margin: '20px 0 0 0',
		paddingTop: '20px',
		borderTop: '1px solid #e5e7eb',
		textAlign: 'center',
	},
};

export default function SimpleOTPEmail({
	member,
	location,
	otp,
	monstro,
}: SimpleOTPEmailProps) {
	return (
		<Html>
			<Head />
			<Body style={style.main}>
				<Container style={style.container}>
					<Section style={style.content}>
						<Text style={style.greeting}>Hi {member.firstName},</Text>

						<Text style={style.paragraph}>
							An invite to set up a Monstro account was made by{' '}
							<strong>{location.name}</strong>. To continue, enter the code below
							on the verification page:
						</Text>

						<Section style={style.otpBox}>
							<Text style={style.otpCode}>{otp.token}</Text>
						</Section>

						<Text style={style.paragraph}>
							If you didn't make this change, ignore this email or contact{' '}
							<Link href={`mailto:${location.email}`} style={style.link}>
								{location.email}
							</Link>
							.
						</Text>

						<Text style={style.legal}>
							You can opt out by clicking{' '}
							<Link href="#" style={style.link}>
								unsubscribe
							</Link>
							. See our{' '}
							<Link href="#" style={style.link}>
								Privacy Policy
							</Link>{' '}
							for details.
						</Text>

						<Text style={style.footer}>{monstro.fullAddress}</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

SimpleOTPEmail.PreviewProps = {
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
	},
} as SimpleOTPEmailProps;
