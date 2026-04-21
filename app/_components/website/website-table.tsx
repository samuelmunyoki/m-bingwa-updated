"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, MoreHorizontal, Package, Wifi, MessageSquare, Clock, Zap, Box } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { AddBundleModal } from "@/components/ui/add-bundle-modal";
import { EditBundleModal } from "@/components/ui/edit-bundle-modal";

type Bundle = {
  _id: Id<"bundles">;
  _creationTime: number;
  userId: string;
  status: "available" | "disabled";
  offerName: string;
  duration: string;
  price: number;
  bundlesUSSD: string;
  isMultiSession: boolean;
  dialingSIM: "SIM1" | "SIM2";
  commission?: number;
  offerType?: string;
  autoReschedule?: string;
  isSimpleUSSD?: boolean;
  responseValidatorText?: string;
};

const offerTypeConfig: Record<string, { icon: React.ReactNode; className: string }> = {
  Data:    { icon: <Wifi className="h-3 w-3" />,           className: "bg-blue-100 text-blue-700 border-blue-200" },
  SMS:     { icon: <MessageSquare className="h-3 w-3" />,  className: "bg-red-100 text-red-700 border-red-200" },
  Minutes: { icon: <Clock className="h-3 w-3" />,          className: "bg-green-100 text-green-700 border-green-200" },
  Airtime: { icon: <Zap className="h-3 w-3" />,            className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  Bundles: { icon: <Box className="h-3 w-3" />,            className: "bg-purple-100 text-purple-700 border-purple-200" },
  Other:   { icon: <Package className="h-3 w-3" />,        className: "bg-gray-100 text-gray-700 border-gray-200" },
};

export function BundlesTable({ userId }: { userId: string }) {
  const bundles = useQuery(api.features.bundles.getAllBundles, { userId });
  const toggleStatus = useMutation(api.features.bundles.toggleBundleStatus);
  const deleteBundle = useMutation(api.features.bundles.deleteBundle);

  const [editingBundle, setEditingBundle] = React.useState<Bundle | null>(null);

  const columns: ColumnDef<Bundle>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "offerName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="px-0 font-semibold text-xs uppercase tracking-wide"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Offer Name
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm">{row.getValue("offerName")}</span>
          <span className="text-xs text-muted-foreground">{row.original.duration}</span>
        </div>
      ),
    },
    {
      accessorKey: "offerType",
      header: "Type",
      cell: ({ row }) => {
        const type = (row.getValue("offerType") as string) ?? "Other";
        const config = offerTypeConfig[type] ?? offerTypeConfig["Other"];
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
            {config.icon}
            {type}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const isAvailable = status === "available";
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
            isAvailable ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-green-500" : "bg-red-500"}`} />
            {isAvailable ? "Available" : "Disabled"}
          </span>
        );
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="px-0 font-semibold text-xs uppercase tracking-wide"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Price
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-sm">KES {parseFloat(row.getValue("price")).toFixed(2)}</span>
      ),
    },
    {
      accessorKey: "commission",
      header: "Commission",
      cell: ({ row }) => {
        const commission = row.getValue("commission") as number | undefined;
        if (!commission) return <span className="text-muted-foreground text-xs">—</span>;
        return <span className="text-sm text-green-600 font-medium">KES {commission.toFixed(2)}</span>;
      },
    },
    {
      accessorKey: "bundlesUSSD",
      header: "USSD",
      cell: ({ row }) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
          {row.getValue("bundlesUSSD")}
        </code>
      ),
    },
    {
      accessorKey: "dialingSIM",
      header: "SIM",
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {row.getValue("dialingSIM")}
        </span>
      ),
    },
    {
      id: "processingType",
      header: "Processing",
      cell: ({ row }) => {
        const { isMultiSession, isSimpleUSSD } = row.original;
        if (isMultiSession) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
              Multi-Session
            </span>
          );
        }
        if (isSimpleUSSD) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
              Simple USSD
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
            Normal USSD
          </span>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const bundle = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(bundle._id);
                  toast.success("Bundle ID copied");
                }}
              >
                Copy Bundle ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEditingBundle(bundle)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await toggleStatus({ id: bundle._id, userId });
                  toast.success(`Bundle ${bundle.status === "available" ? "disabled" : "enabled"}`);
                }}
                className={bundle.status === "available" ? "text-orange-600" : "text-green-600"}
              >
                {bundle.status === "available" ? "Disable" : "Enable"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this bundle?")) {
                    deleteBundle({ id: bundle._id, userId });
                    toast.success("Bundle deleted");
                  }
                }}
                className="text-red-500"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data: (bundles as Bundle[]) || [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    initialState: { pagination: { pageSize: 8 } },
  });

  if (bundles === undefined) {
    return (
      <div className="flex items-center justify-center w-full h-48 gap-2 text-muted-foreground">
        <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        <span className="text-sm">Loading offers...</span>
      </div>
    );
  }

  if (bundles.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <Package className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-base">No offers yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first offer to get started.</p>
        </div>
        <AddBundleModal userId={userId} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Input
            placeholder="Search offers..."
            value={(table.getColumn("offerName")?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn("offerName")?.setFilterValue(e.target.value)}
            className="max-w-xs h-9"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="capitalize"
                    checked={col.getIsVisible()}
                    onCheckedChange={(value) => col.toggleVisibility(!!value)}
                  >
                    {col.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <AddBundleModal userId={userId} />
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground text-sm">
                  No offers match your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-1">
        <p className="text-xs text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length > 0
            ? `${table.getFilteredSelectedRowModel().rows.length} of ${table.getFilteredRowModel().rows.length} selected`
            : `${table.getFilteredRowModel().rows.length} offer${table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}`}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>

      {editingBundle && (
        <EditBundleModal bundle={editingBundle} onClose={() => setEditingBundle(null)} />
      )}
    </div>
  );
}
