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

const StaffColumns = [{
    label: "First Name",
    key: "firstName"
}, {
    label: "Last Name",
    key: "lastName"
}, {
    label: "Email",
    key: "email"
}, {
    label: "Phone",
    key: "phone"
}, {
    label: "Role",
    key: "role"
}];

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
                        {StaffColumns.map((title) => (
                            <TableHead key={title.label} className="font-semibold text-xs text-foreground bg-foreground/5 h-auto py-2 px-4 " >
                                {title.label}
                            </TableHead>
                        ))}
                        <TableHead className=" bg-foreground/5 h-auto py-2 px-4 " ></TableHead>
                    </TableRow>


                </TableHeader>
                <TableBody>

                    {filteredStaffs.map((staff, index) => (
                        <TableRow key={index} className='cursor-pointer text-sm'>
                            {StaffColumns.map(column => {

                                if (column.key === "role") {
                                    return (
                                        <TableCell key={column.key} className="p-1.5 px-4">
                                            <Badge roles={staff.role.color} className='border-0 py-0.5 capitalize rounded-sm'>
                                                {staff.role.name}
                                            </Badge>
                                        </TableCell>
                                    )
                                }
                                return (
                                    <TableCell key={column.key} className="p-1.5 px-4">
                                        {typeof staff[column.key as keyof Staff] === 'object' ? JSON.stringify(staff[column.key as keyof Staff]) : String(staff[column.key as keyof Staff])}
                                    </TableCell>
                                )
                            })}
                            <TableCell className="p-1.5 px-2">
                                <div className='flex justify-end'>
                                    <StaffListActions
                                        staff={staff}
                                        onChange={(staff) => {
                                            if (staff) {
                                                setCurrentStaff(staff)
                                            }
                                        }}
                                        deleteFunction={removeStaff}
                                    />
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

