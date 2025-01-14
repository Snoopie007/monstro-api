
import { auth } from '@/auth'


async function DashboardRoot() {
    const session = await auth();
    console.log(session?.user)
}

export default DashboardRoot