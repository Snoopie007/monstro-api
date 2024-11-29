
import { auth } from '@/auth';
import CompanyInfoForm from './components/general-info'
import { Session } from 'next-auth';


export default async function CompanyProfile(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session: Session | null = await auth();
    const location = session?.user.locations.find((e: any) => e.id == params.id);

    const companyInfo = {
        ...location,
        businessName: location.name,
        legalName: location.name,
        logo: location.logo_url || '',
        postal: location.postal_code || '',

    }
    console.log('companyInfo', companyInfo)
    return (
        <div>
            <div className="mb-4">
                <div className='text-xl font-semibold mb-1'>Business Profile</div>
                <p className='text-sm'>Manage your business profile information.</p>

            </div>
            <div>
                <CompanyInfoForm companyInfo={companyInfo} locationId={params.id} />
            </div>

        </div>
    )
}
