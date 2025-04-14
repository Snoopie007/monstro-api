import { auth } from '@/auth';
import { Session } from 'next-auth';
import { decodeId } from '@/libs/server/sqids';
import { db } from '@/db/db';
import CompanyLogo from './components/CompanyLogo';
import CompanyTimeZone from './components/CompanyTimeZone';
import CompanyInfos from './components/CompanyInfos';
import CompanyPhone from './components/CompanyPhone';
import CompanyAddress from './components/CompanyAddress';
import CompanyIndustry from './components/CompanyIndustry';

async function getCompanyInfo(id: string) {
    const decoded = decodeId(id);
    const location = await db.query.locations.findFirst({
        where: (location, { eq }) => eq(location.id, decoded),
    });
    return location;
}

const InfoTypes = [
    {
        name: 'name',
        title: 'Company Name',
        description: 'The name of the company.',
    },
    {
        name: 'legalName',
        title: 'Legal Name',
        description: 'The legal name of the company.',
    },
    {
        name: 'slug',
        title: 'Slug',
        description: 'The slug is the short name for all urls related to the company. This is used so your customer can easily remember your important urls such as payment links.',
    },
    {
        name: 'email',
        title: 'Email',
        description: 'The email of the company.',
    },

    {
        name: 'website',
        title: 'Website',
        description: 'The website of the company.',
    }
] as const;

export type InfoType = (typeof InfoTypes)[number]['name'];

export default async function CompanyProfile(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session: Session | null = await auth();
    const location = await getCompanyInfo(params.id);
    if (!location) {
        return <div className='text-center text-sm text-muted-foreground'>Location not found</div>
    }

    return (
        <div>
            <div className="mb-4">
                <div className='text-xl font-semibold mb-1'>Business Overview</div>
                <p className='text-sm'>Manage your business information.</p>
            </div>
            <div className='space-y-4'>
                <CompanyLogo logo={location.logoUrl} locationId={location.id} />

                {InfoTypes.map((type) => (
                    <CompanyInfos
                        key={type.name}
                        lid={params.id}
                        currentValue={location[type.name]}
                        type={type.name}
                        title={type.title}
                        description={type.description}
                    />
                ))}
                <CompanyPhone location={location} />
                <CompanyAddress location={location} />
                <CompanyIndustry location={location} />
                <CompanyTimeZone location={location} />

            </div>
        </div>
    )
}
