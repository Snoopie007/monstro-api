"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { usePermission, useAnyPermission, useAllPermissions } from "@/hooks/usePermissions";
import type { Permission } from "@/hooks/usePermissions";

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  mode?: "any" | "all";
  locationId?: string;
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 * 
 * @param children - Content to render if user has permission
 * @param permission - Single permission required (use for simple cases)
 * @param permissions - Array of permissions (use with mode prop)
 * @param mode - "any" for OR logic, "all" for AND logic (default: "any")
 * @param locationId - Optional location ID to check permissions for
 * @param fallback - Content to render if user doesn't have permission (default: null)
 */
export function PermissionGuard({
  children,
  permission,
  permissions,
  mode = "any",
  locationId,
  fallback = null,
}: PermissionGuardProps) {
  let hasRequiredPermission = false;

  if (permission) {
    // Single permission check
    hasRequiredPermission = usePermission(permission, locationId);
  } else if (permissions && permissions.length > 0) {
    // Multiple permissions check
    if (mode === "all") {
      hasRequiredPermission = useAllPermissions(permissions, locationId);
    } else {
      hasRequiredPermission = useAnyPermission(permissions, locationId);
    }
  } else {
    // No permissions specified, deny access by default
    hasRequiredPermission = false;
  }

  return <>{hasRequiredPermission ? children : fallback}</>;
}

interface RoleGuardProps {
  children: React.ReactNode;
  roles: string[];
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user role
 * 
 * @param children - Content to render if user has required role
 * @param roles - Array of roles that are allowed
 * @param fallback - Content to render if user doesn't have required role (default: null)
 */
export function RoleGuard({ children, roles, fallback = null }: RoleGuardProps) {
  const { data: session } = useSession();

  const hasRequiredRole = session?.user?.role && roles.includes(session.user.role);

  return <>{hasRequiredRole ? children : fallback}</>;
}

interface VendorOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that only renders content for vendor users
 */
export function VendorOnly({ children, fallback = null }: VendorOnlyProps) {
  return (
    <RoleGuard roles={["vendor"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

interface StaffOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that only renders content for staff users
 */
export function StaffOnly({ children, fallback = null }: StaffOnlyProps) {
  return (
    <RoleGuard roles={["staff"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

// Common permission guard components for convenience
export const CanViewMembers = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="view member" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanCreateMembers = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="add member" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanEditMembers = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="edit member" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanDeleteMembers = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="delete member" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanViewPrograms = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="view program" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanCreatePrograms = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="add program" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanEditPrograms = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="edit program" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanDeletePrograms = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="delete program" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanViewAchievements = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="view achievement" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanCreateAchievements = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="add achievement" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanEditAchievements = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="edit achievement" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanDeleteAchievements = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="delete achievement" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanViewContracts = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="view contract" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanCreateContracts = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="add contract" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanEditContracts = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="edit contract" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanDeleteContracts = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="delete contract" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanViewRoles = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="view role" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanCreateRoles = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="add role" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanEditRoles = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="edit role" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanDeleteRoles = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="delete role" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanEditBusinessProfile = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="edit business_profile" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);

export const CanAddMemberCard = ({ children, fallback = null, locationId }: Omit<PermissionGuardProps, "permission">) => (
  <PermissionGuard permission="add member_card" fallback={fallback} locationId={locationId}>
    {children}
  </PermissionGuard>
);