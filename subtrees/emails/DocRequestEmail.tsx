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

interface DocRequestEmailProps {
    member: Pick<Member, 'id' | 'firstName'>;
    docId: string;
    docType: 'Agreement' | 'Waiver';
    requireSignature: boolean;
    location: Pick<Location, 'id' | 'name' | 'address' | 'email' | 'phone'>;
}

const styles: Record<string, React.CSSProperties> = {
    ...EmailStyles,
    buttonContainer: {
        textAlign: 'center',
        margin: '32px 0',
    },
};

export default function DocRequestEmail({
    member,
    docId,
    docType,
    requireSignature,
    location,
}: DocRequestEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={styles.main}>
                <Container style={styles.container}>
                    <Section style={styles.content}>
                        <Text style={styles.h1}>Electronic {docType} Signature Request</Text>

                        <Text style={styles.paragraph}>Hi {member.firstName},</Text>

                        <Text style={styles.paragraph}>
                            Please review and {requireSignature ? 'sign' : 'confirm'} your {docType} for <strong>{location.name}</strong>.
                        </Text>

                        <Section style={styles.buttonContainer}>
                            <Button href={`https://m.monstro-x.com/public/doc/${docId}`} style={styles.button}>
                                {requireSignature ? 'Review & Sign' : 'Review & Confirm'}
                            </Button>
                        </Section>

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

DocRequestEmail.PreviewProps = {
    ...DummyData,
    docId: '123',
    docType: 'Agreement',
    requireSignature: true,
} as DocRequestEmailProps;
