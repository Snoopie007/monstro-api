import { db } from '@/db/db'
import { PromosList, CreatePromo } from './components'

async function fetchPromos(lid: string) {
  try {
    const promos = await db.query.promos.findMany({
      where: (p, { eq }) => eq(p.locationId, lid),
      orderBy: (p, { desc }) => [desc(p.created)],
    })
    return promos
  } catch (error) {
    console.error('Error fetching promos:', error)
    return []
  }
}

export default async function PromosPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const lid = params.id
  const promos = await fetchPromos(lid)

  return (
    <div className='max-w-6xl mx-auto py-4 space-y-4'>
      <div className='flex flex-row items-center justify-between'>
        <h2 className='text-xl font-semibold'>Promo Codes</h2>
        <CreatePromo lid={lid} />
      </div>
      <div className='border border-foreground/10 rounded-lg'>
        <PromosList promos={promos} lid={lid} />
      </div>
    </div>
  )
}