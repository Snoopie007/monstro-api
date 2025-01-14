
import { auth } from '@/auth'


async function RootPage() {
	const session = await auth();
	console.log(session)
}

export default RootPage