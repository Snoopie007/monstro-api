import {
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  Table,
  useReactTable,
} from "@tanstack/react-table";
import React, { useState, useEffect, useMemo } from "react";

import { Input } from "@/components/forms/input";

import { ProgramMemberColumns } from "./ProgramMemberColumns";
import { ProgramMemberTable } from "./ProgramMemberTable";

import { Member } from "@/types";
import { useProgramMembers } from "@/hooks/usePrograms";
import { CustomFieldDefinition } from "@/components/custom-fields";

export function ProgramMembers({
  programId,
  locationId,
}: {
  programId: string;
  locationId: string;
}) {
  const { members, error, isLoading } = useProgramMembers(
    locationId,
    programId
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [customFieldsLoading, setCustomFieldsLoading] = useState(true);

  // Fetch custom fields
  useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const response = await fetch(
          `/api/protected/loc/${locationId}/custom-fields`
        );
        const data = await response.json();

        if (data.success) {
          setCustomFields(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching custom fields:", error);
      } finally {
        setCustomFieldsLoading(false);
      }
    };

    fetchCustomFields();
  }, [locationId]);

  const columns = useMemo(
    () => ProgramMemberColumns(locationId, customFields),
    [locationId, customFields]
  );

  const table: Table<Member> = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnFilters,
    },
  });

  return (
    <>
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <div className="flex-initial">
          <Input
            placeholder="Filter names..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="border text-xs h-auto py-2 rounded-sm"
          />
        </div>
      </div>

      <div className="flex flex-col w-full">
        <ProgramMemberTable
          table={table}
          columns={columns.length}
          isLoading={isLoading}
        />
      </div>
    </>
  );
}
