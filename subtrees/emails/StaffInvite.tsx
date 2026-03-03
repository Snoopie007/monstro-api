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
import { DummyData, BASE_MONSTRO_URL } from './_shared/data';
import type { Location, Staff } from '../types';

interface StaffInviteEmailProps {
    staff: Pick<Staff, 'id' | 'firstName' | 'lastName' | 'email'>;
    location: Pick<Location, 'id' | 'name' | 'address' | 'email' | 'phone'>;
    staffLocationId?: number | string;
    inviteUrl?: string;
}

const styles: Record<string, React.CSSProperties> = {
    ...EmailStyles,
    buttonSection: {
        textAlign: 'center',
        margin: '12px 0',
    },
};

export default function StaffInviteEmail({
    staff,
    location,
    staffLocationId,
    inviteUrl,
}: StaffInviteEmailProps) {
    const targetUrl = inviteUrl ?? `${BASE_MONSTRO_URL}/join/staff/${staffLocationId ?? staff.id}`;
    return (
        <Html>
            <Head />
            <Body style={styles.main}>
                <Container style={styles.container}>
                    <EmailHeader />
                    <Section style={styles.content}>
                        <Text style={styles.paragraph}>Hi {staff.firstName}</Text>
                        <Text style={styles.paragraph}>
                            You have been invited to join <strong>{location.name}</strong> as a staff member on Monstro.
                            Click the button below to set up your account and get started.
                        </Text>
                        <Section style={styles.buttonSection}>
                            <Button style={styles.button} href={targetUrl}>
                                Accept Staff Invite
                            </Button>
                        </Section>
                    </Section>
                    <EmailFooter social={true} />
                </Container>
            </Body>
        </Html>
    );
}

StaffInviteEmail.PreviewProps = {
    ...DummyData,
    inviteUrl: `${BASE_MONSTRO_URL}/join/staff/sample-token`,
};
