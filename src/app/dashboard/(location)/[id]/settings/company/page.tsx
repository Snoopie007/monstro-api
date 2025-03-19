
import { auth } from '@/auth';
import CompanyInfoForm from './components/CompanyInfo'
import { Session } from 'next-auth';
import { decodeId } from '@/libs/server/sqids';
import { db } from '@/db/db';
import CompanyLogo from './components/CompanyLogo';
import CompanyName from './components/CompanyName';


async function getCompanyInfo(id: string) {
    const decoded = decodeId(id);
    const location = await db.query.locations.findFirst({
        where: (location, { eq }) => eq(location.id, decoded)
    });
    return location;
}

export default async function CompanyProfile(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session: Session | null = await auth();
    const location = await getCompanyInfo(params.id);
    if (!location) {
        return <div>Location not found</div>
    }


    return (
        <div>
            <div className="mb-4">
                <div className='text-xl font-semibold mb-1'>Business Overview</div>
                <p className='text-sm'>Manage your business information.</p>

            </div>
            <div className='space-y-4'>
                <CompanyLogo logo={location.logoUrl} locationId={location.id} />
                <CompanyName location={location} />
                <CompanyInfoForm location={location} />
            </div>

        </div>
    )
}
