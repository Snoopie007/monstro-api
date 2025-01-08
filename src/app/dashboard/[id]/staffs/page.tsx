
'use client';
import { use } from "react";
import ErrorComponent from "@/components/error"
import { useStaffs } from "@/hooks/use-staffs"
import { StaffList } from "./components"
import Loading from "@/components/loading";
import { Skeleton, TablePage, TablePageContent, TablePageFooter, TablePageHeader, TablePageHeaderSection, TablePageHeaderTitle } from "@/components/ui";
import { useRoles } from "@/hooks/use-roles";
import InviteStaff from "./components/invite-staff";
import { Input } from "@/components/forms";


interface StaffsPageProps {
    params: Promise<{
        id: string
    }>
}

export default function StaffsPage(props: StaffsPageProps) {
    const params = use(props.params);
    const { staffs, isLoading, error } = useStaffs(params.id);
    const { roles, isLoading: isRolesLoading, error: isRolesError } = useRoles(params.id);

    if (error) {
        return (
            <ErrorComponent error={error} />
        )
    }

    return (
        <TablePage>
            <TablePageHeader>
                <TablePageHeaderTitle >
                    Staffs
                </TablePageHeaderTitle>
                <TablePageHeaderSection>
                    <div className='flex flex-row   items-center gap-2 '>

                        <Input
                            placeholder="Find a member..."
                            // value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                            onChange={(event) => {
                                const value = event.target.value;
                                // table.getColumn("name")?.setFilterValue(value);

                            }}
                            className="border text-xs h-auto py-1 border-foreground/10 rounded-xs"
                        />

                        {!isRolesLoading && !isRolesError && (
                            <InviteStaff roles={roles} locationId={params.id} />
                        )}
                    </div>
                </TablePageHeaderSection>
            </TablePageHeader>
            <TablePageContent>
                {isLoading ? (<Loading />) : (<StaffList staffs={staffs} locationId={params.id} />)}
            </TablePageContent>
            <TablePageFooter>
                {!isLoading &&
                    <div className="p-2">
                        Showing {staffs.length} staff members
                    </div>
                }
            </TablePageFooter>
        </TablePage>

    )
}




