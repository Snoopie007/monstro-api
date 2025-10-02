import Image from 'next/image';


interface LoginLayoutProps {
    children: React.ReactNode
}

export default function LoginLayout({ children, }: LoginLayoutProps) {

    return (
        <main className="flex flex-col  h-screen text-black bg-white  items-center  ">
            <header className="w-full p-4 flex-initial">
                <Image src="/images/logo.png" alt="Monstro" width={120} height={120} />
            </header>
            <div className="w-full max-w-md py-16 flex-1">

                {children}
            </div>
            <footer className="w-full  flex-initial py-4">
                <p className=" text-gray-500 text-center">
                    &copy; {new Date().getFullYear()} Monstro. All rights reserved.
                </p>
            </footer>
        </main >
    )


}
