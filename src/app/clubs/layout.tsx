import 'react-toastify/dist/ReactToastify.css';

import { ToastContainer } from 'react-toastify';

export default function ClubRegistration({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <main id="clubs" className="min-h-screen  bg-gray-50  ">
            <ToastContainer />
            {children}

        </main>
    )
}
