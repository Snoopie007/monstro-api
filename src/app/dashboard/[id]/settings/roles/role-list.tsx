'use client'
import { Icon } from '@/components/icons'
import { Card, CardContent, Table, TableCell, TableHead, TableBody, TableHeader, TableRow, Button } from '@/components/ui'
import { UpsertRole } from './components'
import { useMemo, useState } from 'react';
import { Permission, Role } from '@/types';
import RoleListActions from './components/actions';
import { useRoles } from '@/hooks/use-roles';
import { deleteRole } from '@/libs/api';
import { toast } from 'react-toastify';
import useSWR from 'swr';

export default function RoleList({ permissions, locationId }: { permissions: Array<Permission>, locationId: string }) {
    const [currentRole, setCurrentRole] = useState<Role | null>(null);
    const { mutate } = useSWR(`/api/protected/${locationId}/roles`);
    const { roles, isLoading, error } = useRoles(locationId);

    function handleCreateRole() {
        console.log('create role')
        setCurrentRole({
            name: '',
            color: "red",
            staffs: 0,
            permissions: []
        })
    }

    async function removeRole(roleId: number) {
        await deleteRole(roleId, locationId).then(() => {
            mutate();
            toast.success("Role Deleted");
        }).catch(() => {
            toast.error("Something went wrong.");
        })
    }

    if (isLoading) return <div>Loading...</div>
    if (roles) {
        return (
            <>
                <UpsertRole role={currentRole} permissions={permissions} setCurrentRole={setCurrentRole} locationId={locationId} />
                <div className="mb-3">
                    <div className='flex flex-row  justify-between items-center py-3'>
                        <div className='relative flex-initial'>
                            <input placeholder='Search Roles' className='rounded-sm border-foreground text-sm bg-transparent  py-2  pl-7 pr-3 border ' />
                            <div>
                                <Icon name="Search" size={15} className="text-gray-400  absolute left-[10px] top-[50%] -translate-y-[51%]" />
                            </div>
                        </div>
                        <div className='flex-initial'>
                            <Button size={"sm"} variant={"foreground"} onClick={handleCreateRole}>Create Role</Button>
                        </div>
                    </div>
                </div>
                <Card>
                    <CardContent className='p-0'>
                        <Table className=" w-full ">
                            <TableHeader >
                                <TableRow className=' bg-transparent  border-foreground/20' >
                                    {["Roles", "Staffs", ""].map((title) => (
                                        <TableHead key={title} className="font-semibold  dark:text-white h-auto py-2.5 " >
                                            {title}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>

                                {roles.map((role: Role, index: number) => (
                                    <TableRow key={index}
                                        className='cursor-pointer border-foreground/20 text-sm'
                                    >
                                        <TableCell className="py-4 " onClick={() => {setCurrentRole(role);}}>
                                            <div className='flex flex-row  gap-1 items-center text-sm'>
                                                <Icon name="Shield" size={20} className="text-indigo-600" />
                                                <span>{role.name}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-4 ">
                                            <div className='flex flex-row  gap-1 items-center text-sm'>
                                                <span className=''>  {role.staffs}</span>
                                                <Icon name='User' size={16} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 " onClick={(e) => e.stopPropagation()}>
                                            <div className='flex justify-end'>
                                                <RoleListActions role={role} deleteFunction={removeRole} />
                                            </div>
                                        </TableCell>

                                    </TableRow>
                                ))}
                            </TableBody>

                        </Table>
                    </CardContent>
                </Card>
            </>
        )
    }
}

