"use client";
import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const OFFER_TYPES = ["Data", "SMS", "Minutes", "Custom"];
const STEP_TYPES = ["SELECT", "INPUT"];
const INPUT_MODES = ["NORMAL", "AGGRESSIVE"];

type Step = {
  stepIndex: number;
  inputKey: string;
  inputValue: string;
  pattern: string;
  type: string;
  inputMode: string;
};

const emptyStep = (): Step => ({
  stepIndex: 0,
  inputKey: "",
  inputValue: "",
  pattern: "",
  type: "SELECT",
  inputMode: "NORMAL",
});

type Offer = {
  _id: Id<"serverPatternOffers">;
  name: string;
  price: number;
  ussdBaseCode: string;
  offerType: string;
  isActive: boolean;
  steps: Step[];
};

export default function PatternOffersMain({ userId }: { userId: string }) {
  const offers = useQuery(api.features.serverPatternOffers.getAll, {});
  const createOffer = useMutation(api.features.serverPatternOffers.create);
  const updateOffer = useMutation(api.features.serverPatternOffers.update);
  const removeOffer = useMutation(api.features.serverPatternOffers.remove);
  const toggleActive = useMutation(api.features.serverPatternOffers.toggleActive);

  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [ussdBaseCode, setUssdBaseCode] = useState("");
  const [offerType, setOfferType] = useState("Data");
  const [steps, setSteps] = useState<Step[]>([emptyStep()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setName(""); setPrice(""); setUssdBaseCode(""); setOfferType("Data");
    setSteps([emptyStep()]); setEditingOffer(null); setError("");
  };

  const openCreate = () => { resetForm(); setShowForm(true); };

  const openEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setName(offer.name);
    setPrice(String(offer.price));
    setUssdBaseCode(offer.ussdBaseCode);
    setOfferType(offer.offerType);
    setSteps(offer.steps.map(s => ({ ...s, pattern: s.pattern ?? "" })));
    setShowForm(true);
  };

  const addStep = () => setSteps(s => [...s, { ...emptyStep(), stepIndex: s.length }]);

  const removeStep = (i: number) =>
    setSteps(s => s.filter((_, idx) => idx !== i).map((st, idx) => ({ ...st, stepIndex: idx })));

  const updateStep = (i: number, field: keyof Step, value: string) =>
    setSteps(s => s.map((st, idx) => idx === i ? { ...st, [field]: value } : st));

  const handleSave = async () => {
    if (!name.trim() || !price || !ussdBaseCode.trim()) {
      setError("Name, price and USSD code are required."); return;
    }
    if (steps.some(s => !s.inputKey.trim() || !s.inputValue.trim())) {
      setError("Each step needs a label and fallback value."); return;
    }
    setSaving(true); setError("");
    try {
      const payload = {
        name: name.trim(),
        price: parseFloat(price),
        ussdBaseCode: ussdBaseCode.trim(),
        offerType,
        steps: steps.map((s, i) => ({
          stepIndex: i,
          inputKey: s.inputKey.trim(),
          inputValue: s.inputValue.trim(),
          pattern: s.pattern.trim() || undefined,
          type: s.type,
          inputMode: s.inputMode,
        })),
      };
      if (editingOffer) {
        await updateOffer({ id: editingOffer._id, isActive: editingOffer.isActive, ...payload });
      } else {
        await createOffer({ ...payload, createdBy: userId });
      }
      resetForm(); setShowForm(false);
    } catch (e: any) {
      setError(e.message ?? "Failed to save offer.");
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-4 p-4 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">
          Pattern Offers
        </h2>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          + New Offer
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-900 flex flex-col gap-3">
          <h3 className="font-medium text-neutral-700 dark:text-neutral-200">
            {editingOffer ? "Edit Offer" : "New Offer"}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm dark:bg-neutral-800 dark:border-neutral-600"
                placeholder="e.g. Daily SMS Bundle" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">Price (KES)</label>
              <input value={price} onChange={e => setPrice(e.target.value)} type="number"
                className="border rounded px-2 py-1.5 text-sm dark:bg-neutral-800 dark:border-neutral-600"
                placeholder="e.g. 5" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">Base USSD Code</label>
              <input value={ussdBaseCode} onChange={e => setUssdBaseCode(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm dark:bg-neutral-800 dark:border-neutral-600"
                placeholder="e.g. *188#" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">Type</label>
              <select value={offerType} onChange={e => setOfferType(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm dark:bg-neutral-800 dark:border-neutral-600">
                {OFFER_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Steps</label>
              <button onClick={addStep}
                className="text-xs text-blue-600 hover:underline">+ Add Step</button>
            </div>
            {steps.map((step, i) => (
              <div key={i} className="border border-neutral-200 dark:border-neutral-700 rounded p-3 flex flex-col gap-2 bg-neutral-50 dark:bg-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-500">Step {i + 1}</span>
                  {steps.length > 1 && (
                    <button onClick={() => removeStep(i)} className="text-xs text-red-500 hover:underline">Remove</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-500">Label</label>
                    <input value={step.inputKey} onChange={e => updateStep(i, "inputKey", e.target.value)}
                      className="border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-neutral-600"
                      placeholder="e.g. Gift SMS" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-500">Fallback value</label>
                    <input value={step.inputValue} onChange={e => updateStep(i, "inputValue", e.target.value)}
                      className="border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-neutral-600"
                      placeholder='e.g. 1 or {phone}' />
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-xs text-neutral-500">Pattern (regex) — optional</label>
                    <input value={step.pattern} onChange={e => updateStep(i, "pattern", e.target.value)}
                      className="border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-neutral-600 font-mono"
                      placeholder='e.g. (\d+).*Gift.*sms' />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-500">Type</label>
                    <select value={step.type} onChange={e => updateStep(i, "type", e.target.value)}
                      className="border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-neutral-600">
                      {STEP_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-500">Input Mode</label>
                    <select value={step.inputMode} onChange={e => updateStep(i, "inputMode", e.target.value)}
                      className="border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-neutral-600">
                      {INPUT_MODES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
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

      {/* Offer list */}
      <div className="flex flex-col gap-2">
        {offers === undefined && <p className="text-sm text-neutral-400">Loading...</p>}
        {offers?.length === 0 && <p className="text-sm text-neutral-400">No pattern offers yet.</p>}
        {offers?.map(offer => (
          <div key={offer._id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{offer.name}</p>
                  <p className="text-xs text-neutral-400">{offer.ussdBaseCode} · KES {offer.price} · {offer.offerType} · {offer.steps.length} step{offer.steps.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive({ id: offer._id, isActive: !offer.isActive })}
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
                <button onClick={() => removeOffer({ id: offer._id })}
                  className="text-xs text-red-500 hover:underline">Delete</button>
              </div>
            </div>

            {expandedId === offer._id && (
              <div className="border-t border-neutral-200 dark:border-neutral-700 px-4 py-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-neutral-400 text-left">
                      <th className="pb-1 pr-3">#</th>
                      <th className="pb-1 pr-3">Label</th>
                      <th className="pb-1 pr-3">Fallback</th>
                      <th className="pb-1 pr-3">Pattern</th>
                      <th className="pb-1 pr-3">Type</th>
                      <th className="pb-1">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offer.steps.map((s, i) => (
                      <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800">
                        <td className="py-1 pr-3 text-neutral-400">{i + 1}</td>
                        <td className="py-1 pr-3 text-neutral-700 dark:text-neutral-300">{s.inputKey}</td>
                        <td className="py-1 pr-3 font-mono text-neutral-600 dark:text-neutral-400">{s.inputValue}</td>
                        <td className="py-1 pr-3 font-mono text-neutral-500 max-w-[200px] truncate">{s.pattern ?? "—"}</td>
                        <td className="py-1 pr-3 text-neutral-500">{s.type}</td>
                        <td className="py-1 text-neutral-500">{s.inputMode}</td>
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
  );
}
