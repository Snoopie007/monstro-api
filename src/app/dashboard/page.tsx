
import { auth } from '@/auth'


async function DashboardRoot() {
    const session = await auth();

}

export default DashboardRoot