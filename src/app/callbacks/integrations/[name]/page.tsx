import { auth } from '@/auth';
import { db } from '@/db/db';
import { integrations } from '@/db/schemas';
import { decodeId } from '@/libs/server/sqids';
import { VendorStripePayments } from '@/libs/server/stripe';
import { ExtendedUser } from '@/types/next-auth';
import { BadgeCheck, CircleSlash } from 'lucide-react';


interface IntegrationSearchParams {
	code: string,
	scope: string,
	state: string
}

async function completeIntegration(name: string, user: ExtendedUser, searchParams: IntegrationSearchParams): Promise<boolean> {

	const decodedId = decodeId(searchParams.state);
	const stripe = new VendorStripePayments();
	try {
		const location = await db.query.locations.findFirst({
			where: (loc, { eq }) => eq(loc.id, decodedId)
		});
		if (!location) {
			return false;
		}
		const token = await stripe.connectOAuth(searchParams.code, searchParams.scope);

		await db.insert(integrations).values({
			locationId: location.id,
			service: name,
			apiKey: token.stripe_publishable_key,
			secretKey: token.access_token,
			accessToken: token.access_token,
			refreshToken: token.refresh_token,
			integrationId: token.stripe_user_id,
			vendorId: location.vendorId,
			additionalSettings: { ...token },
			created: new Date(),
		}).onConflictDoUpdate({
			target: [integrations.locationId, integrations.service],
			set: {
				secretKey: token.access_token,
				accessToken: token.access_token,
				refreshToken: token.refresh_token,
				integrationId: token.stripe_user_id,
			}
		});

		return true;
	} catch (error) {
		console.log(error);
		return false;
	}


}


export default async function CompleteIntegeration(props: { params: Promise<{ name: string }>, searchParams: Promise<any> }) {
	const searchParams = await props.searchParams;
	const params = await props.params;
	const session = await auth();

	if (!session) {
		// return redirect to login?
		return null;
	}

	const connection = await completeIntegration(params.name, session.user, searchParams);
	return (
		<div className=" h-[100svh] bg-white dark:bg-white text-black dark:text-black w-full ">

			<div className="max-w-lg w-full h-full m-auto py-10 flex flex-row items-center">
				<div className=" text-center border px-6 py-10 rounded-sm   border-gray-200 shadow-xs   m-auto ">
					{connection ? (
						<div className='text-center'>
							<BadgeCheck size={60} className='stroke-green-600 m-auto mb-4' />
							<h1 className='text-2xl mb-4 font-poppins capitalize font-bold'>Your <span className='capitalize'>{params.name}</span> account has been successfully connected.</h1>
							<p className='text-black/80'>You'll be redirect back to Monstro.</p>
						</div>
					) : (
						<div className='text-center'>
							<CircleSlash size={60} className='stroke-red-600 m-auto mb-4' />
							<h1 className='text-2xl mb-4 font-poppins capitalize font-bold'>Oops! Sorry something went wrong your</h1>
							<p> <span className='capitalize'>{params.name}</span>   account could not be cconnected at this moment.</p>
						</div>
					)}
				</div>
			</div>
			{/* Meta tag for redirection */}
			<meta httpEquiv="refresh" content={`10;url=/dashboard/${searchParams.state}/settings/integrations`} />
		</div>
	)
}
