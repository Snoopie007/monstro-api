import type { Metadata } from "next";
import { Poppins, Roboto } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "@public/globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { ThemeProvider } from "@/providers/ThemeProvider";
import Script from "next/script";

export const metadata: Metadata = {
    title: "Monstro",
    description: "Monstro helps grow your members base and increase your revenue.",
};

const poppins = Poppins({
    subsets: ["latin"],
    weight: ["400", "700", "900"],
    variable: "--font-poppins",
});

const roboto = Roboto({
    subsets: ["latin"],
    weight: ["400", "500", "700", "900"],
    variable: "--font-roboto",
});

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    return (
        <SessionProvider session={session}>
            <html suppressHydrationWarning lang="en" className={`${poppins.variable} ${roboto.variable}`} >
                {process.env.NODE_ENV === "development" && (
                    <Script
                        src="//unpkg.com/react-scan/dist/auto.global.js"
                        crossOrigin="anonymous"
                    />
                )}
                <body className={"font-roboto"}>
                    {/* <Monitoring
                        apiKey="-OqpEnrUNsFguu-tRoISM0H5Lgsx7qIo" // Safe to expose publically
                        url="https://monitoring.react-scan.com/api/v1/ingest"
                    /> */}
                    <ThemeProvider
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        {children}
                    </ThemeProvider>
                    <ToastContainer
                        className="customToast"
                        position="top-right"
                        hideProgressBar={false}
                        closeOnClick
                        stacked={true}
                    />
                </body>
            </html>
        </SessionProvider>
    );
}