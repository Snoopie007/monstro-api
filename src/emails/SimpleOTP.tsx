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
import OTPBox from './_shared/OTPBox';

interface SimpleOTPEmailProps {
	member: { firstName: string };
	location: { name: string; email: string };
	otp: { token: string };
}

const style: Record<string, React.CSSProperties> = EmailStyles;

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

						<OTPBox token={otp.token} />

						<Text style={style.paragraph}>
							If you didn't make this change, ignore this email or contact{' '}
							<Link href={`mailto:support@mymonstro.com`} style={style.link}>
								support@mymonstro.com
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

SimpleOTPEmail.PreviewProps = {
	...DummyData,
	otp: {
		token: '650500',
	},
};
