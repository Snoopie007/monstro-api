import { JoinProvider } from "../providers/JoinProvider"
import Image from "next/image";

interface JoinLayoutProps {
    children: React.ReactNode
}

export default function JoinLayout({ children, }: JoinLayoutProps) {

    return (
        <main className="flex flex-col  h-screen text-black  items-center bg-white  ">
            <header className="w-full p-4 flex-initial">
                <Image src="/images/logo.png" alt="Monstro" width={120} height={120} />
            </header>
            <JoinProvider>
                {children}
                <footer className="w-full flex-initial py-4">
                    <p className=" text-gray-500 text-center">
                        &copy; {new Date().getFullYear()} Monstro. All rights reserved.
                    </p>
                </footer>
            </JoinProvider>
        </main >
    )


}
