import React from "react";
import { flexRender as tanstackFlexRender } from "@tanstack/react-table";
import type { Cell, Header } from "@tanstack/react-table";

/**
 * Type-safe wrapper for TanStack Table's flexRender that's compatible with React 19
 * Fixes type compatibility issues between TanStack Table and React 19 strict types
 */
export function flexRender<TData = unknown>(
  component: any,
  props: any
): React.ReactNode {
  return tanstackFlexRender(component, props) as React.ReactNode;
}

/**
 * Renders a table cell with proper React 19 type compatibility
 */
export function renderTableCell<TData>(
  cell: Cell<TData, unknown>
): React.ReactNode {
  return flexRender(cell.column.columnDef.cell, cell.getContext());
}

/**
 * Renders a table header with proper React 19 type compatibility
 */
export function renderTableHeader<TData>(
  header: Header<TData, unknown>
): React.ReactNode {
  if (header.isPlaceholder) return null;
  return flexRender(header.column.columnDef.header, header.getContext());
}

// Re-export commonly used TanStack Table types and functions
export {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type Table,
} from "@tanstack/react-table";
