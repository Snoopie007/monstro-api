import * as React from 'react'
import { Section, Text } from '@react-email/components'

const styles: Record<string, React.CSSProperties> = {
    mainSection: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        minHeight: '100vh',
        fontFamily: 'sans-serif',
        backgroundColor: '#fafafa',
    },
    innerSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '304px',
        borderRadius: '1rem',
        padding: '4px 24px',
        backgroundColor: '#f3f4f6',
    },
    heading: {
        fontSize: '12px',
        fontWeight: 500,
        color: '#7c3aed',
        margin: 0,
        marginTop: '12px',
        marginBottom: '4px',
    },
    subtext: {
        color: '#6b7280',
        margin: 0,
        fontSize: '14px',
    },
    otp: {
        fontSize: '3rem',
        fontWeight: 'bold',
        paddingTop: '8px',
        margin: 0,
        color: '#222222',
    },
    note: {
        color: '#9ca3af',
        fontWeight: 300,
        fontSize: '12px',
        paddingBottom: '16px',
        margin: 0,
    },
    thanks: {
        color: '#4b5563',
        fontSize: '12px',
        margin: 0,
        marginBottom: '8px',
    },
}

export default function OTPEmail({ otp }: { otp: number }) {
    return (
        <Section style={styles.mainSection}>
            <Section style={styles.innerSection}>
                <Text style={styles.heading}>
                    Verify your Email Address
                </Text>
                <Text style={styles.subtext}>
                    Use the following code to verify your email address
                </Text>
                <Text style={styles.otp}>{otp}</Text>
                <Text style={styles.note}>
                    This code is valid for 10 minutes
                </Text>
                <Text style={styles.thanks}>
                    Thank you for joining us
                </Text>
            </Section>
        </Section>
    )
}

OTPEmail.PreviewProps = {
    otp: 123456
}