
import Link from "next/link";
import { Button } from "@/components/ui";
import { Caselist } from "./components";



export default async function SupportPage() {
    return (
        <div className="max-w-4xl w-full m-auto mt-6">
            <div className="pb-4 flex flex-row justify-between items-center gap-2">
                <div className="flex flex-col">
                    <h1 className="text-lg font-semibold">Monstro Support Center</h1>
                    <p className="text-sm text-muted-foreground">Request and manage your support requests.</p>
                </div>
                <Button variant="foreground" asChild size="sm">
                    <Link href={"/support/cases/new"} >
                        Create Case
                    </Link>
                </Button>
            </div>

            <Caselist />
        </div >
    )
}
