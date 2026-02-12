"use client"

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Empty, EmptyMedia, EmptyDescription, EmptyTitle, EmptyHeader,
  Button,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui"
import type { Promo } from "@subtrees/types/promos"
import { flexRender, getCoreRowModel, useReactTable } from "@/libs/table-utils"
import { createColumnHelper } from "@tanstack/react-table"
import { Ticket, Tag, Pencil, Archive, Loader2 } from "lucide-react"
import { useState } from "react"
import { EditPromo } from "./EditPromo"
import { toast } from "react-toastify"

interface PromosListProps {
  promos: Promo[]
  lid: string
}

const columnHelper = createColumnHelper<Promo>()

export function PromosList({ promos, lid }: PromosListProps) {
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null)
  const [promoToArchive, setPromoToArchive] = useState<Promo | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)

  const handleArchive = async () => {
    if (!promoToArchive) return
    
    setIsArchiving(true)
    try {
      const response = await fetch(`/api/locations/${lid}/promos/${promoToArchive.id}`, {
        method: "DELETE",
      })
      
      if (response.ok) {
        toast.success("Promo archived successfully")
        setPromoToArchive(null)
        window.location.reload()
      } else {
        toast.error("Failed to archive promo")
      }
    } catch (error) {
      console.error("Error archiving promo:", error)
      toast.error("Failed to archive promo")
    } finally {
      setIsArchiving(false)
    }
  }

  const formatDuration = (promo: Promo) => {
    if (promo.duration === "once") return "One-time use"
    if (promo.duration === "forever") return "Forever"
    if (promo.duration === "repeating") {
      return `${promo.durationInMonths} month${promo.durationInMonths === 1 ? "" : "s"}`
    }
    return promo.duration
  }

  const columns = [
    columnHelper.accessor("code", {
      header: "Code",
      cell: (info) => (
        <div className="font-mono font-semibold">{info.getValue()}</div>
      ),
    }),
    columnHelper.accessor("type", {
      header: "Discount",
      cell: (info) => {
        const promo = info.row.original
        return (
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-muted-foreground" />
            <span>
              {promo.type === "percentage" 
                ? `${promo.value}% off` 
                : `$${(promo.value / 100).toFixed(2)} off`}
            </span>
          </div>
        )
      },
    }),
    columnHelper.accessor("duration", {
      header: "Duration",
      cell: (info) => formatDuration(info.row.original),
    }),
    columnHelper.accessor("maxRedemptions", {
      header: "Redemptions",
      cell: (info) => {
        const promo = info.row.original
        const max = promo.maxRedemptions
        const used = promo.redemptionCount || 0
        if (max) {
          return `${used} / ${max}`
        }
        return `${used} / Unlimited`
      },
    }),
    columnHelper.accessor("isActive", {
      header: "Status",
      cell: (info) => {
        const isActive = info.getValue()
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            isActive 
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" 
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
          }`}>
            {isActive ? "Active" : "Archived"}
          </span>
        )
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const promo = info.row.original
        if (!promo.isActive) return null
        return (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setEditingPromo(promo)}
              title="Edit"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPromoToArchive(promo)}
              title="Archive"
            >
              <Archive className="size-3.5" />
            </Button>
          </div>
        )
      },
    }),
  ]

  const table = useReactTable({
    data: promos,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (promos.length === 0) {
    return (
      <Empty variant="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Ticket className="size-5" />
          </EmptyMedia>
          <EmptyTitle>No promo codes found</EmptyTitle>
          <EmptyDescription>Promo codes will appear here when they are created</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="bg-foreground/5">
                  {header.isPlaceholder ? null : flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingPromo && (
        <EditPromo
          promo={editingPromo}
          lid={lid}
          onClose={() => setEditingPromo(null)}
        />
      )}
      <AlertDialog open={!!promoToArchive} onOpenChange={(open) => !open && setPromoToArchive(null)}>
        <AlertDialogContent className="border-foreground/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Promo Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{promoToArchive?.code}</strong>? 
              This action cannot be undone and members will no longer be able to use this promo code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleArchive} 
              disabled={isArchiving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isArchiving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Archive"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
