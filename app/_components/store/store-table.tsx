"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Store, AlertTriangle, ClipboardCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddStoreModal } from "@/components/ui/add-store-modal";
import { EditStoreModal } from "@/components/ui/edit-store-modal";
import { IconClipboard, IconCopy, IconStarFilled } from "@tabler/icons-react";
import Link from "next/link";

export function StoreDashboard({ userId }: { userId: string }) {
  const store = useQuery(api.features.stores.getStore, { userId });
  const deleteStore = useMutation(api.features.stores.deleteStore);

  const [isCopied, setIsCopied] = React.useState(false);

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this store?")) {
      try {
        await deleteStore({ userId });
        toast.success("Store deleted successfully");
      } catch (error) {
        toast.error("An error occurred");
      }
    }
  };

  if (store === undefined) {
    return (
      <div className="flex flex-col justify-center items-center w-full h-[200px]">
        <div className="flex flex-row gap-2 justify-center h-full items-center">
          <svg
            aria-hidden="true"
            className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-neutral-500"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
              fill="currentColor"
            />
            <path
              d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
              fill="currentFill"
            />
          </svg>
          <span className="text-neutral-500 ">Loading ...</span>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="w-full mx-auto p-4 h-full ">
        <div className="flex flex-col items-center justify-center mt-3 space-y-4 text-center">
          <IconStarFilled className="h-12 w-12 text-yellow-400" />
          <h2 className="text-2xl font-bold">Get started!</h2>
          <p className="text-muted-foreground">
            You don't have a store yet. Create one to get started!
          </p>
          <AddStoreModal userId={userId} onStoreCreated={() => {}} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto p-3 lg bg-background">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl ">Your Store</h2>
        <Store className="h-6 w-6 text-neutral-500" />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-neutral-100/90 hover:bg-neutral-100/90">
              <TableHead>Store Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment Account</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Store Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">{store.storeName}</TableCell>
              <TableCell>
                <span
                  className={`capitalize ${store.status === "available" ? "text-green-600" : "text-red-600"}`}
                >
                  {store.status}
                </span>
                {(store.status === "disabled" ||
                  store.status === "maintenance") &&
                  store.statusDescription && (
                    <p
                      className="text-sm text-muted-foreground mt-1 max-w-[100px] lg:max-w-[200px]  truncate"
                      title={store.statusDescription}
                    >
                      {store.statusDescription}
                    </p>
                  )}
              </TableCell>
              <TableCell>{store.paymentAccount}</TableCell>
              <TableCell>{store.paymentMethod}</TableCell>
              <TableCell className="flex items-center">
                <Link
                  className="text-blue-400 decoration-cyan-500"
                  href={`http://${store.storeName}.m-bingwa.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {store.storeName}.m-bingwa.com
                </Link>

                <span
                  className="ml-1"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${store.storeName}.m-bingwa.com`
                    );
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
                  }}
                >
                  {isCopied ? (
                    <ClipboardCheck className="text-blue-400 dark:text-neutral-200 h-4 w-4 flex-shrink-0" />
                  ) : (
                    <IconClipboard className="text-neutral-700 dark:text-neutral-200 h-4 w-4 flex-shrink-0" />
                  )}
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-6">
        <EditStoreModal
          userId={userId}
          store={store}
          onStoreUpdated={() => {}}
        />
        <Button variant="destructive" onClick={handleDelete}>
          Delete Store
        </Button>
      </div>
    </div>
  );
}
