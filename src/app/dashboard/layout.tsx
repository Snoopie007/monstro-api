// src/app/dashboard/layout.tsx (or relevant layout)
import { NovuInbox } from "@/components/navs";
import { UserMenu } from "@/components/navs/UserMenu";
import { authWithContext } from "@/libs/auth/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: {children: React.ReactNode}) {
  const session = await authWithContext(); // Server-side ✅
  
  if (!session) redirect("/login");
  
  // Pass only what's needed to client components
  const safeUserData = {
    ...session.user
  };
  
  return (
    <div>
      <UserMenu user={safeUserData} />
      <NovuInbox user={safeUserData} />
      {children}
    </div>
  );
}