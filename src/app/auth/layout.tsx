import { ReactNode } from "react";

export default async function AuthLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <main className="min-h-screen bg-white ">

            {children}
        </main>
    );
}
