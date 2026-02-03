import { Section, Text } from "@react-email/components"
import * as React from 'react';
export function OTPBox({ token }: { token: string }) {
    return (
        <Section style={styles.otpBox}>
            <Text style={styles.otpCode}>{token}</Text>
        </Section>
    )
}

const styles: Record<string, React.CSSProperties> = {
    otpBox: {
        backgroundColor: '#FAFAFA',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        margin: '24px 0',
        textAlign: 'center',
    },
    otpCode: {
        fontSize: '36px',
        fontWeight: 'bold',
        color: '#000000',
        margin: '0',
        letterSpacing: '8px',
        fontFamily: 'monospace',
    },

}