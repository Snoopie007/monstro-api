import 'react-toastify/dist/ReactToastify.css';
// import '@public/clubs.scss'
import { ReactNode } from 'react';

export default async function JoinLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <main id="join" className="min-h-screen bg-white ">

            {children}
        </main>
    );
}
