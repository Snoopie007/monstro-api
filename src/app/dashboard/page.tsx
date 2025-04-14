import { redirect } from "next/navigation";

export default function DashboardRoot() {

    return redirect("/dashboard/locations")
}
