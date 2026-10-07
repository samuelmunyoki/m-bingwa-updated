"use client";
import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Admin page for writing SafApp recipes (steps for buying a bundle through the My Safaricom app).
const OFFER_TYPES = ["Data", "SMS", "Minutes", "Airtime", "Bundles", "Other"];

type Field = "target" | "button" | "value";

const ACTIONS: Record<string, { fields: Field[]; timeout: boolean; hint: string }> = {
  TAP: { fields: ["target"], timeout: false, hint: "Tap the element showing this text" },
  TAP_ROW: { fields: ["target", "button"], timeout: false, hint: 'Tap the button on the row showing this text, e.g. row "Ksh 250", button "BUY"' },
  TYPE: { fields: ["value"], timeout: false, hint: "Type into the text field, e.g. {recipient}" },
  WAIT_FOR: { fields: ["target"], timeout: true, hint: "Wait until this text is on screen" },
  VERIFY: { fields: ["value"], timeout: false, hint: "Screen must contain all of these, separated by |, e.g. {recipient}|250" },
  SCROLL_UNTIL: { fields: ["target"], timeout: true, hint: "Scroll the list until this text is visible" },
  READ_RESULT: { fields: [], timeout: true, hint: "Wait for the result dialog (CLOSE button) and read its message" },
};

const ACTION_NAMES = Object.keys(ACTIONS);

const UNKNOWN_ACTION = { fields: [] as Field[], timeout: false, hint: "Unknown action — change or remove this step" };

type Step = {
  action: string;
  target: string;
  button: string;
  value: string;
  timeoutMs: string;
};

const emptyStep = (): Step => ({ action: "TAP", target: "", button: "", value: "", timeoutMs: "" });

type SavedStep = {
  stepIndex: number;
  action: string;
  target?: string;
  button?: string;
  value?: string;
  timeoutMs?: number;
};

type Offer = {
  _id: Id<"serverSafAppOffers">;
  name: string;
  price: number;
  offerType: string;
  isActive: boolean;
  steps: SavedStep[];
};

const fieldLabel = (action: string, field: Field) => {
  if (field === "target") return action === "TAP_ROW" ? "Row text" : "Text";
  if (field === "button") return "Button text";
  return action === "VERIFY" ? "Must contain (separate with |)" : "Text to type";
};

export default function SafAppOffersMain({ userId }: { userId: string }) {
  const offers = useQuery(api.features.serverSafAppOffers.getAll, {});
  const createOffer = useMutation(api.features.serverSafAppOffers.create);
  const updateOffer = useMutation(api.features.serverSafAppOffers.update);
  const removeOffer = useMutation(api.features.serverSafAppOffers.remove);
  const toggleActive = useMutation(api.features.serverSafAppOffers.toggleActive);

  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [offerType, setOfferType] = useState("Minutes");
  const [steps, setSteps] = useState<Step[]>([emptyStep()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");

  const runAction = async (fn: () => Promise<unknown>) => {
    setListError("");
    try { await fn(); } catch (e: any) { setListError(e.message ?? "Action failed."); }
  };

  const resetForm = () => {
    setName(""); setPrice(""); setOfferType("Minutes");
    setSteps([emptyStep()]); setEditingOffer(null); setError("");
  };

  const openCreate = () => { resetForm(); setShowForm(true); };

  const openEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setName(offer.name);
    setPrice(String(offer.price));
    setOfferType(offer.offerType);
    setSteps(offer.steps.map(s => ({
      action: s.action,
      target: s.target ?? "",
      button: s.button ?? "",
      value: s.value ?? "",
      timeoutMs: s.timeoutMs !== undefined ? String(s.timeoutMs) : "",
    })));
    setShowForm(true);
  };

  const addStep = () => setSteps(s => [...s, emptyStep()]);
  const removeStep = (i: number) => setSteps(s => s.filter((_, idx) => idx !== i));
  const updateStep = (i: number, field: keyof Step, value: string) =>
    setSteps(s => s.map((st, idx) => idx === i ? { ...st, [field]: value } : st));

  const handleSave = async () => {
    if (!name.trim() || !price) { setError("Name and price are required."); return; }
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (!ACTIONS[s.action]) { setError(`Step ${i + 1}: unknown action "${s.action}".`); return; }
      for (const f of ACTIONS[s.action].fields) {
        if (!s[f].trim()) { setError(`Step ${i + 1} (${s.action}): "${fieldLabel(s.action, f)}" is required.`); return; }
      }
    }
    setSaving(true); setError("");
    try {
      const payload = {
        requestingUserId: userId,
        name: name.trim(),
        price: parseFloat(price),
        offerType,
        steps: steps.map((s, i) => {
          const fields = ACTIONS[s.action].fields;
          const timeout = parseInt(s.timeoutMs);
          return {
            stepIndex: i,
            action: s.action,
            target: fields.includes("target") ? s.target.trim() : undefined,
            button: fields.includes("button") ? s.button.trim() : undefined,
            value: fields.includes("value") ? s.value.trim() : undefined,
            timeoutMs: ACTIONS[s.action].timeout && timeout > 0 ? timeout : undefined,
          };
        }),
      };
      if (editingOffer) {
        const currentActive = offers?.find(o => o._id === editingOffer._id)?.isActive ?? editingOffer.isActive;
        await updateOffer({ id: editingOffer._id, isActive: currentActive, ...payload });
      } else {
        await createOffer(payload);
      }
      resetForm(); setShowForm(false);
    } catch (e: any) {
      setError(e.message ?? "Failed to save offer.");
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden px-1.5 md:px-0">
      <div className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col flex-1 w-full gap-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">
            SafApp Offers
          </h2>
          <button
            onClick={openCreate}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            + New Offer
          </button>
        </div>
        <div className="flex flex-col gap-4 flex-1 overflow-y-auto">

          {showForm && (
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-900 flex flex-col gap-3">
              <h3 className="font-medium text-neutral-700 dark:text-neutral-200">
                {editingOffer ? "Edit Offer" : "New Offer"}
              </h3>
              <p className="text-xs text-neutral-500">
                Every run starts with a fresh launch of My Safaricom from its home screen, so do not add a launch step.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-500">Name</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    className="border rounded px-2 py-1.5 text-sm dark:bg-neutral-800 dark:border-neutral-600"
                    placeholder="e.g. Easy Talk 200 mins + 200 SMS" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-500">Price (KES)</label>
                  <input value={price} onChange={e => setPrice(e.target.value)} type="number"
                    className="border rounded px-2 py-1.5 text-sm dark:bg-neutral-800 dark:border-neutral-600"
                    placeholder="e.g. 250" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-500">Type</label>
                  <select value={offerType} onChange={e => setOfferType(e.target.value)}
                    className="border rounded px-2 py-1.5 text-sm dark:bg-neutral-800 dark:border-neutral-600">
                    {OFFER_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Steps</label>
                  <button onClick={addStep} className="text-xs text-blue-600 hover:underline">+ Add Step</button>
                </div>
                {steps.map((step, i) => {
                  const def = ACTIONS[step.action] ?? UNKNOWN_ACTION;
                  return (
                    <div key={i} className="border border-neutral-200 dark:border-neutral-700 rounded p-3 flex flex-col gap-2 bg-neutral-50 dark:bg-neutral-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-neutral-500">Step {i + 1}</span>
                        {steps.length > 1 && (
                          <button onClick={() => removeStep(i)} className="text-xs text-red-500 hover:underline">Remove</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1 col-span-2">
                          <label className="text-xs text-neutral-500">Action</label>
                          <select value={step.action} onChange={e => updateStep(i, "action", e.target.value)}
                            className="border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-neutral-600">
                            {ACTION_NAMES.map(a => <option key={a}>{a}</option>)}
                          </select>
                          <span className="text-xs text-neutral-400">{def.hint}</span>
                        </div>
                        {def.fields.map(f => (
                          <div key={f} className="flex flex-col gap-1">
                            <label className="text-xs text-neutral-500">{fieldLabel(step.action, f)}</label>
                            <input value={step[f]} onChange={e => updateStep(i, f, e.target.value)}
                              className="border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-neutral-600" />
                          </div>
                        ))}
                        {def.timeout && (
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-neutral-500">Timeout (ms) — optional</label>
                            <input value={step.timeoutMs} onChange={e => updateStep(i, "timeoutMs", e.target.value)} type="number"
                              className="border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-neutral-600"
                              placeholder="e.g. 5000" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button onClick={() => { resetForm(); setShowForm(false); }}
                  className="px-3 py-1.5 text-sm border rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Saving..." : editingOffer ? "Update" : "Create"}
                </button>
              </div>
            </div>
          )}

          {listError && <p className="text-sm text-red-500">{listError}</p>}

          <div className="flex flex-col gap-2">
            {offers === undefined && <p className="text-sm text-neutral-400">Loading...</p>}
            {offers?.length === 0 && <p className="text-sm text-neutral-400">No SafApp offers yet.</p>}
            {offers?.map(offer => (
              <div key={offer._id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate">{offer.name}</p>
                    <p className="text-xs text-neutral-400 truncate">KES {offer.price} · {offer.offerType} · {offer.steps.length} step{offer.steps.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => runAction(() => toggleActive({ requestingUserId: userId, id: offer._id, isActive: !offer.isActive }))}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${offer.isActive ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                      {offer.isActive ? "Active" : "Inactive"}
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === offer._id ? null : offer._id)}
                      className="text-xs text-blue-600 hover:underline">
                      {expandedId === offer._id ? "Hide" : "View"}
                    </button>
                    <button onClick={() => openEdit(offer as unknown as Offer)}
                      className="text-xs text-neutral-500 hover:text-neutral-700">Edit</button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${offer.name}"? Offers that use it will stop working.`)) {
                          runAction(() => removeOffer({ requestingUserId: userId, id: offer._id }));
                        }
                      }}
                      className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </div>

                {expandedId === offer._id && (
                  <div className="border-t border-neutral-200 dark:border-neutral-700 px-4 py-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-neutral-400 text-left">
                          <th className="pb-1 pr-3">#</th>
                          <th className="pb-1 pr-3">Action</th>
                          <th className="pb-1 pr-3">Text / Row</th>
                          <th className="pb-1 pr-3">Button</th>
                          <th className="pb-1 pr-3">Value</th>
                          <th className="pb-1">Timeout</th>
                        </tr>
                      </thead>
                      <tbody>
                        {offer.steps.map((s, i) => (
                          <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800">
                            <td className="py-1 pr-3 text-neutral-400">{i + 1}</td>
                            <td className="py-1 pr-3 text-neutral-700 dark:text-neutral-300">{s.action}</td>
                            <td className="py-1 pr-3 font-mono text-neutral-600 dark:text-neutral-400">{s.target ?? "—"}</td>
                            <td className="py-1 pr-3 font-mono text-neutral-600 dark:text-neutral-400">{s.button ?? "—"}</td>
                            <td className="py-1 pr-3 font-mono text-neutral-600 dark:text-neutral-400">{s.value ?? "—"}</td>
                            <td className="py-1 text-neutral-500">{s.timeoutMs ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
