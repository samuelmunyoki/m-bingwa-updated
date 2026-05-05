"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Store, ClipboardCheck, ExternalLink, CreditCard, BadgeCheck, AlertTriangle, Wrench } from "lucide-react";
import { AddStoreModal } from "@/components/ui/add-store-modal";
import { EditStoreModal } from "@/components/ui/edit-store-modal";
import { IconClipboard, IconStarFilled } from "@tabler/icons-react";

export function StoreDashboard({ userId }: { userId: string }) {
  const store = useQuery(api.features.stores.getStore, { userId });
  const deleteStore = useMutation(api.features.stores.deleteStore);
  const [isCopied, setIsCopied] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    try {
      await deleteStore({ userId });
      toast.success("Store deleted successfully");
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${store?.storeName}.m-bingwa.com`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (store === undefined) {
    return (
      <div className="flex flex-col justify-center items-center w-full h-[200px]">
        <div className="flex flex-row gap-2 justify-center h-full items-center">
          <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-neutral-500" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
          </svg>
          <span className="text-neutral-500">Loading ...</span>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[300px] gap-4 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
          <Store className="h-8 w-8 text-neutral-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-700">No store yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create your store to start selling bundles online.</p>
        </div>
        <AddStoreModal userId={userId} onStoreCreated={() => {}} />
      </div>
    );
  }

  const statusConfig = {
    available: { label: "Active", icon: <BadgeCheck className="w-4 h-4 text-green-600" />, className: "text-green-700 bg-green-50 border-green-200" },
    disabled:  { label: "Disabled", icon: <AlertTriangle className="w-4 h-4 text-red-500" />, className: "text-red-700 bg-red-50 border-red-200" },
    maintenance: { label: "Maintenance", icon: <Wrench className="w-4 h-4 text-yellow-500" />, className: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  };
  const status = statusConfig[store.status as keyof typeof statusConfig] ?? statusConfig.available;

  return (
    <div className="w-full max-w-2xl flex flex-col gap-5">

      {/* Store Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
            <Store className="h-5 w-5 text-neutral-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-800">{store.storeName}</h2>
            <p className="text-xs text-muted-foreground">Store overview</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${status.className}`}>
          {status.icon}
          {status.label}
        </span>
      </div>

      {/* Status Description */}
      {(store.status === "disabled" || store.status === "maintenance") && store.statusDescription && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-neutral-50 border border-neutral-200">
          <AlertTriangle className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-neutral-600">{store.statusDescription}</p>
        </div>
      )}

      {/* Store Details */}
      <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CreditCard className="w-4 h-4" />
            Payment Method
          </div>
          <span className="text-sm font-medium text-neutral-700">{store.paymentMethod}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CreditCard className="w-4 h-4" />
            Payment Account
          </div>
          <span className="text-sm font-medium text-neutral-700">{store.paymentAccount}</span>
        </div>
      </div>

      {/* Store Link */}
      <div className="border border-neutral-200 rounded-lg p-4">
        <p className="text-xs text-gray-500 mb-2">Store Link</p>
        <div className="flex items-center justify-between gap-3 bg-neutral-50 rounded-md px-3 py-2 border border-neutral-100">
          <a
            href={`http://${store.storeName}.m-bingwa.com`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:underline flex items-center gap-1.5 truncate"
          >
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
            {store.storeName}.m-bingwa.com
          </a>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors"
            title="Copy link"
          >
            {isCopied
              ? <ClipboardCheck className="h-4 w-4 text-green-500" />
              : <IconClipboard className="h-4 w-4" />
            }
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <EditStoreModal userId={userId} store={store} onStoreUpdated={() => {}} />
        <Button
          variant={confirmDelete ? "destructive" : "outline"}
          onClick={handleDelete}
          className="transition-all"
        >
          {confirmDelete ? "Click again to confirm" : "Delete Store"}
        </Button>
      </div>

    </div>
  );
}
