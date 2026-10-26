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
import { EmailFooter, LocationInfoBox } from './_shared';
import { EmailStyles } from './_shared/SharedStyle';
import { DummyData } from './_shared/data';
import type { Member, Location } from '../types';

interface DocSignedEmailProps {
    member: Pick<Member, 'id' | 'firstName'>;
    docType: 'Agreement' | 'Waiver';
    location: Pick<Location, 'id' | 'name' | 'address' | 'email' | 'phone'>;
    downloadUrl?: string;
}

const styles: Record<string, React.CSSProperties> = {
    ...EmailStyles,
    buttonContainer: {
        textAlign: 'center',
        margin: '32px 0',
    },
};

export default function DocSignedEmail({
    member,
    docType,
    location,
    downloadUrl,
}: DocSignedEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={styles.main}>
                <Container style={styles.container}>
                    <Section style={styles.content}>
                        <Text style={styles.h1}>Electronic {docType} Signed</Text>

                        <Text style={styles.paragraph}>Hi {member.firstName},</Text>

                        <Text style={styles.paragraph}>
                            Your {docType.toLowerCase()} for <strong>{location.name}</strong> has been signed successfully.
                        </Text>

                        {downloadUrl ? (
                            <Section style={styles.buttonContainer}>
                                <Button href={downloadUrl} style={styles.button}>
                                    View Document
                                </Button>
                            </Section>
                        ) : null}

                        <LocationInfoBox
                            regards="Thank you,"
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

DocSignedEmail.PreviewProps = {
    ...DummyData,
    docType: 'Agreement',
    downloadUrl: 'https://example.com/docs/download',
} as DocSignedEmailProps;
