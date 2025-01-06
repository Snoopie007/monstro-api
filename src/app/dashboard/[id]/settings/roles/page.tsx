'use client';
import { PermissionGroup } from "@/types"
import RoleList from "./role-list"
import { use } from "react";
import { usePermissions } from "@/hooks/use-roles";
import SectionLoader from "@/components/section-loading";

export default function RolesPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { permissions, error, isLoading } = usePermissions(params.id);
    return (
        <div>
            {isLoading || error ? (
                <SectionLoader />
            ) : (
                <RoleList permissions={permissions} locationId={params.id} />)}
        </div>
    )
}
