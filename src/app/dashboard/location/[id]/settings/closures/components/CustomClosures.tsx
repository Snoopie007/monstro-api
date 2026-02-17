"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { Plus, Trash2, Calendar, Wrench, MoreVertical } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { tryCatch } from "@/libs/utils";
import { NewClosureDialog } from "./NewClosureDialog";
import type { ReservationException } from "@/types/reservation";

interface CustomClosuresProps {
  locationId: string;
  closures: ReservationException[];
  onRefetch?: () => void;
}

export function CustomClosures({ locationId, closures, onRefetch }: CustomClosuresProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(closureId: string) {
    setDeleting(closureId);
    
    const { result, error } = await tryCatch(
      fetch(`/api/protected/loc/${locationId}/exceptions/${closureId}`, {
        method: 'DELETE',
      })
    );

    setDeleting(null);

    if (error || !result?.ok) {
      toast.error('Failed to delete closure');
      return;
    }

    toast.success('Closure removed');
    onRefetch?.();
  }

  function formatDateRange(start: Date | string, end?: Date | string | null) {
    const startDate = new Date(start);
    if (!end) {
      return format(startDate, 'MMM d, yyyy');
    }
    const endDate = new Date(end);
    
    // Same day
    if (startDate.toDateString() === endDate.toDateString()) {
      return format(startDate, 'MMM d, yyyy');
    }
    
    // Same month
    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'd, yyyy')}`;
    }
    
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  }

  // Filter for location-wide closures (holiday/maintenance)
  const locationClosures = closures.filter(
    c => c.initiator === 'holiday' || c.initiator === 'maintenance'
  );

  return (
    <Card className="border-foreground/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Custom Closures</CardTitle>
          <CardDescription>
            Add specific dates for holidays, maintenance, or special closures
          </CardDescription>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="size-4 mr-1" />
          Add Closure
        </Button>
      </CardHeader>
      <CardContent>
        {locationClosures.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="size-10 mx-auto mb-2 opacity-50" />
            <p>No custom closures scheduled</p>
            <p className="text-sm">Add closures for maintenance, special events, or custom holidays</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-foreground/10">
                <TableHead>Date(s)</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locationClosures.map((closure) => (
                <TableRow key={closure.id} className="border-foreground/10">
                  <TableCell className="font-medium">
                    {formatDateRange(closure.occurrenceDate, closure.endDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {closure.reason || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className="gap-1"
                    >
                      {closure.initiator === 'holiday' ? (
                        <>
                          <Calendar className="size-3" />
                          Holiday
                        </>
                      ) : (
                        <>
                          <Wrench className="size-3" />
                          Maintenance
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-foreground/10">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive cursor-pointer"
                          onClick={() => handleDelete(closure.id)}
                          disabled={deleting === closure.id}
                        >
                          <Trash2 className="size-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <NewClosureDialog
        locationId={locationId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setDialogOpen(false);
          onRefetch?.();
        }}
      />
    </Card>
  );
}
