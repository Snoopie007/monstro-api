// you also need to adjust the style import
import '@xyflow/react/dist/style.css';
import '@xyflow/react/dist/base.css';
import '@public/editor.css'
import { auth } from "@/auth"
import { Suspense } from 'react';



export default async function BotBuilderLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    return (
        <div className='w-screen h-screen'  >
            <Suspense fallback={

                <div className='uppercase h-screen w-screen flex flex-col items-center justify-center '>
                    Loading...
                </div>
            }>
                {children}
            </Suspense>

        </div>
    )
}
