"use client";
import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type TokenBundle = {
  _id: Id<"tokenBundles">;
  name: string;
  price: number;
  tokens: number;
  description?: string;
  isActive: boolean;
};

export default function TokenBundlesMain() {
  const bundles = useQuery(api.features.tokenBundles.getAllTokenBundles, {});
  const createBundle = useMutation(api.features.tokenBundles.createTokenBundle);
  const updateBundle = useMutation(api.features.tokenBundles.updateTokenBundle);
  const removeBundle = useMutation(api.features.tokenBundles.deleteTokenBundle);

  const [showForm, setShowForm] = useState(false);
  const [editingBundle, setEditingBundle] = useState<TokenBundle | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [tokens, setTokens] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setName(""); setPrice(""); setTokens(""); setDescription("");
    setEditingBundle(null); setError("");
  };

  const openCreate = () => { resetForm(); setShowForm(true); };

  const openEdit = (bundle: TokenBundle) => {
    setEditingBundle(bundle);
    setName(bundle.name);
    setPrice(String(bundle.price));
    setTokens(String(bundle.tokens));
    setDescription(bundle.description ?? "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !price || !tokens) {
      setError("Name, price and token count are required."); return;
    }
    if (parseFloat(price) <= 0) {
      setError("Price must be greater than 0."); return;
    }
    if (parseInt(tokens, 10) <= 0) {
      setError("Token count must be greater than 0."); return;
    }
    setSaving(true); setError("");
    try {
      const payload = {
        name: name.trim(),
        price: parseFloat(price),
        tokens: parseInt(tokens, 10),
        description: description.trim() || undefined,
      };
      if (editingBundle) {
        await updateBundle({ tokenBundleId: editingBundle._id, isActive: editingBundle.isActive, ...payload });
      } else {
        await createBundle(payload);
      }
      resetForm(); setShowForm(false);
    } catch (e: any) {
      setError(e.message ?? "Failed to save token bundle.");
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden px-1.5 md:px-0">
      <div className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col flex-1 w-full gap-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">
            Token Bundles
          </h2>
          <button
            onClick={openCreate}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            + New Bundle
          </button>
        </div>
        <div className="flex flex-col gap-4 flex-1 overflow-y-auto">

      {/* Form */}
      {showForm && (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-900 flex flex-col gap-3">
          <h3 className="font-medium text-neutral-700 dark:text-neutral-200">
            {editingBundle ? "Edit Bundle" : "New Bundle"}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs text-neutral-500">Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm dark:bg-neutral-800 dark:border-neutral-600"
                placeholder="e.g. 300 USSD Requests" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">Price (KES)</label>
              <input value={price} onChange={e => setPrice(e.target.value)} type="number"
                className="border rounded px-2 py-1.5 text-sm dark:bg-neutral-800 dark:border-neutral-600"
                placeholder="e.g. 50" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">Tokens</label>
              <input value={tokens} onChange={e => setTokens(e.target.value)} type="number"
                className="border rounded px-2 py-1.5 text-sm dark:bg-neutral-800 dark:border-neutral-600"
                placeholder="e.g. 300" />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs text-neutral-500">Description (optional)</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm dark:bg-neutral-800 dark:border-neutral-600"
                placeholder="e.g. 1 Ksh=6 USSDs" />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => { resetForm(); setShowForm(false); }}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving..." : editingBundle ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Bundle list */}
      <div className="flex flex-col gap-2">
        {bundles === undefined && <p className="text-sm text-neutral-400">Loading...</p>}
        {bundles?.length === 0 && <p className="text-sm text-neutral-400">No token bundles yet.</p>}
        {bundles?.map(bundle => (
          <div key={bundle._id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate">{bundle.name}</p>
                  <p className="text-xs text-neutral-400 truncate">KES {bundle.price} · {bundle.tokens} tokens{bundle.description ? ` · ${bundle.description}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => updateBundle({
                    tokenBundleId: bundle._id,
                    name: bundle.name,
                    price: bundle.price,
                    tokens: bundle.tokens,
                    description: bundle.description,
                    isActive: !bundle.isActive,
                  })}
                  className={`text-xs px-2 py-1 rounded-full font-medium ${bundle.isActive ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                  {bundle.isActive ? "Active" : "Inactive"}
                </button>
                <button onClick={() => openEdit(bundle as TokenBundle)}
                  className="text-xs text-neutral-500 hover:text-neutral-700">Edit</button>
                <button onClick={() => removeBundle({ tokenBundleId: bundle._id })}
                  className="text-xs text-red-500 hover:underline">Delete</button>
              </div>
            </div>
          </div>
        ))}
        </div>
        </div>
      </div>
    </div>
  );
}
