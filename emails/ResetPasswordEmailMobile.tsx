import * as React from 'react';
import {
	Html,
	Head,
	Body,
	Container,
	Section,
	Text,
} from '@react-email/components';
import { EmailHeader, EmailFooter, OTPBox } from './_shared';
import { EmailStyles } from './_shared/SharedStyle';
import { DummyData } from './_shared/data';
import type { Member } from '../types';

interface ResetPasswordEmailMobileProps {
	member: Pick<Member, 'firstName' | 'lastName' | 'email'>;
	code: string;
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

export default function ResetPasswordEmailMobile({
	member,
	code,
}: ResetPasswordEmailMobileProps) {
	return (
		<Html>
			<Head />
			<Body style={styles.main}>
				<Container style={styles.container}>
					<EmailHeader logoAlign="left" />
					<Section style={styles.content}>
						<Text style={styles.paragraph}>
							Dear {member.firstName} {member.lastName},
						</Text>
						<Text style={styles.paragraph}>
							A request to reset your password was made for your Monstro account,{' '}
							<strong>{member.email}</strong>. Enter the code below in the Monstro
							app to reset your password. This code expires in 30 minutes.
						</Text>
						<OTPBox token={code} />
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

ResetPasswordEmailMobile.PreviewProps = {
	...DummyData,
	code: '482913',
};
