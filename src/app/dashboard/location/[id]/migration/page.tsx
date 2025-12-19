import ErrorComponent from '@/components/error'
import { MigrationList, ImportMigration } from './components'

export default async function MigrationPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    const lid = params.id

    if (!lid) {
        return <ErrorComponent error={new Error('Location ID not found')} />
    }

    return (
        <div className='max-w-6xl mx-auto py-4 space-y-4'>
            <div className='flex flex-row items-center justify-between'>
                <h2 className='text-xl font-semibold'>Migrations</h2>
                <ImportMigration lid={lid} />
            </div>
            <div className='border border-foreground/10 rounded-lg'>
                <MigrationList lid={lid} />
            </div>
        </div>
    )
}

