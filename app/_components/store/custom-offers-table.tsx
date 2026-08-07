"use client";

import * as React from "react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Package, Wifi, MessageSquare, Clock, Zap, Box, Sparkles } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { AddCustomOfferModal } from "@/components/ui/add-custom-offer-modal";
import { EditCustomOfferModal } from "@/components/ui/edit-custom-offer-modal";

type CustomOffer = {
  _id: Id<"customOffers">;
  _creationTime: number;
  userId: string;
  offerName: string;
  offerType: string;
  price: number;
  status: "available" | "disabled";
};

const offerTypeConfig: Record<string, { icon: React.ReactNode; className: string }> = {
  Data:    { icon: <Wifi className="h-3 w-3" />,           className: "bg-blue-100 text-blue-700 border-blue-200" },
  SMS:     { icon: <MessageSquare className="h-3 w-3" />,  className: "bg-red-100 text-red-700 border-red-200" },
  Minutes: { icon: <Clock className="h-3 w-3" />,          className: "bg-green-100 text-green-700 border-green-200" },
  Airtime: { icon: <Zap className="h-3 w-3" />,            className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  Bundles: { icon: <Box className="h-3 w-3" />,            className: "bg-purple-100 text-purple-700 border-purple-200" },
  Other:   { icon: <Package className="h-3 w-3" />,        className: "bg-gray-100 text-gray-700 border-gray-200" },
};

export function CustomOffersTable({ userId }: { userId: string }) {
  const customOffers = useQuery(api.features.customOffers.getCustomOffersByUserId, { userId });
  const toggleStatus = useMutation(api.features.customOffers.toggleCustomOfferStatusFromAPI);
  const deleteCustomOffer = useMutation(api.features.customOffers.deleteCustomOfferFromAPI);

  const [editingOffer, setEditingOffer] = React.useState<CustomOffer | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns: ColumnDef<CustomOffer>[] = [
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
        <span className="font-medium text-sm">{row.getValue("offerName")}</span>
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
      id: "actions",
      cell: ({ row }) => {
        const offer = row.original;
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
              <DropdownMenuItem onClick={() => setEditingOffer(offer)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await toggleStatus({ id: offer._id, userId });
                  toast.success(`Custom offer ${offer.status === "available" ? "disabled" : "enabled"}`);
                }}
                className={offer.status === "available" ? "text-orange-600" : "text-green-600"}
              >
                {offer.status === "available" ? "Disable" : "Enable"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this custom offer?")) {
                    deleteCustomOffer({ id: offer._id, userId });
                    toast.success("Custom offer deleted");
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

  const table = useReactTable({
    data: (customOffers as CustomOffer[]) || [],
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
  });

  if (customOffers === undefined) {
    return (
      <div className="flex items-center justify-center w-full h-32 gap-2 text-muted-foreground">
        <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        <span className="text-sm">Loading custom offers...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-neutral-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-neutral-700 truncate">Custom Offers</h3>
            <p className="text-xs text-muted-foreground">Only shown on your store link</p>
          </div>
        </div>
        <AddCustomOfferModal userId={userId} />
      </div>

      {customOffers.length === 0 ? (
        <div className="w-full flex flex-col items-center justify-center py-10 gap-3 border rounded-lg">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium text-sm">No custom offers yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">Create one to show it on your store link.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border overflow-auto">
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
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editingOffer && (
        <EditCustomOfferModal offer={editingOffer} onClose={() => setEditingOffer(null)} />
      )}
    </div>
  );
}
