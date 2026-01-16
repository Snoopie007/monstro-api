import ErrorComponent from '@/components/error'
import { ImportStepperPage } from './components/ImportStepperPage'

export default async function ImportMembersPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    const lid = params.id

    if (!lid) {
        return <ErrorComponent error={new Error('Location ID not found')} />
    }

    return (
        <div className='max-w-4xl mx-auto py-6 space-y-6'>
            <div className='space-y-1'>
                <h1 className='text-xl font-semibold'>Import Members</h1>
                <p className='text-sm text-muted-foreground'>
                    Import your existing members from CSV files or other platforms
                </p>
            </div>
            <ImportStepperPage lid={lid} />
        </div>
    )
}
