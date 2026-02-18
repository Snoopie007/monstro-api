import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Button } from "@/components/ui";
import { MemberPackage } from "@subtrees/types";
import { EllipsisVertical, Play, Pause, PlusIcon } from "lucide-react";

export function PkgActions({ pkg }: { pkg: MemberPackage }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button>
                    <EllipsisVertical className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem
                    className={'cursor-pointer text-xs flex flex-row items-center justify-between gap-2'}
                    onClick={() => { }}
                    disabled={!pkg || !['active', 'paused'].includes(pkg.status)}
                >
                    <span > {pkg.status === "active" ? "Pause" : "Resume"}</span>
                    {pkg.status === "active" ? <Pause className="size-3" /> : <Play className="size-3" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}