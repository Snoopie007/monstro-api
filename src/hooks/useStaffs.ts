import useSWR from "swr";
import { fetcher } from "./hooks";
import { useMemo } from "react";

export interface StaffRowData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  roleColor:
    | "red"
    | "green"
    | "blue"
    | "pink"
    | "cyan"
    | "lime"
    | "orange"
    | "fuchsia"
    | "sky"
    | "lemon"
    | "purple"
    | "yellow"
    | null
    | undefined;
}

function useStaffs(locationId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    { url: `staffs`, id: locationId },
    fetcher
  );

  // Map the API response to StaffRowData format
  const mappedStaffs = useMemo(() => {
    return data?.map((staffLocation: any) => ({
      id: staffLocation.staff.id,
      name: `${staffLocation.staff.firstName} ${staffLocation.staff.lastName}`.trim(),
      email: staffLocation.staff.email,
      phone: staffLocation.staff.phone,
      role: staffLocation.roles?.[0]?.role?.name || "No Role",
      roleColor: staffLocation.roles?.[0]?.role?.color || "No Color",
    })) || [];
  }, [data]); // Only recalculate when SWR data changes

  return {
    staffs: mappedStaffs as StaffRowData[],
    error,
    isLoading,
    mutate
  };
}

export { useStaffs };
