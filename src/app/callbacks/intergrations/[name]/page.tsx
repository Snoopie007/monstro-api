import { auth } from '@/auth';
import { Button } from '@/components/ui';
import { decodeId } from '@/libs/server-utils';
import { BadgeCheck, CircleSlash } from 'lucide-react';
import { redirect } from 'next/navigation';

async function completeIntegerationConnection(name: string, token: string, searchParams: { code: string, scope: string, state: string }): Promise<boolean> {
	const decodedId = decodeId(searchParams.state);
	const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/integrations/${name}`, {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${token}`,
			"locationId": `${decodedId}`,
			"content-type": "application/json"
		},
		body: JSON.stringify({
			scope: searchParams.scope || "",
			code: searchParams.code || ""
		})
	})
	if (!res.ok) {
		return false;
	}
	return true;
}

export default async function CompleteIntegeration(props: { params: Promise<{ name: string }>, searchParams: Promise<any> }) {
    const searchParams = await props.searchParams;
    const params = await props.params;
    const session = await auth();

    if (!session) {
		// return redirect to login?
		return null;
	}

    const connection = await completeIntegerationConnection(params.name, session.user.token, searchParams);
    return (
		<div className=" h-[100svh] bg-white dark:bg-white text-black dark:text-black w-full ">

			<div className="max-w-lg w-full h-full m-auto py-10 flex flex-row items-center">
				<div className=" text-center border px-6 py-10 rounded-sm   border-gray-200 shadow-sm   m-auto ">
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
