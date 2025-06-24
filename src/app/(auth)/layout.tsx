
import 'react-toastify/dist/ReactToastify.css';
import Image from 'next/image';


export default function ClubRegistration({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <main className="flex flex-col  h-screen text-black  items-center bg-gray-50  ">
            <header className="w-full max-w-4xl py-2 flex-initial">
                <Image src="/images/logo.png" alt="Monstro" width={100} height={100} />
            </header>
            <div className="w-full max-w-4xl py-16 flex-grow flex-1">

                {children}
            </div>

            <footer className="w-full max-w-4xl flex-initial py-4">
                <p className="text-sm text-gray-500 text-center">
                    &copy; {new Date().getFullYear()} Monstro. All rights reserved.
                </p>
            </footer>
        </main >
    )


}
