'use client'
import { Icon } from '@/components/icons'
import { Card, CardContent, Table, TableCell, TableHead, TableBody, TableHeader, TableRow, Button, Skeleton } from '@/components/ui'
import { UpsertRole } from './components'
import { useState } from 'react';
import { Permission, Role } from '@/types';
import RoleListActions from './components/actions';
import { useRoles } from '@/hooks/use-roles';
// import { deleteRole } from '@/libs/api';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import SectionLoader from '@/components/section-loading';

export default function RoleList({ permissions, locationId }: { permissions: Array<Permission>, locationId: string }) {
    const [currentRole, setCurrentRole] = useState<Role | null>(null);
    const { mutate } = useSWR(`/api/protected/${locationId}/roles`);
    const { roles, isLoading, error } = useRoles(locationId);

    function handleCreateRole() {

        setCurrentRole({
            name: '',
            color: "red",
            staffs: 0,
            permissions: []
        })
    }

    async function removeRole(roleId: number) {
        // await deleteRole(roleId, locationId).then(() => {
        //     mutate();
        //     toast.success("Role Deleted");
        // }).catch(() => {
        //     toast.error("Something went wrong.");
        // })
    }



    return (
        <>
            <UpsertRole role={currentRole} permissions={permissions} setCurrentRole={setCurrentRole} locationId={locationId} />
            <div className="mb-3">
                <div className='flex flex-row  justify-between items-center py-3'>
                    <div className='relative flex-initial'>
                        <input placeholder='Search Roles' className='rounded-sm border-foreground text-xs bg-transparent  py-1   pl-7 pr-3 border ' />
                        <div>
                            <Icon name="Search" size={15} className="text-gray-400  absolute left-[10px] top-[50%] -translate-y-[51%]" />
                        </div>
                    </div>
                    <div className='flex-initial'>
                        <Button size={"xs"} variant={"foreground"} onClick={handleCreateRole}>Create</Button>
                    </div>
                </div>
            </div>
            <Card className='rounded-xs'>
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

                            {roles && roles.length > 0 ? (
                                roles.map((role: Role, index: number) => (
                                    <TableRow key={index}
                                        className='cursor-pointer border-foreground/20 text-sm'
                                    >
                                        <TableCell className="py-2 " onClick={() => { setCurrentRole(role); }}>
                                            <div className='flex flex-row  gap-1 items-center text-sm'>
                                                <Icon name="Shield" size={20} className="text-indigo-600" />
                                                <span>{isLoading ? <Skeleton className='w-20 h-4' /> : role.name}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-2 ">
                                            <div className='flex flex-row  gap-1 items-center text-sm'>
                                                <span className=''>  {role.staffs}</span>
                                                <Icon name='User' size={16} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2 " onClick={(e) => e.stopPropagation()}>
                                            <div className='flex justify-end'>
                                                <RoleListActions role={role} deleteFunction={removeRole} />
                                            </div>
                                        </TableCell>

                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-4">
                                        <div className="flex flex-col items-center gap-2">
                                            <p className="text-sm text-gray-500">No roles found
                                                <span className='text-white underline cursor-pointer ml-1' onClick={handleCreateRole}>create one</span>
                                            </p>

                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>

                    </Table>
                </CardContent>
            </Card>
        </>
    )
}

