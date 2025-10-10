"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";

export type Permission = 
  // Member Management
  | "view member" | "edit member" | "add member" | "delete member"
  // Program Management
  | "view program" | "edit program" | "add program" | "delete program"
  // Achievement Management
  | "view achievement" | "edit achievement" | "add achievement" | "delete achievement"
  // Contract Management
  | "view contract" | "edit contract" | "add contract" | "delete contract"
  // Role Management
  | "view role" | "edit role" | "add role" | "delete role"
  // Business Management
  | "edit business_profile" | "add member_card";

/**
 * Hook to check if the current user has a specific permission
 * @param permission - The permission to check
 * @param locationId - Optional location ID to check permission for specific location
 * @returns boolean indicating if user has the permission
 */
export function usePermission(permission: Permission, locationId?: string): boolean {
  const { data: session } = useSession();
  return useMemo(() => {
    if (!session?.user) {
      return false;
    }

    // Vendors have all permissions for their locations
    if (session.user.role === "vendor") {
      if (!locationId) return true; // Vendor has global permission if no location specified
      
      return session.user.locations?.some((loc: any) => loc.id === locationId) || false;
    }

    // Staff members need explicit permission checks
    if (session.user.role === "staff") {
      if (!locationId) {
        // Check if user has permission for any location
        return session.user.locations?.some((loc: any) => 
          loc.permissions?.includes(permission)
        ) || false;
      }

      // Check permission for specific location
      const location = session.user.locations?.find((loc: any) => loc.id === locationId);
      return location?.permissions?.includes(permission) || false;
    }

    return false;
  }, [session, permission, locationId]);
}

/**
 * Hook to check if the current user has any of the specified permissions
 * @param permissions - Array of permissions to check (OR logic)
 * @param locationId - Optional location ID
 * @returns boolean indicating if user has any of the permissions
 */
export function useAnyPermission(permissions: Permission[], locationId?: string): boolean {
  const { data: session } = useSession();

  return useMemo(() => {
    if (!session?.user) {
      return false;
    }

    // Vendors have all permissions
    if (session.user.role === "vendor") {
      if (!locationId) return true;
      return session.user.locations?.some((loc: any) => loc.id === locationId) || false;
    }

    // Staff members need explicit permission checks
    if (session.user.role === "staff") {
      if (!locationId) {
        return session.user.locations?.some((loc: any) => 
          loc.permissions?.some((perm: any) => permissions.includes(perm as Permission))
        ) || false;
      }

      const location = session.user.locations?.find((loc: any) => loc.id === locationId);
      return location?.permissions?.some((perm: any) => permissions.includes(perm as Permission)) || false;
    }

    return false;
  }, [session, permissions, locationId]);
}

/**
 * Hook to check if the current user has all of the specified permissions
 * @param permissions - Array of permissions to check (AND logic)
 * @param locationId - Optional location ID
 * @returns boolean indicating if user has all permissions
 */
export function useAllPermissions(permissions: Permission[], locationId?: string): boolean {
  const { data: session } = useSession();

  return useMemo(() => {
    if (!session?.user) {
      return false;
    }

    // Vendors have all permissions
    if (session.user.role === "vendor") {
      if (!locationId) return true;
      return session.user.locations?.some((loc: any) => loc.id === locationId) || false;
    }

    // Staff members need explicit permission checks
    if (session.user.role === "staff") {
      if (!locationId) {
        // Check if all permissions exist across all locations
        const allUserPermissions = new Set<string>();
        session.user.locations?.forEach((loc: any) => {
          loc.permissions?.forEach((perm: any) => allUserPermissions.add(perm));
        });
        return permissions.every(perm => allUserPermissions.has(perm));
      }

      const location = session.user.locations?.find((loc: any) => loc.id === locationId);
      if (!location?.permissions) return false;
      return permissions.every((perm: any) => location.permissions!.includes(perm));
    }

    return false;
  }, [session, permissions, locationId]);
}

/**
 * Hook to get all permissions for the current user for a specific location
 * @param locationId - Location ID to get permissions for
 * @returns array of permission names
 */
export function useUserPermissions(locationId?: string): string[] {
  const { data: session } = useSession();

  return useMemo(() => {
    if (!session?.user) {
      return [];
    }

    // Vendors have all permissions
    if (session.user.role === "vendor") {
      const allPermissions: Permission[] = [
        // Member Management
        "view member", "edit member", "add member", "delete member",
        // Program Management
        "view program", "edit program", "add program", "delete program",
        // Achievement Management
        "view achievement", "edit achievement", "add achievement", "delete achievement",
        // Contract Management
        "view contract", "edit contract", "add contract", "delete contract",
        // Role Management
        "view role", "edit role", "add role", "delete role",
        // Business Management
        "edit business_profile", "add member_card"
      ];
      
      if (!locationId) return allPermissions;
      
      return session.user.locations?.some((loc: any) => loc.id === locationId) ? allPermissions : [];
    }

    // Staff members have explicit permissions
    if (session.user.role === "staff") {
      if (!locationId) {
        // Get all permissions across all locations
        const allPermissions = new Set<string>();
        session.user.locations?.forEach((loc: any) => {
          loc.permissions?.forEach((perm: any) => allPermissions.add(perm));
        });
        return Array.from(allPermissions);
      }

      const location = session.user.locations?.find((loc: any) => loc.id === locationId);
      return location?.permissions || [];
    }

    return [];
  }, [session, locationId]);
}

/**
 * Hook to get the current user's role and location information
 * @returns object containing user role and locations
 */
export function useUserRole() {
  const { data: session } = useSession();

  return useMemo(() => ({
    role: session?.user?.role || null,
    locations: session?.user?.locations || [],
    isAuthenticated: !!session?.user,
    isVendor: session?.user?.role === "vendor",
    isStaff: session?.user?.role === "staff",
  }), [session]);
}