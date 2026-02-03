import { Section, Text } from '@react-email/components';
import React from 'react';

const sharedSecondaryStyle: React.CSSProperties = {
    fontSize: '16px',
    margin: '0',
    fontWeight: 400,
    color: '#6B7280', // Lighter (Tailwind gray-500)
};

const styles: Record<string, React.CSSProperties> = {
    regards: {
        fontSize: '16px',
        margin: '0 0 16px 0',
    },
    locationName: {
        fontSize: '16px',
        margin: '0 0 4px 0',
        fontWeight: 600,
    },
    locationAddress: sharedSecondaryStyle,
    locationEmail: sharedSecondaryStyle,
    locationPhone: sharedSecondaryStyle,
};


interface LocationInfoBoxProps {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
}


export default function LocationInfoBox({ name, address, email, phone }: LocationInfoBoxProps) {
    return (
        <Section >

            <Text style={styles.regards}>Best regards,</Text>

            <Text style={styles.locationName}>{name}</Text>
            {address && <Text style={styles.locationAddress}>{address}</Text>}
            {email && (
                <Text style={styles.locationEmail}>
                    {email}

                </Text>
            )}
            {phone && (
                <Text style={styles.locationPhone}>
                    Phone: {phone}
                </Text>
            )}
        </Section>
    )
}