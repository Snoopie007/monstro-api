import * as React from 'react';
import {
	Html,
	Head,
	Body,
	Container,
	Section,
	Text,
	Button,
	Hr,
} from '@react-email/components';

interface CancelledReservation {
	className: string;
	originalDate: string;
	originalTime: string;
}

interface HolidayCancellationEmailProps {
	member: { firstName: string; lastName?: string; email?: string };
	location: { name: string; address?: string; email?: string; phone?: string };
	holiday: {
		name: string;
		date: string;
	};
	cancelledReservations: CancelledReservation[];
	makeupUrl?: string;
	monstro?: {
		fullAddress?: string;
		privacyUrl?: string;
		unsubscribeUrl?: string;
	};
}

// Combined all styles into a single object for easier management.
const styles: Record<string, React.CSSProperties> = {
	main: {
		backgroundColor: '#ffffff',
		fontFamily: 'Helvetica, Arial, sans-serif',
	},
	container: {
		maxWidth: '600px',
		margin: '0 auto',
		padding: '20px',
	},
	content: {
		padding: '20px 0',
	},
	greeting: {
		fontSize: '16px',
		fontWeight: 'normal',
		color: '#000000',
		margin: '0 0 16px 0',
		lineHeight: '1.5',
	},
	message: {
		fontSize: '16px',
		color: '#000000',
		margin: '0 0 20px 0',
		lineHeight: '1.6',
	},
	holidayBox: {
		backgroundColor: '#FEF3C7',
		borderRadius: '8px',
		padding: '16px',
		marginBottom: '24px',
		borderLeft: '4px solid #F59E0B',
	},
	holidayLabel: {
		fontSize: '12px',
		color: '#92400E',
		margin: '0 0 4px 0',
		textTransform: 'uppercase',
		fontWeight: '600',
		letterSpacing: '0.5px',
	},
	holidayName: {
		fontSize: '18px',
		color: '#78350F',
		margin: '0 0 4px 0',
		fontWeight: '600',
	},
	holidayDate: {
		fontSize: '14px',
		color: '#92400E',
		margin: '0',
	},
	sectionTitle: {
		fontSize: '14px',
		color: '#6B7280',
		margin: '0 0 12px 0',
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: '0.5px',
	},
	classBox: {
		backgroundColor: '#F3F4F6',
		borderRadius: '8px',
		padding: '12px 16px',
		marginBottom: '8px',
	},
	className: {
		fontSize: '16px',
		color: '#111827',
		margin: '0 0 4px 0',
		fontWeight: '600',
	},
	classDetails: {
		fontSize: '14px',
		color: '#6B7280',
		margin: '0',
	},
	separator: {
		borderTop: '1px solid #E5E7EB',
		margin: '24px 0',
	},
	buttonContainer: {
		textAlign: 'center',
		margin: '32px 0',
	},
	button: {
		backgroundColor: '#000000',
		color: '#ffffff',
		padding: '12px 32px',
		borderRadius: '6px',
		textDecoration: 'none',
		display: 'inline-block',
		fontWeight: '600',
		fontSize: '16px',
	},
	signOff: {
		fontSize: '16px',
		color: '#000000',
		margin: '24px 0 8px 0',
		fontWeight: 'normal',
		lineHeight: '1.5',
	},
	location: {
		fontSize: '16px',
		color: '#1F2937',
		margin: '0 0 4px 0',
		fontWeight: 'normal',
		lineHeight: '1.4',
	},
	address: {
		fontSize: '14px',
		color: '#6B7280',
		margin: '0 0 8px 0',
		lineHeight: '1.4',
	},
	contact: {
		fontSize: '14px',
		color: '#6B7280',
		margin: '0 0 32px 0',
		lineHeight: '1.4',
	},
	footer: {
		marginTop: '40px',
		borderTop: '1px solid #E5E7EB',
		paddingTop: '20px',
	},
	footerText: {
		fontSize: '12px',
		color: '#9CA3AF',
		margin: '0 0 8px 0',
		lineHeight: '1.4',
	},
	footerLinks: {
		fontSize: '12px',
		color: '#9CA3AF',
		margin: '0',
		lineHeight: '1.4',
	},
	link: {
		color: '#9CA3AF',
		textDecoration: 'underline',
	},
};

export default function HolidayCancellationEmail({
	member,
	location,
	holiday,
	cancelledReservations,
	makeupUrl,
	monstro,
}: HolidayCancellationEmailProps) {
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	return (
		<Html>
			<Head />
			<Body style={styles.main}>
				<Container style={styles.container}>
					<Section style={styles.content}>
						<Text style={styles.greeting}>Hi {member.firstName},</Text>

						<Text style={styles.message}>
							We wanted to let you know that your upcoming class
							{cancelledReservations.length > 1 ? 'es have' : ' has'} been cancelled due to a facility closure:
						</Text>

						<Section style={styles.holidayBox}>
							<Text style={styles.holidayLabel}>Closure Reason</Text>
							<Text style={styles.holidayName}>{holiday.name}</Text>
							<Text style={styles.holidayDate}>{formatDate(holiday.date)}</Text>
						</Section>

						<Text style={styles.sectionTitle}>Affected Class{cancelledReservations.length > 1 ? 'es' : ''}:</Text>

						{cancelledReservations.map((reservation) => (
							<Section key={`${reservation.className}-${reservation.originalDate}`} style={styles.classBox}>
								<Text style={styles.className}>{reservation.className}</Text>
								<Text style={styles.classDetails}>
									{formatDate(reservation.originalDate)} at {reservation.originalTime}
								</Text>
							</Section>
						))}

						<Hr style={styles.separator} />

						<Text style={styles.message}>
							You can schedule a makeup class at your convenience. We apologize for any inconvenience this may cause.
						</Text>

						{makeupUrl && (
							<Section style={styles.buttonContainer}>
								<Button href={makeupUrl} style={styles.button}>
									Schedule Makeup Class
								</Button>
							</Section>
						)}

						<Text style={styles.signOff}>Best regards,</Text>

						<Text style={styles.location}>{location.name}</Text>
						{location.address && <Text style={styles.address}>{location.address}</Text>}
						{location.email && (
							<Text style={styles.contact}>
								Questions? Contact us at {location.email}
								{location.phone && ` or ${location.phone}`}
							</Text>
						)}

						{monstro && (
							<Section style={styles.footer}>
								{monstro.fullAddress && (
									<Text style={styles.footerText}>{monstro.fullAddress}</Text>
								)}
								<Text style={styles.footerLinks}>
									{monstro.privacyUrl && (
										<a href={monstro.privacyUrl} style={styles.link}>
											Privacy Policy
										</a>
									)}
									{monstro.privacyUrl && monstro.unsubscribeUrl && ' | '}
									{monstro.unsubscribeUrl && (
										<a href={monstro.unsubscribeUrl} style={styles.link}>
											Unsubscribe
										</a>
									)}
								</Text>
							</Section>
						)}
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

HolidayCancellationEmail.PreviewProps = {
	member: {
		firstName: 'John',
		lastName: 'Doe',
		email: 'john@example.com',
	},
	location: {
		name: 'Monstro Studio',
		address: '123 Main St, Los Angeles, CA 90001',
		email: 'hello@monstrostudio.com',
		phone: '(555) 123-4567',
	},
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
	makeupUrl: 'https://app.monstro-x.com/schedule',
	monstro: {
		fullAddress: 'PO Box 123, City, State 12345\nCopyright 2026 Monstro',
		privacyUrl: 'https://monstro-x.com/privacy',
		unsubscribeUrl: 'https://monstro-x.com/unsubscribe',
	},
} as HolidayCancellationEmailProps;
