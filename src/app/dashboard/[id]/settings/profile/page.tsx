import { Staff } from "@/types";
import { UserProfile } from "./components";

async function getStaff(id: number): Promise<Staff> {
    return {
        id: 1,
        firstName: 'Jane',
        lastName: 'Doe',
        email: '',
        phone: '1234567890',
        image: '#',
        role: {
            id: 1,
            name: 'Staff',
            color: 'red',
            permissions: ['read', 'write']
        },
        status: 'Active',
        created: new Date(),
        updated: new Date()
    }
}

export default async function ProfilePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const staff = await getStaff(1)
    return (
        <div>
            <UserProfile staff={staff} locationId={params.id} />
        </div>
    )
}
