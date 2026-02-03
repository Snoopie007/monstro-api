import * as React from 'react';
import {
	Html,
	Head,
	Body,
	Container,
	Section,
	Text,
} from '@react-email/components';
import EmailHeader from './_shared/EmailHeader';
import EmailFooter from './_shared/EmailFooter';
import { EmailStyles } from './_shared/SharedStyle';
import { DummyData } from './_shared/DummyData';
import OTPBox from './_shared/OTPBox';

interface UpdateEmailOTPEmailProps {
	member: { firstName: string; lastName: string };
	update: { email: string; token: string };
}

const styles: Record<string, React.CSSProperties> = {
	...EmailStyles,

	warning: {
		fontSize: '16px',
		color: '#000000',
		margin: '20px 0',
		lineHeight: '1.6',
	},
};

export default function UpdateEmailOTPEmail({
	member,
	update,
}: UpdateEmailOTPEmailProps) {
	return (
		<Html>
			<Head />
			<Body style={styles.main}>
				<Container style={styles.container}>
					<EmailHeader />
					<Section style={styles.content}>
						<Text style={styles.paragraph}>
							Dear {member.firstName} {member.lastName},
						</Text>
						<Text style={styles.paragraph}>
							A request to update your current account email to{' '}
							<strong>{update.email}</strong> was made. To complete this request,
							click the button below. Your request link will expire in 24 hours.
						</Text>
						<OTPBox token={update.token} />
						<Text style={styles.warning}>
							If you didn't make this change or you believe an unauthorized person
							has attempted to access your account, you can simply ignore this
							email.
						</Text>
					</Section>
					<EmailFooter social={true} />
				</Container>
			</Body>
		</Html>
	);
}

UpdateEmailOTPEmail.PreviewProps = {
	...DummyData,
	update: {
		email: 'newemail@example.com',
		token: '123456',
	},
};
