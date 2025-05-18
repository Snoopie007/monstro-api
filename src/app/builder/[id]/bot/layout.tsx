// you also need to adjust the style import
import '@xyflow/react/dist/style.css';
import '@xyflow/react/dist/base.css';
import '@public/editor.css'
import { Suspense } from 'react';
import Loading from '@/components/loading';



export default async function BotBuilderLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className='w-screen h-screen'  >
            <Suspense fallback={<Loading />}>
                {children}
            </Suspense>

        </div>
    )
}
