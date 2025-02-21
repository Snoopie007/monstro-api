
import { auth } from '@/auth';
import CompanyInfoForm from './components/CompanyInfo'
import { Session } from 'next-auth';
import { decodeId } from '@/libs/server/sqids';
import { db } from '@/db/db';


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
                <div className='text-xl font-semibold mb-1'>Business Profile</div>
                <p className='text-sm'>Manage your business profile information.</p>

            </div>
            <div>
                <CompanyInfoForm location={location} />
            </div>

        </div>
    )
}
