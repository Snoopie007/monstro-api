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
import { EmailStyles } from './_shared/SharedStyle';
import { DummyData } from './_shared/DummyData';
import { format } from 'date-fns';
import { EmailFooter, LocationInfoBox, EmailBoxTitle, EmailBoxContent, EmailBox, EmailBoxLabel } from './_shared';

interface SessionCancellationEmailProps {
	member: { firstName: string; lastName?: string; email?: string };
	location: { name: string; address?: string; email?: string; phone?: string };
	session: {
		className: string;
		date: string;
		time: string;
		instructor?: { firstName: string; lastName: string } | null;
	};
	reason?: string;
	makeupUrl?: string;
}

// Combined all styles into a single object for easier management
const styles: Record<string, React.CSSProperties> = {
	...EmailStyles,


	className: {
		fontSize: '16px',
		margin: '0 0 10px 0',
		fontWeight: 600,
	},
	classDateTime: {
		fontSize: '15px',
		margin: '10px 0 0 0',
	},
	instructor: {
		fontSize: '15px',
		margin: '0',
	},

	reasonText: {
		fontSize: '15',
		margin: '0',
		lineHeight: '1.5',
	},
	buttonContainer: {
		textAlign: 'center',
		margin: '32px 0',
	},

};

export default function SessionCancellationEmail({
	member,
	location,
	session,
	reason,
	makeupUrl,
}: SessionCancellationEmailProps) {


	return (
		<Html>
			<Head />
			<Body style={styles.main}>
				<Container style={styles.container}>
					<Section style={styles.content}>
						<Text style={styles.paragraph}>Hi {member.firstName},</Text>

						<Text style={styles.paragraph}>
							We're sorry to inform you that your upcoming class has been cancelled.
						</Text>

						<EmailBox bgColor="#FEF2F2">
							<EmailBoxLabel label="Cancelled" color="#991B1B" />
							<EmailBoxTitle title={session.className} />
							<EmailBoxContent>
								<Text style={styles.classDateTime}>{format(new Date(session.date), 'MMM d, yyyy')} - {session.time}</Text>

								{session.instructor && (
									<Text style={styles.instructor}>
										Instructor: {session.instructor.firstName} {session.instructor.lastName}
									</Text>
								)}
							</EmailBoxContent>
						</EmailBox>

						{reason && (
							<EmailBox bgColor="#F3F4F6">
								<EmailBoxLabel label="Reason" color="#6B7280" />
								<EmailBoxContent>
									<Text style={styles.reasonText}>{reason}</Text>
								</EmailBoxContent>
							</EmailBox>
						)}

						<Text style={styles.paragraph}>
							We apologize for any inconvenience. You can schedule a makeup class at your convenience.
						</Text>

						{makeupUrl && (
							<Section style={styles.buttonContainer}>
								<Button href={makeupUrl} style={styles.button}>
									Schedule Makeup Class
								</Button>
							</Section>
						)}

						<LocationInfoBox
							name={location.name}
							address={location.address}
							email={location.email}
							phone={location.phone}
						/>
					</Section>
					<EmailFooter social={true} />
				</Container>
			</Body>
		</Html>
	);
}

SessionCancellationEmail.PreviewProps = {
	...DummyData,
	session: {
		className: 'Morning Yoga',
		date: '2026-01-15',
		time: '10:00 AM',
		instructor: {
			firstName: 'Jane',
			lastName: 'Smith',
		},
	},
	reason: 'Instructor unavailable due to illness',
	makeupUrl: 'https://app.monstro-x.com/schedule',
};
