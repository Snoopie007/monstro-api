import { Section, Img } from "@react-email/components"
import * as React from 'react';


export const MonstroLogoURL = "https://m.monstro-x.com/_next/image?url=%2Fimages%2Flogo-sm.png&w=256&q=75"

export function EmailHeader({ logoAlign = 'center' }: { logoAlign?: 'center' | 'left' }) {
    return (
        <Section style={{ ...styles.headerSection, textAlign: logoAlign === 'left' ? 'left' : 'center' }}>
            <Img
                src={MonstroLogoURL}
                width={120}
                height={98}
                alt="Monstro"
                style={styles.logo}
            />
        </Section>
    )
}

const styles: Record<string, React.CSSProperties> = {
    headerSection: {
        padding: '20px 0',
    },
    logo: {
        display: 'block',
        margin: '0 auto',
    },
}