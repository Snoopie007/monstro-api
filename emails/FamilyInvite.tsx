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
import { DummyData } from './_shared/DummyData';
interface FamilyInviteEmailProps {
	member: { firstName: string };
	familyId: string;
}

const styles: Record<string, React.CSSProperties> = {
	...EmailStyles,
	buttonSection: {
		textAlign: 'center',
		margin: '12px 0',
	},
};


export default function FamilyInviteEmail({
	member,
	familyId,
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
								href={`https://m.monstro-x.com/register?familyId=${familyId}`}
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
