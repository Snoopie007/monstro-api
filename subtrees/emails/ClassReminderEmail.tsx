import * as React from 'react';
import {
	Html,
	Head,
	Body,
	Container,
	Section,
	Text,
} from '@react-email/components';
import { EmailFooter, LocationInfoBox, EmailHeader } from './_shared';
import { DummyData } from './_shared/DummyData';
import { EmailStyles } from './_shared/SharedStyle';
import { format } from 'date-fns';

interface ClassReminderEmailProps {
	member: { firstName: string; lastName: string | null; email: string };
	class: {
		name: string;
		startTime: Date;
		duration: number;
		endTime: Date;
		instructor?: { firstName: string; lastName: string | null } | null;
	};
	location: {
		name: string;
		address: string | null;
		email: string | null;
		phone: string | null
	};
}

// Combined all styles into a single object similar to other emails in the codebase.
const styles: Record<string, React.CSSProperties> = EmailStyles;

export default function ClassReminderEmail({
	member,
	class: classData,
	location,
}: ClassReminderEmailProps) {



	return (
		<Html>
			<Head />
			<Body style={styles.main}>
				<Container style={styles.container}>
					<EmailHeader />
					<Section style={styles.content}>
						<Text style={styles.paragraph}>Hi {member.firstName},</Text>

						<Text style={styles.paragraph}>
							Just a quick reminder that your class <strong>{classData.name}</strong>{' '}
							is coming up on <strong>{format(new Date(classData.startTime), 'MMM d, yyyy')}</strong> at
							<strong>{' '}{format(new Date(classData.startTime), 'h:mm a')}</strong>.
							{classData.instructor && (
								<> Your instructor is {classData.instructor.firstName} {classData.instructor.lastName}.</>
							)}
						</Text>


						<Text style={styles.paragraph}>
							Don't forget to check in and arrive early!
						</Text>

						<LocationInfoBox
							regards="See you soon,"
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

ClassReminderEmail.PreviewProps = {
	...DummyData,
	class: {
		name: 'Morning Yoga',
		description: 'Start your day with a relaxing yoga session',
		startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
		endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
		instructor: {
			firstName: 'Jane',
			lastName: 'Smith',
		},
	},
};
