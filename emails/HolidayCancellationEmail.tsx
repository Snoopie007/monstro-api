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
import { format } from 'date-fns';
import { EmailFooter, LocationInfoBox, EmailBoxTitle, EmailBoxContent, EmailBox, EmailBoxLabel } from './_shared';
import { DummyData, } from './_shared/data';
import type { Member, Location } from '@subtrees/types';
interface CancelledReservation {
	className: string;
	originalDate: string;
	originalTime: string;
}

interface HolidayCancellationEmailProps {
	member: Pick<Member, 'firstName'>;
	location: Pick<Location, 'name' | 'address' | 'email' | 'phone'>;
	holiday: {
		name: string;
		date: string;
	};
	cancelledReservations: CancelledReservation[];
	makeupUrl?: string;
}

// Combined all styles into a single object for easier management.
const styles: Record<string, React.CSSProperties> = {
	...EmailStyles,
	buttonSection: {
		textAlign: 'center',
		margin: '20px 0',
	},





};

export default function HolidayCancellationEmail({
	member,
	location,
	holiday,
	cancelledReservations,
	makeupUrl,
}: HolidayCancellationEmailProps) {


	return (
		<Html>
			<Head />
			<Body style={styles.main}>
				<Container style={styles.container}>
					<Section style={styles.content}>
						<Text style={styles.paragraph}>Hi {member.firstName},</Text>

						<Text style={styles.paragraph}>
							We wanted to let you know that your upcoming class
							{cancelledReservations.length > 1 ? 'es have' : ' has'} been cancelled due to a facility closure:
						</Text>

						<EmailBox bgColor="#FEF3C7">
							<EmailBoxLabel label="Closure Reason" color="#92400E" />
							<EmailBoxTitle title={holiday.name} />
							<EmailBoxContent>
								<Text style={styles.paragraph}>{format(new Date(holiday.date), 'MMM d, yyyy')}</Text>
							</EmailBoxContent>
						</EmailBox>

						<Text style={styles.sectionTitle}>Affected Class{cancelledReservations.length > 1 ? 'es' : ''}:</Text>

						{cancelledReservations.map((reservation) => (
							<EmailBox key={`${reservation.className}-${reservation.originalDate}`} bgColor="#F3F4F6">
								<EmailBoxTitle title={reservation.className} />
								<EmailBoxContent>
									{format(new Date(reservation.originalDate), 'MMM d, yyyy')} at {reservation.originalTime}
								</EmailBoxContent>
							</EmailBox>
						))}


						<Text style={styles.paragraph}>
							You can schedule a makeup class at your convenience. We apologize for any inconvenience this may cause.
						</Text>

						{makeupUrl && (
							<Section style={styles.buttonSection}>
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

HolidayCancellationEmail.PreviewProps = {
	...DummyData,
	holiday: {
		name: 'Christmas Day',
		date: '2026-12-25',
	},
	cancelledReservations: [
		{
			className: 'Morning Yoga',
			originalDate: '2026-12-25',
			originalTime: '10:00 AM',
		},
		{
			className: 'HIIT Training',
			originalDate: '2026-12-25',
			originalTime: '2:00 PM',
		},
	],
	makeupUrl: 'https://app.monstro-x.com/schedule'
} as HolidayCancellationEmailProps;
