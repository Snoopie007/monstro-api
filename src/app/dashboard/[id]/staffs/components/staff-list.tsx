import { Card, CardContent, Table, TableCell, TableHead, TableBody, TableHeader, TableRow, TableFooter, Badge } from '@/components/ui'
import InviteStaff from './invite-staff'
import { Icon } from '@/components/icons'
import StaffListActions from './actions'
import { Staff } from '@/types'
import { useMemo, useState } from 'react'
import { cn } from '@/libs/utils'
import { StaffProfile } from './staff-profile'
import { useRoles } from '@/hooks/use-roles'
import { deleteStaff } from '@/libs/api'
import { toast } from 'react-toastify'
import useSWR from 'swr'


interface StaffListProps {
    staffs: Staff[],
    locationId: string
}

export function StaffList({ staffs, locationId }: StaffListProps) {
    const [filteredStaffs, setFilteredStaffs] = useState<Staff[]>(staffs);
    const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
    const { mutate } = useSWR(`/api/protected/${locationId}/staffs`);
    const { roles, isLoading: isRolesLoading, error: isRolesError } = useRoles(locationId);
    const editOptions = useMemo(() => {
        return {
            currentStaff,
            onChange: (staff: Staff) => setCurrentStaff(staff),
        }
    }, [currentStaff])

    async function removeStaff(staffId: number) {
        await deleteStaff(staffId, locationId).then(() => {
            mutate();
            toast.success("Staff Deleted");
        }).catch(() => {
            toast.error("Something went wrong.");
        })
    }

    return (
        <div>
            <div className="mb-3">
                <div className='flex flex-row  justify-between items-center py-3'>
                    <div className='relative'>
                        <input placeholder='Search staff' className=' rounded-sm border-foreground text-sm bg-transparent  py-2  pl-7 pr-3 border ' />
                        <div>
                            <Icon name="Search" size={15} className="text-gray-400  absolute left-[10px] top-[50%] -translate-y-[51%]" />
                        </div>
                    </div>
                    {!isRolesLoading && !isRolesError && (
                        <InviteStaff roles={roles} locationId={locationId} />
                    )}
                </div>
            </div>
            <Card className='overflow-hidden shadow-none  rounded-sm '>
                <CardContent className='p-0 '>
                    <Table className=" w-full ">
                        <TableHeader >
                            <TableRow className='px-4 bg-transparent' >
                                {["Name", "Email", "Phone", "Role", ""].map((title) => (
                                    <TableHead key={title} className="font-semibold dark:text-white h-auto py-2.5 px-4 " >
                                        {title}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>

                            {filteredStaffs.map((staff, index) => (
                                <TableRow key={index} className='cursor-pointer text-sm'>
                                    <TableCell className="p-1.5 px-4">
                                        {staff.firstName} {staff.lastName}
                                    </TableCell>

                                    <TableCell className="p-1.5 px-4">
                                        {staff.email}
                                    </TableCell>
                                    <TableCell className="p-1.5 px-4">
                                        {staff.phone}
                                    </TableCell>
                                    <TableCell className="p-1.5 px-4">
                                        <Badge roles={staff.role.color} className='border-0 py-0.5 rounded-sm'>
                                            {staff.role.name}
                                        </Badge>


                                    </TableCell>
                                    <TableCell className="p-1.5 px-2">
                                        <div className='flex justify-end'>
                                            <StaffListActions staff={staff} onChange={(staff) => {
                                                if (staff) {
                                                    setCurrentStaff(staff)
                                                }
                                            }} deleteFunction={removeStaff} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter >
                            <TableRow className='px-4 bg-transparent hover:bg-transparent  '>
                                <TableCell colSpan={5} className=" py-3 text-sm">
                                    Showing {staffs.length} staff members
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
            <StaffProfile staff={editOptions.currentStaff} onChange={editOptions.onChange} />
        </div>
    )
}

