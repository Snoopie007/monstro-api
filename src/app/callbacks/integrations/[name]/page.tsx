import { auth } from '@/auth';
import { db } from '@/db/db';
import { integrations } from '@/db/schemas';
import { decodeId } from '@/libs/server/sqids';
import { VendorStripePayments } from '@/libs/server/stripe';
import Stripe from 'stripe';
import { Integration } from '@/types/integrations';
import { getQuickbooksSettings, exchangeCodeForToken } from '@/libs/quickbooks';
import { VendorGHL } from '@/libs/server/ghl';

interface IntegrationSearchParams {
	code: string;
	scope?: string;
	state: string;
	error?: string;
	realmId?: string;
}

function getStripeSettings(token: Stripe.OAuthToken) {
	const { scope, ...rest } = token;
	return {
		apiKey: rest.stripe_publishable_key || null,
		secretKey: rest.access_token || null,
		accessToken: rest.access_token || null,
		refreshToken: rest.refresh_token || null,
		integrationId: rest.stripe_user_id || '',
		settings: {
			scope: scope
		}
	};
}

async function completeIntegration(name: string, searchParams: IntegrationSearchParams): Promise<boolean> {
	try {

		const decodedId = decodeId(searchParams.state);
		const location = await db.query.locations.findFirst({
			where: (loc, { eq }) => eq(loc.id, decodedId)
		});

		if (!location?.id) return false;

		let newIntegration: Omit<Integration, 'locationId' | 'service'> | null = null;

		if (name === 'stripe') {
			if (!searchParams.scope) return false;
			console.log(searchParams);
			const stripe = new VendorStripePayments();
			const token = await stripe.connectOAuth(searchParams.code, searchParams.scope);
			if (!token?.stripe_user_id) return false;
			newIntegration = getStripeSettings(token);

		} else if (name === 'quickbooks') {
			if (searchParams.error || !searchParams.code) return false;
			const tokenData = await exchangeCodeForToken(searchParams.code, process.env.QUICKBOOKS_REDIRECT_URI!, searchParams.realmId);
			if (!tokenData.access_token) return false;
			newIntegration = getQuickbooksSettings({ ...tokenData, realmId: searchParams.realmId });
		} else if (name === 'gl') {
			if (searchParams.error || !searchParams.code) return false;

			const ghl = new VendorGHL();
			const tokenData = await ghl.getLocationToken(searchParams.code);

			if (!tokenData?.access_token) return false;

			newIntegration = {
				apiKey: null,
				secretKey: null,
				accessToken: tokenData.access_token,
				refreshToken: tokenData.refresh_token,
				integrationId: tokenData.locationId || '',
				expires: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
				settings: {
					scope: tokenData.scope || ''
				}
			};
		}

		if (!newIntegration) return false;

		await db.insert(integrations).values({
			...newIntegration,
			locationId: location.id,
			service: name,
		}).onConflictDoUpdate({
			target: [integrations.locationId, integrations.service],
			set: {
				...newIntegration,
			}
		});

		return true;
	} catch (error) {
		console.error('Integration error:', error);
		return false;
	}
}
export default async function CompleteIntegrationPage(props: {
	params: Promise<{ name: string }>,
	searchParams: Promise<IntegrationSearchParams>
}) {
	const searchParams = await props.searchParams;
	const params = await props.params;
	const session = await auth();

	if (searchParams.error) {
		return (
			<IntegrationResult
				success={false}
				integrationName={params.name}
				state={searchParams.state}
			/>
		);
	}

	const connection = await completeIntegration(params.name, searchParams);

	return (
		<IntegrationResult
			success={connection}
			integrationName={params.name}
			state={searchParams.state}
		/>
	);
}

function IntegrationResult({
	success,
	integrationName,
	state
}: {
	success: boolean;
	integrationName: string;
	state: string
}) {
	return (
		<div className="h-[100svh] bg-white dark:bg-white text-black dark:text-black w-full">
			<div className="max-w-lg w-full h-full m-auto py-10 flex flex-col items-center justify-center">
				<div className="text-center border px-6 py-10 rounded-sm border-gray-200 shadow-xs m-auto">
					{success ? (
						<div className='text-center flex flex-col items-center justify-center'>
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
							<h1 className='text-2xl mb-4 font-poppins capitalize font-bold'>Your <span className='capitalize'>{integrationName}</span> account has been successfully connected.</h1>
							<p className='text-black/80'>You'll be redirected back to Monstro.</p>
						</div>
					) : (
						<div className='text-center flex flex-col items-center justify-center'>
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
							<p><span className='capitalize'>{integrationName}</span> account could not be connected at this moment.</p>
						</div>
					)}
				</div>
			</div>
			<meta httpEquiv="refresh" content={`3;url=/dashboard/location/${state}/settings/integrations`} />
		</div>
	);
}