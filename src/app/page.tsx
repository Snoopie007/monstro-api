
import { auth } from '@/auth'


async function RootPage() {
	const session = await auth();

}

export default RootPage