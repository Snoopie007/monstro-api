import { Table, TableCell, TableHead, TableBody, TableHeader, TableRow, Badge } from '@/components/ui'
import StaffListActions from './actions'
import { Staff } from '@/types'
import { useMemo, useState } from 'react'
import { StaffProfile } from './staff-profile'
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
        <>
            <Table className=" w-auto border-r border-b border-foreground/10 ">
                <TableHeader >
                    <TableRow className='px-4 bg-transparent' >
                        {["Name", "Email", "Phone", "Role", ""].map((title) => (
                            <TableHead key={title} className="font-semibold text-xs text-foreground bg-foreground/5 h-auto py-2 px-4 " >
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

            </Table>

            <StaffProfile staff={editOptions.currentStaff} onChange={editOptions.onChange} />
        </>
    )
}

