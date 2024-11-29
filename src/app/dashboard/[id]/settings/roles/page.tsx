import { PermissionGroup } from "@/types"
import RoleList from "./role-list"


async function fetchPermissions(): Promise<PermissionGroup[]> {

    return [
        {
            id: 1,
            name: 'Role',
            permissions: [
                {

                    name: 'Create Role',
                    description: 'Create a new role'
                },
                {

                    name: 'Edit Role',
                    description: 'Edit a role'
                },
                {

                    name: 'Delete Role',
                    description: 'Delete a role'
                }
            ]
        },
        {
            id: 2,
            name: 'Staff',
            permissions: [
                {

                    name: 'Create Staff',

                    description: 'Create a new role'
                },
                {

                    name: 'Edit Staff',

                    description: 'Edit a role'
                },
                {

                    name: 'Delete Staff',

                    description: 'Delete a role'
                }
            ]
        }
    ]

}


export default async function RolesPage(props: {params: Promise<{id: string}>}) {
    const params = await props.params;
    const permissions = await fetchPermissions()

    return (
        <div>
            <RoleList permissions={permissions} locationId={params.id} />
        </div>
    )
}
