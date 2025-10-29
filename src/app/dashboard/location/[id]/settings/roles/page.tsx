"use client";

import { use, useState } from "react";
import { toast } from "react-toastify";
import { usePermissions, useRoles } from "@/hooks/useRoles";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
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
import { UserIcon, ShieldIcon } from "lucide-react";
import { useDebounce } from "@/hooks";

export default function RolesPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);

  const { permissions, isLoading: isLoadingPermissions } = usePermissions(
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
      const response = await fetch(
        `/api/protected/loc/${params.id}/roles/${roleId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete role");
      }
      mutate();
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error("Failed to delete role. Please try again.");
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
          <Input value={query} onChange={(e) => handleSearchRoles(e.target.value)} placeholder="Search Roles"
            className="h-9"
          />
          <div className="flex-initial">
            <Button
              size={"sm"}
              variant={"primary"}
              onClick={handleCreateRole}
            >
              Create
            </Button>
          </div>
        </div>
      </div>
      <Card className="border-foreground/10 rounded-lg">
        <CardContent className="p-0">
          <Table className=" w-full ">
            <TableHeader>
              <TableRow className=" bg-transparent  border-foreground/20">
                {["Roles", "Staffs", ""].map((title) => (
                  <TableHead
                    key={title}
                    className="font-semibold  dark:text-white h-auto py-2.5 "
                  >
                    {title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingRoles && (
                <>
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      <Skeleton className="w-full h-4" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      <Skeleton className="w-full h-4" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      <Skeleton className="w-full h-4" />
                    </TableCell>
                  </TableRow>
                </>
              )}
              {roles &&
                !isLoadingRoles &&
                roles.map((role: Role, index: number) => (
                  <TableRow
                    key={index}
                    className="cursor-pointer border-foreground/20 text-sm"
                  >
                    <TableCell
                      className="py-2 "
                      onClick={() => {
                        setCurrentRole(role);
                      }}
                    >
                      <div className="flex flex-row  gap-1 items-center text-sm">
                        <ShieldIcon className="text-indigo-600" />
                        <span>
                          {isLoadingRoles ? (
                            <Skeleton className="w-20 h-4" />
                          ) : (
                            role.name
                          )}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-2 ">
                      <div className="flex flex-row  gap-1 items-center text-sm">
                        <span className=""> {role.staffsCount}</span>
                        <UserIcon className="size-4" />
                      </div>
                    </TableCell>
                    <TableCell
                      className="py-2 "
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end">
                        <RoleListActions
                          role={role}
                          deleteFunction={removeRole}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

            </TableBody>
          </Table>
          {roles && roles.length === 0 && (
            <Empty variant="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldIcon className="size-4" />
                </EmptyMedia>
                <EmptyTitle>No roles found</EmptyTitle>
                <EmptyDescription>Add a role to the location to manage your staffs permissions.</EmptyDescription>
              </EmptyHeader>

            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
