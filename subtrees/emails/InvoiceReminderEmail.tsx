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
import {
	EmailFooter, EmailInvoiceAmount, EmailInvoiceBox,
	EmailInvoiceBoxMetaData, EmailInvoiceDownloadLink, EmailInvoiceItemsTable,
	EmailInvoiceLabel, EmailInvoicePayButton, EmailInvoiceBoxDivider
} from './_shared';
import { EmailStyles } from './_shared/SharedStyle';
import { DummyData } from './_shared/DummyData';
import { format, formatDistanceStrict } from 'date-fns';

type InvoiceItem = {
	name: string;
	quantity: number;
	price: number;
	productId?: string;
}

interface InvoiceReminderEmailProps {
	member: { firstName: string; lastName: string | null; email: string };
	invoice: {
		id: string;
		total: number;
		dueDate: Date;
		description: string | null;
		items: InvoiceItem[];
	};
	location: { name: string; email: string | null; phone: string | null };
	payInvoiceUrl?: string;
	downloadInvoiceUrl?: string;
}

const styles: Record<string, React.CSSProperties> = {
	...EmailStyles,
	contactLine: {
		fontSize: '13px',
		color: '#6b7280',
		margin: '16px 0 0 0',
		whiteSpace: 'nowrap',
	},
};

export default function InvoiceReminderEmail({
	member,
	invoice,
	location,
	payInvoiceUrl,
	downloadInvoiceUrl,
}: InvoiceReminderEmailProps) {


	const MetaData = [
		{ label: 'To', value: `${member.firstName} ${member.lastName}` },
		{ label: 'From', value: location.name },
		...(invoice.description
			? [{ label: 'Memo', value: invoice.description }]
			: []),
	];

	return (
		<Html>
			<Head />
			<Body style={styles.main}>
				<Container style={styles.container}>
					<Section style={styles.content}>
						<Text style={styles.paragraph}>
							Hi {member.firstName}, your invoice from {location.name} is due in {formatDistanceStrict(new Date(invoice.dueDate), new Date(), { addSuffix: true })}.
						</Text>

						<EmailInvoiceBox>
							<EmailInvoiceLabel label={`Invoice from ${location.name}`} />
							<EmailInvoiceAmount amount={invoice.total} />
							<EmailInvoiceLabel label={`Due ${format(new Date(invoice.dueDate), 'MMM d, yyyy')}`} />
							<EmailInvoiceBoxDivider />
							{downloadInvoiceUrl && (
								<EmailInvoiceDownloadLink href={downloadInvoiceUrl} />
							)}
							<EmailInvoiceBoxMetaData MetaData={MetaData} />
							{payInvoiceUrl && (
								<EmailInvoicePayButton href={payInvoiceUrl} text="Pay this invoice" />
							)}
						</EmailInvoiceBox>

						<EmailInvoiceBox>
							<EmailInvoiceLabel label={`Invoice #${invoice.id}`} style={{
								margin: '0 0 16px 0',
							}} />
							<EmailInvoiceItemsTable items={invoice.items} total={invoice.total} />
							<Text style={styles.contactLine}>
								Questions? Contact us at{' '}
								<Link href={`mailto:${location.email}`} style={styles.link}>
									{location.email}
								</Link>
								.
							</Text>
						</EmailInvoiceBox>
					</Section>
					<EmailFooter />
				</Container>
			</Body>
		</Html>
	);
}

InvoiceReminderEmail.PreviewProps = {
	...DummyData,
	payInvoiceUrl: 'https://example.com/pay',
	downloadInvoiceUrl: 'https://example.com/download',
	invoice: {
		id: 'inv_abc123',
		total: 15000,
		dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
		description: 'Thanks for your business!',
		items: [
			{
				name: 'Premium Membership',
				description: 'Unlimited access',
				quantity: 1,
				price: 15000,
			},
		],
	},
};

