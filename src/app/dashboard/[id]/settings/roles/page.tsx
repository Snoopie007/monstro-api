'use client';

import RoleList from "./RoleList"
import { use } from "react";
import { usePermissions } from "@/hooks/use-roles";
import SectionLoader from "@/components/section-loading";

export default function RolesPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { permissions, isLoading } = usePermissions(params.id);

    if (isLoading) {
        return <SectionLoader />
    }

    return (
        <div>
            <RoleList permissions={permissions} locationId={params.id} />
        </div>
    )
}
