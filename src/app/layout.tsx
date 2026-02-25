import type { Metadata } from "next";
import { Poppins, Roboto } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "@public/globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import Script from "next/script";
import ClientObservability from "@/components/observability/ClientObservability";

export const metadata: Metadata = {
	title: "Monstro",
	description:
		"Monstro helps grow your members base and increase your revenue.",
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
	return (
			<html
				suppressHydrationWarning
				lang="en"
				className={`${poppins.variable} ${roboto.variable}`}
			>
				{process.env.NODE_ENV === "development" && (
					<Script
						src="//unpkg.com/react-scan/dist/auto.global.js"
						crossOrigin="anonymous"
					/>
				)}
				<body className={"font-roboto"}>
					<ClientObservability />
					{/* <Monitoring
                        apiKey="-OqpEnrUNsFguu-tRoISM0H5Lgsx7qIo" // Safe to expose publically
                        url="https://monitoring.react-scan.com/api/v1/ingest"
                    /> */}
					<QueryProvider>
						<ThemeProvider
							defaultTheme="system"
							enableSystem
							disableTransitionOnChange
						>
							{children}
						</ThemeProvider>
					</QueryProvider>
					<ToastContainer
						className="customToast"
						position="top-right"
						hideProgressBar={false}
						closeOnClick
						stacked={true}
					/>
				</body>
			</html>
	);
}
