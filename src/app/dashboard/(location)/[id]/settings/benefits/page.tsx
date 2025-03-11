
import { auth } from '@/auth'
import { db } from '@/db/db'
import { Vendor } from '@/types'
import { Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'
import { cn } from '@/libs/utils'
import { VendorBadges, VendorRewards } from './components'
import { VendorReferrals } from './components/referrals'
import { VendorProgressOverview } from './components/overview'
import ReferralBanner from './components/ReferralBanner'

async function fetchVendor(id: number, lid: string): Promise<Vendor> {

    try {
        const vendor = await db.query.vendors.findFirst({
            where: (vendors, { eq }) => eq(vendors.userId, id),
            with: {
                vendorProgress: {
                    with: {
                        claimedRewards: true,
                        badges: true
                    }
                },
                referrals: {
                    with: {
                        referred: {
                            columns: {
                                firstName: true,
                                lastName: true,
                            }
                        }
                    }
                }
            }
        })

        if (!vendor) {
            throw new Error("Vendor not found");
        }

        return vendor;
    } catch (error) {
        console.log("error", error);
        throw new Error("Failed to fetch vendor");
    }
}

async function BenefitsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth();

    if (!session || session.user.role !== "vendor") {
        return <div>Unauthorized</div>
    }
    const vendor = await fetchVendor(session.user.id, params.id);


    return (

        <div className='flex flex-col gap-4'>
            <div className='space-y-0'>
                <h2 className='text-lg font-bold'>Monstro Achievements & Rewards</h2>
                <p className='text-sm text-muted-foreground'>Keep track of your achievements and rewards just by using Monstro.</p>
            </div>
            <Card className='rounded-sm border-foreground/20'>
                <CardContent className='p-4'>
                    <VendorProgressOverview vendor={vendor} />
                </CardContent>
            </Card>
            <ReferralBanner />
            <Tabs defaultValue="My Progress" className="w-full" >
                <TabsList className={cn(`bg-transparent flex flex-row gap-2 justify-start items-center`)}>
                    {["My Progress", "My Rewards", "My Referrals"].map((item, index) => (
                        <TabsTrigger key={index} value={item} className='border border-foreground/10  rounded-full text-xs py-1 data-[state=active]:bg-indigo-600'>{item}</TabsTrigger>
                    ))}
                </TabsList>
                <TabsContent value="My Progress">
                    <VendorBadges progress={vendor.vendorProgress!} />
                </TabsContent>
                <TabsContent value="My Rewards">
                    <VendorRewards claimedRewards={vendor.vendorProgress!.claimedRewards} />
                </TabsContent>

                <TabsContent value="My Referrals">
                    <VendorReferrals vendor={vendor} />
                </TabsContent>

            </Tabs>
        </div >
    )
}

export default BenefitsPage