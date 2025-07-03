"use client";
import { use, useMemo, useState } from "react";
import ErrorComponent from "@/components/error";
import { useStaffs } from "@/hooks/useStaffs";
import { StaffProfile } from "./components";
import {
  Skeleton,
  TableHead,
  TableHeader,
  Table,
  TablePage,
  TablePageContent,
  TablePageFooter,
  TablePageHeader,
  TablePageHeaderSection,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui";
import { useRoles } from "@/hooks/useRoles";
import InviteStaff from "./components/InviteStaff";
import { Input } from "@/components/forms";
import { Staff } from "@/types";
import useSWR from "swr";
import { toast } from "react-toastify";
import { flexRender, getCoreRowModel, useReactTable } from "@/libs/table-utils";
import { StaffColumns } from "./components/StaffColumn";
import { tryCatch } from "@/libs/utils";

interface StaffsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function StaffsPage(props: StaffsPageProps) {
  const params = use(props.params);
  const { staffs, isLoading, error } = useStaffs(params.id);
  const {
    roles,
    isLoading: isRolesLoading,
    error: isRolesError,
  } = useRoles(params.id);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const { mutate } = useSWR(`/api/protected/${params.id}/staffs`);

  const columns = StaffColumns(params.id);
  const table = useReactTable({
    data: staffs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // if (isLoading) return <Loading />
  if (error) return <ErrorComponent error={error} />;
  const editOptions = useMemo(() => {
    return {
      currentStaff,
      onChange: (staff: Staff) => setCurrentStaff(staff),
    };
  }, [currentStaff]);

  async function removeStaff(staffId: number) {
    const { result, error } = await tryCatch(
      fetch(`/api/protected/loc/${params.id}/staffs/${staffId}`, {
        method: "DELETE",
      })
    );

    if (error || !result || !result.ok) {
      toast.error("Something went wrong.");
      return;
    }

    toast.success("Staff deleted successfully.");
    mutate();
  }

  return (
    <>
      <TablePage>
        <TablePageHeader>
          <TablePageHeaderSection>
            <div className="flex flex-row   items-center gap-2 ">
              <Input
                placeholder="Find a member..."
                onChange={(event) => {
                  const value = event.target.value;
                  // table.getColumn("name")?.setFilterValue(value);
                }}
                variant="search"
              />

              {!isRolesLoading && !isRolesError && (
                <InviteStaff roles={roles} lid={params.id} />
              )}
            </div>
          </TablePageHeaderSection>
        </TablePageHeader>
        <TablePageContent>
          <Table className="w-auto border-r border-b border-foreground/5">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="align-middle text-sm  bg-foreground/5"
                >
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        className="h-auto  border-foreground/5  py-1  text-foreground"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  {table.getHeaderGroups()[0].headers.map((header, i) => {
                    return (
                      <TableCell key={i}>
                        <Skeleton className="w-full h-4 bg-gray-100" />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ) : (
                <>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="border border-foreground/5 py-1.5"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-6 w-full font-medium text-center"
                      >
                        No staff found.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </TablePageContent>
        <TablePageFooter>
          {!isLoading && (
            <div className="p-2">Showing {staffs.length} staff members</div>
          )}
        </TablePageFooter>
      </TablePage>

      <StaffProfile
        staff={editOptions.currentStaff}
        onChange={editOptions.onChange}
      />
    </>
  );
}
