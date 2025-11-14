'use client'
import { use, useMemo, useState } from 'react'
import { CreateContract, ContractItem } from './components'
import { useContracts } from '@/hooks/useContracts'
import { Input } from '@/components/forms/input'
import { usePermission } from '@/hooks/usePermissions'
import {
    Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle,
    Table, TableBody, TableHead, TableHeader, TableRow
} from '@/components/ui'
import { FileIcon } from 'lucide-react'
export default function ContractTemplatesPage(props: {
    params: Promise<{ id: string }>
}) {
    const params = use(props.params)
    const canAddContract = usePermission('add contract', params.id)
    const { contracts, isLoading, error } = useContracts(params.id)

    return (
        <div className="flex flex-col gap-4">
            <div className="max-w-6xl mx-auto w-full space-y-4">
                <div className="flex flex-row items-center justify-between">
                    <Input placeholder="Find a contract..."
                        variant="search"
                        className="h-10 bg-foreground/5 rounded-lg w-[300px]"
                    />
                    {canAddContract && (
                        <CreateContract locationId={params.id} />
                    )}
                </div>
                <div className="border border-foreground/10 rounded-lg">
                    {!isLoading && contracts && contracts.length ? (
                        <Table>
                            <TableHeader className="bg-foreground/10">
                                <TableRow>
                                    {["Title", "Description", "Type", "Status", "Editable", "Signature Required", ""].map((title) => (
                                        <TableHead key={title}>{title}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contracts.map((contract, index) => (
                                    <ContractItem key={index} contract={contract} />
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <FileIcon className="size-5" />
                                </EmptyMedia>
                                <EmptyTitle>No contracts found</EmptyTitle>
                                <EmptyDescription>Create a contract to get started</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )}
                </div>
            </div>
        </div>
    )
}




// function RemoveContract({
//     id,
//     editable,
//     lid,
// }: {
//     id: string
//     editable: boolean
//     lid: string
// }) {
//     const [loading, setLoading] = useState(false)
//     async function onDelete(id: string) {
//         if (!id) return
//         setLoading(true)
//         const { result, error } = await tryCatch(
//             fetch(`/api/protected/loc/${lid}/contracts/${id}`, {
//                 method: 'DELETE',
//             })
//         )
//         setLoading(false)
//         if (result?.status === 403) {
//             toast.error('You are not authorized to delete this contract')
//             return
//         }

//         if (error && !result) {
//             toast.error(error.message)
//         }
//     }

//     return (
//         <Button
//             variant={'ghost'}
//             size={'icon'}
//             className="size-6 hover:bg-foreground/5 text-foreground/50 rounded-sm"
//             disabled={!editable}
//             onClick={(e) => {
//                 onDelete(id)
//             }}
//         >
//             {loading ? (
//                 <Loader2Icon className="size-3 animate-spin" />
//             ) : (
//                 <Trash2Icon className="size-3" />
//             )}
//         </Button>
//     )
// }
