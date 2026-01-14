import ErrorComponent from '@/components/error'
import { MigrationSection } from './components'

export default async function MigrationPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    const lid = params.id

    if (!lid) {
        return <ErrorComponent error={new Error('Location ID not found')} />
    }

    return (
        <div className='max-w-6xl mx-auto py-4 space-y-4'>
            <MigrationSection lid={lid} />
        </div>
    )
}

