import { auth } from '@/auth';
import { db } from '@/db/db';
import { integrations } from '@/db/schemas';
import { decodeId } from '@/libs/server/sqids';
import { VendorStripePayments } from '@/libs/server/stripe';
import { ExtendedUser } from '@/types/next-auth';

interface IntegrationSearchParams {
	code: string,
	scope: string,
	state: string
}

async function completeIntegration(name: string, user: ExtendedUser, searchParams: IntegrationSearchParams): Promise<boolean> {
	try {
		const decodedId = decodeId(searchParams.state);
		const stripe = new VendorStripePayments();

		const location = await db.query.locations.findFirst({
			where: (loc, { eq }) => eq(loc.id, decodedId)
		});

		if (!location?.id) return false;

		const token = await stripe.connectOAuth(searchParams.code, searchParams.scope);
		if (!token?.stripe_user_id) return false;

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

export default async function CompleteIntegeration(props: { params: Promise<{ name: string }>, searchParams: Promise<IntegrationSearchParams> }) {
	const searchParams = await props.searchParams;
	const params = await props.params;
	const session = await auth();

	if (!session) return null;

	const connection = await completeIntegration(params.name, session.user, searchParams);

	return (
		<div className="h-[100svh] bg-white dark:bg-white text-black dark:text-black w-full">
			<div className="max-w-lg w-full h-full m-auto py-10 flex flex-row items-center">
				<div className="text-center border px-6 py-10 rounded-sm border-gray-200 shadow-xs m-auto">
					{connection ? (
						<div className='text-center'>
							<svg className="mb-4 w-16 h-16" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
								<circle className="fill-green-500" cx="50" cy="50" r="40" />
								<path
									className="stroke-white fill-none"
									strokeWidth="10"
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M35 50 L45 60 L65 40"
									strokeDasharray="100"
									strokeDashoffset="100"
									style={{
										animation: "dash 0.8s ease-in-out forwards"
									}}
								/>
								<style>{`
									@keyframes dash {
										to {
											stroke-dashoffset: 0;
										}
									}
								`}</style>
							</svg>
							<h1 className='text-2xl mb-4 font-poppins capitalize font-bold'>Your <span className='capitalize'>{params.name}</span> account has been successfully connected.</h1>
							<p className='text-black/80'>You'll be redirect back to Monstro.</p>
						</div>
					) : (
						<div className='text-center'>
							<svg className="mb-4 w-16 h-16" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
								<circle className="fill-red-500" cx="50" cy="50" r="40" />
								<path
									className="stroke-white fill-none"
									strokeWidth="10"
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M35 35 L65 65 M65 35 L35 65"
									strokeDasharray="100"
									strokeDashoffset="100"
									style={{
										animation: "dashX 0.8s ease-in-out forwards"
									}}
								/>
								<style>{`		
									@keyframes dashX {
										to {
											stroke-dashoffset: 0;
										}
									}
								`}</style>
							</svg>
							<h1 className='text-2xl mb-4 font-poppins capitalize font-bold'>Oops! Sorry something went wrong</h1>
							<p><span className='capitalize'>{params.name}</span> account could not be connected at this moment.</p>
						</div>
					)}
				</div>
			</div>
			<meta httpEquiv="refresh" content={`3;url=/dashboard/${searchParams.state}/settings/integrations`} />
		</div>
	)
}
