import "@public/editor.scss";
import { auth } from "@/auth"

export default async function DashLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    return (<>{children}</>)
}
