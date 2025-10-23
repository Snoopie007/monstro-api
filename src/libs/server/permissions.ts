import { auth } from "@/auth";
import { NextResponse } from "next/server";

export type Permission = 
  // Member Management (view is implicit for all authenticated users)
  | "edit member" | "add member" | "delete member"
  // Program Management (view is implicit for all authenticated users)
  | "edit program" | "add program" | "delete program"
  // Achievement Management (view is implicit for all authenticated users)
  | "edit achievement" | "add achievement" | "delete achievement"
  // Contract Management (view is implicit for all authenticated users)
  | "edit contract" | "add contract" | "delete contract"
  // Role Management (view is implicit for all authenticated users)
  | "edit role" | "add role" | "delete role"
  // Business Management (view is implicit for all authenticated users)
  | "edit business_profile" | "add member_card";

export interface PermissionCheck {
  permission: Permission;
  locationId?: string;
}

/**
 * Checks if the current authenticated user has the required permission
 * @param permission - The permission to check
 * @param locationId - Optional location ID to check permission for specific location
 * @returns Promise<boolean> - True if user has permission, false otherwise
 */
export async function hasPermission(permission: Permission, locationId?: string): Promise<boolean> {
  const session = await auth();
  
  if (!session?.user) {
    return false;
  }
  // Vendors have all permissions for their locations
  if (session.user.role === "vendor") {
    if (!locationId) return true; // Vendor has global permission if no location specified
    return session.user.locations?.some((loc: any) => loc.id === locationId) || false;
  }

  // Staff members need explicit permission checks for edit/add/delete
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
}

/**
 * Checks if the current authenticated user can view a resource
 * View permissions are implicit for all authenticated users
 * @param locationId - Optional location ID to check access for specific location
 * @returns Promise<boolean> - True if user can view, false otherwise
 */
export async function canView(locationId?: string): Promise<boolean> {
  const session = await auth();
  
  if (!session?.user) {
    return false;
  }

  // All authenticated users can view resources for their locations
  if (session.user.role === "vendor") {
    if (!locationId) return true;
    return session.user.locations?.some((loc: any) => loc.id === locationId) || false;
  }

  if (session.user.role === "staff") {
    if (!locationId) return true; // Staff can view if they have any location access
    return session.user.locations?.some((loc: any) => loc.id === locationId) || false;
  }

  return false;
}

/**
 * Checks if the current user has any of the specified permissions
 * @param permissions - Array of permissions to check (OR logic)
 * @param locationId - Optional location ID
 * @returns Promise<boolean> - True if user has any of the permissions
 */
export async function hasAnyPermission(permissions: Permission[], locationId?: string): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(permission, locationId)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if the current user has all of the specified permissions
 * @param permissions - Array of permissions to check (AND logic)
 * @param locationId - Optional location ID
 * @returns Promise<boolean> - True if user has all permissions
 */
export async function hasAllPermissions(permissions: Permission[], locationId?: string): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission(permission, locationId))) {
      return false;
    }
  }
  return true;
}

/**
 * Middleware function to protect API routes based on permissions
 * @param permission - Required permission
 * @param locationIdParam - Name of the parameter containing location ID (optional)
 * @returns NextResponse or null (if authorized)
 */
export async function requirePermission(
  permission: Permission,
  locationIdParam?: string
): Promise<NextResponse | null> {
  // This would be used in API routes where we have access to the request
  // For now, we'll use the session-based approach
  const hasAuth = await hasPermission(permission);
  
  if (!hasAuth) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }
  
  return null;
}

/**
 * Gets all permissions for the current user for a specific location
 * @param locationId - Location ID to get permissions for
 * @returns Promise<string[]> - Array of permission names
 */
export async function getUserPermissions(locationId?: string): Promise<string[]> {
  const session = await auth();
  
  if (!session?.user) {
    return [];
  }

  // Vendors have all permissions
  if (session.user.role === "vendor") {
    const allPermissions: Permission[] = [
      // Member Management (view is implicit)
      "edit member", "add member", "delete member",
      // Program Management (view is implicit)
      "edit program", "add program", "delete program",
      // Achievement Management (view is implicit)
      "edit achievement", "add achievement", "delete achievement",
      // Contract Management (view is implicit)
      "edit contract", "add contract", "delete contract",
      // Role Management (view is implicit)
      "edit role", "add role", "delete role",
      // Business Management (view is implicit)
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
}

/**
 * Higher-order function to wrap API route handlers with permission checks
 * @param handler - The original API route handler
 * @param permission - Required permission
 * @param locationIdParam - Name of parameter containing location ID
 * @returns Wrapped handler function
 */
export function withPermission(
  handler: (req: Request, context?: any) => Promise<NextResponse>,
  permission: Permission,
  locationIdParam?: string
) {
  return async (req: Request, context?: any): Promise<NextResponse> => {
    // Extract location ID from URL params if specified
    let locationId: string | undefined;
    if (locationIdParam && context?.params) {
      locationId = context.params[locationIdParam];
    }

    const hasAuth = await hasPermission(permission, locationId);
    
    if (!hasAuth) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return handler(req, context);
  };
}