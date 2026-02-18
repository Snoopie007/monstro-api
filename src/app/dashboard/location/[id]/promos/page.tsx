import { db } from '@/db/db'
import { memberPlans, memberPlanPricing } from '@subtrees/schemas'
import { PromosList, CreatePromo } from './components'
import { eq, and } from 'drizzle-orm'

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

async function fetchPlans(lid: string) {
  try {
    const plans = await db.query.memberPlans.findMany({
      where: (p, { eq, and }) => and(
        eq(p.locationId, lid),
        eq(p.archived, false)
      ),
      with: {
        pricings: true,
      },
    })
    return plans.map((plan) => ({ ...plan, pricingOptions: plan.pricings }))
  } catch (error) {
    console.error('Error fetching plans:', error)
    return []
  }
}

export default async function PromosPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const lid = params.id
  const [promos, plans] = await Promise.all([fetchPromos(lid), fetchPlans(lid)])

  return (
    <div className='max-w-6xl mx-auto py-4 space-y-4'>
      <div className='flex flex-row items-center justify-between'>
        <h2 className='text-xl font-semibold'>Promo Codes</h2>
        <CreatePromo lid={lid} plans={plans} />
      </div>
      <div className='border border-foreground/10 rounded-lg'>
        <PromosList promos={promos} lid={lid} />
      </div>
    </div>
  )
}
