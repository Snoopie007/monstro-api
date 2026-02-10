import * as React from 'react';
import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
} from '@react-email/components';
import { EmailHeader, EmailFooter } from './_shared';
import { EmailStyles } from './_shared/SharedStyle';
import { DummyData, } from './_shared/data';
import type { Member } from '@subtrees/types';



interface ChildFamilyEmailProps {
    member: Pick<Member, 'firstName'>;
    childName: string;
    password: string;
    email: string | null;
}

const styles: Record<string, React.CSSProperties> = {
    ...EmailStyles,
    buttonSection: {
        textAlign: 'center',
        margin: '12px 0',
    },
};

export default function ChildFamilyEmail({
    member,
    email,
    password,
    childName,
}: ChildFamilyEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={styles.main}>
                <Container style={styles.container}>
                    <EmailHeader />
                    <Section style={styles.content}>
                        <Text style={styles.paragraph}>Hi {member.firstName}</Text>
                        <Text style={styles.paragraph}>
                            We have created a child account for {childName} on Monstro X. Your login details are as follows:
                        </Text>
                        <Text style={styles.paragraph}>
                            <strong>Email:</strong> {email}
                            <br />
                            <strong>Temporary Password:</strong> {password}
                        </Text>
                        <Text style={styles.paragraph}>
                            You can use this account to login and book your child's next class.
                        </Text>
                    </Section>
                    <EmailFooter
                        social={true}
                    />
                </Container>
            </Body>
        </Html>
    );
}

ChildFamilyEmail.PreviewProps = {
    ...DummyData,
    childName: 'John Doe',
    email: 'john@example.com',
    password: '4223oi4243hoi',
};
