import { Section, Img } from "@react-email/components"
import * as React from 'react';


export const MonstroLogoURL = "https://app.monstro-x.com/_next/image?url=%2Fimages%2Flogo.png&w=128&q=75"

export function EmailHeader() {
    return (
        <Section style={styles.headerSection}>
            <Img
                src={MonstroLogoURL}
                width={100}
                height={20}
                alt="Monstro"
                style={styles.logo}
            />
        </Section>
    )
}

const styles: Record<string, React.CSSProperties> = {
    headerSection: {
        textAlign: 'center',
        padding: '20px 0',
    },
    logo: {
        display: 'block',
        margin: '0 auto',
    },
}