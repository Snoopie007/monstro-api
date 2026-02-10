import * as React from 'react';
import {
	Html,
	Head,
	Body,
	Container,
	Section,
	Text,
	Button,
} from '@react-email/components';
import { EmailHeader, EmailFooter } from './_shared';
import { EmailStyles } from './_shared/SharedStyle';
import { DummyData } from './_shared/data';
import type { Member } from '@subtrees/types';
interface ResetPasswordEmailProps {
	member: Pick<Member, 'firstName' | 'lastName' | 'email'>;
	url: string;
}

const styles: Record<string, React.CSSProperties> = {
	...EmailStyles,
	buttonSection: {
		textAlign: 'left',
		margin: '24px 0',
	},
	warning: {
		fontSize: '16px',
		color: '#000000',
		margin: '20px 0',
		lineHeight: '1.6',
	},
};

export default function ResetPasswordEmail({
	member,
	url,
}: ResetPasswordEmailProps) {
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
							A request to reset your password was made for your Monstro Account,{' '}
							<strong>{member.email}</strong>. To continue with this request, click
							the button below to reset your password. Your reset link will expire
							in 30 minutes:
						</Text>
						<Section style={styles.buttonSection}>
							<Button
								style={styles.button}
								href={url}
							>
								Reset Password
							</Button>
						</Section>
						<Text style={styles.warning}>
							If you didn't make this change or you believe an unauthorized person
							has attempted to access your account, you can simply ignore this
							email.
						</Text>
					</Section>
					<EmailFooter />
				</Container>
			</Body>
		</Html>
	);
}

ResetPasswordEmail.PreviewProps = {
	...DummyData,
	url: 'https://example.com/reset-password'
};
