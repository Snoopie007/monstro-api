"use client";

import { use, useState } from "react";
import { toast } from "react-toastify";
import { usePermissions, useRoles } from "@/hooks/useRoles";
import {
  Button,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui";
import { Input } from "@/components/forms";
import { Role } from "@/types";
import useSWR from "swr";
import { UpsertRole } from "./components";
import RoleListActions from "./components/actions";
import { UserIcon, ShieldIcon, PlusIcon } from "lucide-react";
import { useDebounce } from "@/hooks";
import { tryCatch } from "@/libs/utils";

export default function RolesPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);

  const { permissions, isLoading } = usePermissions(
    params.id
  );
  const [currentRole, setCurrentRole] = useState<Partial<Role> | null>(null);
  const { mutate } = useSWR(`/api/protected/loc/${params.id}/roles`);
  const { roles, isLoading: isLoadingRoles, error, mutate: mutateRoles } = useRoles(params.id, debouncedQuery);

  function handleCreateRole() {
    setCurrentRole({
      name: "",
      color: "red",
      staffsCount: 0,
      permissions: [],
    });
  }

  function handleSearchRoles(value: string) {
    setQuery(value);
  }

  async function removeRole(roleId: number) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this role?"
    );
    if (!confirmDelete) return;

    try {
      const { result, error } = await tryCatch(
        fetch(`/api/protected/loc/${params.id}/roles/${roleId}`, {
          method: "DELETE",
        })
      );

      if (error || !result || !result.ok) {
        toast.error("Failed to delete role");
        return;
      }
      mutate();
    } catch (err) {
      toast.error("Failed to delete role");
    }
  }

  return (
    <div>
      {permissions && (
        <UpsertRole
          role={currentRole}
          permissions={permissions}
          setCurrentRole={setCurrentRole}
          locationId={params.id}
          onSave={() => {
            setCurrentRole(null);
            mutateRoles();
          }}
        />
      )}
      <div className="mb-3">
        <div className="flex flex-row  justify-between items-center gap-2 py-3">
          <Input
            value={query}
            onChange={(e) => handleSearchRoles(e.target.value)}
            placeholder="Search Roles"
            className="h-10"
          />
          <div className="flex-initial">
            <Button variant={"primary"} className="flex flex-row items-center gap-2" onClick={handleCreateRole}>
              <span>Add Role</span>
              <PlusIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {isLoadingRoles && <></>}
        {roles && !isLoadingRoles &&
          roles.map((role: Role, index: number) => (
            <div key={index} className="grid grid-cols-3 justify-between items-center gap-2 p-3 bg-foreground/5 rounded-lg">
              <div className="flex flex-row  gap-2 items-center ">
                <ShieldIcon size={20} className="text-indigo-600 -mt-0.5" />
                <span className="font-medium text-sm"> {role.name}</span>
              </div>
              <div className="flex flex-row  gap-1  items-center ">
                <span className="mt-0.5 font-medium"> {role.staffsCount || 0}</span>
                <UserIcon size={18} />
              </div>
              <div className="flex justify-end">
                <RoleListActions
                  role={role}
                  deleteFunction={removeRole}
                />
              </div>
            </div>
          ))
        }

        {roles && roles.length === 0 && (
          <Empty variant="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldIcon className="size-4" />
              </EmptyMedia>
              <EmptyTitle>No roles found</EmptyTitle>
              <EmptyDescription>
                Add a role to the location to manage your staffs permissions.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
}
