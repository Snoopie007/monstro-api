import { SideNav, TopNav } from "../components/menus";
import { cn } from "@/libs/utils";
import { AccountStatusProvider } from "../providers/AccountStatusProvider";

interface AccountStatusLayoutProps {
    children: React.ReactNode,
    params: Promise<{ id: string }>
}



export default async function AccountStatusLayout(props: AccountStatusLayoutProps) {
    const params = await props.params;
    const { children } = props;


    return (
        <main className={cn("min-h-screen max-h-screen h-screen overflow-hidden flex flex-col w-full  bg-background")}>
            <AccountStatusProvider>
                <TopNav locationId={params.id} />
                <div className="relative flex flex-1 flex-row justify-start items-start  w-full">

                    <SideNav locationId={params.id} />
                    <div className="flex-1 h-full">
                        {children}
                    </div>
                </div>
            </AccountStatusProvider>
        </main>

    )
}
