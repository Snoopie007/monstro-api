import * as React from 'react';
import {
	Html,
	Head,
	Body,
	Container,
	Section,
	Text,
	Button,
	Img,
} from '@react-email/components';
import type { MonstroDataType } from '@/constants/data';
import EmailHeader from './_shared/EmailHeader';
import EmailFooter from './_shared/EmailFooter';
import { EmailStyles } from './_shared/SharedStyle';
import { DummyData } from './_shared/DummyData';
interface FamilyInviteEmailProps {
	member: { firstName: string };
	location: { name: string };
	monstro: MonstroDataType;
}

const styles: Record<string, React.CSSProperties> = {
	...EmailStyles,



	buttonSection: {
		textAlign: 'left',
		margin: '24px 0',
	},


};


export default function FamilyInviteEmail({
	member,
	location,
	monstro,
}: FamilyInviteEmailProps) {
	return (
		<Html>
			<Head />
			<Body style={styles.main}>
				<Container style={styles.container}>
					<EmailHeader />
					<Section style={styles.content}>
						<Text style={styles.paragraph}>Hi {member.firstName}</Text>
						<Text style={styles.paragraph}>
							{member.firstName} has invited to be part of their family on Monstro X allowing you to attend their awesome classes and activities.
							Let's get you all set up and ready to go. Click the Accept Invite button below to get started.

						</Text>
						<Section style={styles.buttonSection}>
							<Button
								style={styles.button}
								href="https://monstro-x.com/accept-invite"
							>
								Accept Invite
							</Button>
						</Section>


					</Section>

					<EmailFooter
						social={true}
					/>
				</Container>
			</Body>
		</Html>
	);
}

FamilyInviteEmail.PreviewProps = DummyData;
