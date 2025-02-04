import type { Metadata } from "next";
import { Poppins, Roboto } from "next/font/google";
import "@public/globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { ToastContainer } from "react-toastify";
import { ThemeProvider } from "@/providers/theme-provider";


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

                <body className={"font-roboto"}>
                    <ThemeProvider

                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        {children}
                    </ThemeProvider>
                    <ToastContainer
                        position="top-right"
                        hideProgressBar={false}
                        closeOnClick
                    />
                </body>


            </html>
        </SessionProvider>
    );
}