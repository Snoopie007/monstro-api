'use client';

import { use, useState } from "react";
import { usePermissions, useRoles } from "@/hooks/useRoles";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Card, CardContent,
    Button,
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell
} from "@/components/ui";
import { Role } from "@/types";
import useSWR from "swr";
import { UpsertRole } from "./components";
import { Icon } from "@/components/icons";
import RoleListActions from "./components/actions";

export default function RolesPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { permissions, isLoading: isLoadingPermissions } = usePermissions(params.id);
    const [currentRole, setCurrentRole] = useState<Role | null>(null);
    const { mutate } = useSWR(`/api/protected/loc/${params.id}/roles`);
    const { roles, isLoading: isLoadingRoles, error } = useRoles(params.id);

    function handleCreateRole() {

        setCurrentRole({
            name: '',
            color: "red",
            staffs: 0,
            permissions: []
        })
    }

    async function removeRole(roleId: number) {
        const confirmDelete = window.confirm("Are you sure you want to delete this role?");
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/api/protected/loc/${params.id}/roles/${roleId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error("Failed to delete role");
            }
            mutate();
        } catch (error) {
            console.error("Error deleting role:", error);
            alert("Failed to delete role. Please try again.");
        }
    }



    return (
        <div>
            {permissions && (<UpsertRole role={currentRole} permissions={permissions} setCurrentRole={setCurrentRole} locationId={params.id} />)}
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

                            {roles && !isLoadingRoles && (roles.map((role: Role, index: number) => (
                                <TableRow key={index}
                                    className='cursor-pointer border-foreground/20 text-sm'
                                >
                                    <TableCell className="py-2 " onClick={() => { setCurrentRole(role); }}>
                                        <div className='flex flex-row  gap-1 items-center text-sm'>
                                            <Icon name="Shield" size={20} className="text-indigo-600" />
                                            <span>{isLoadingRoles ? <Skeleton className='w-20 h-4' /> : role.name}</span>
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
                            )))}
                            {roles && roles.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-4">
                                        <div className="flex flex-col items-center gap-2">
                                            <p className="text-sm text-muted-foreground">No roles found
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
        </div>
    )
}
