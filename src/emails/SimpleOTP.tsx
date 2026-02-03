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
import { DummyData } from './_shared/DummyData';
import EmailFooter from './_shared/EmailFooter';
import { EmailStyles } from './_shared/SharedStyle';

interface SimpleOTPEmailProps {
	member: { firstName: string };
	location: { name: string; email: string };
	otp: { token: string };
}

const style: Record<string, React.CSSProperties> = {
	...EmailStyles,
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

};

export default function SimpleOTPEmail({
	member,
	location,
	otp,
}: SimpleOTPEmailProps) {
	return (
		<Html>
			<Head />
			<Body style={style.main}>
				<Container style={style.container}>
					<Section style={style.content}>
						<Text style={style.paragraph}>Hi {member.firstName},</Text>

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

					</Section>
					<EmailFooter
						social={true}
					/>
				</Container>
			</Body>
		</Html>
	);
}

SimpleOTPEmail.PreviewProps = {
	...DummyData,
	otp: {
		token: '650500',
	},
};
