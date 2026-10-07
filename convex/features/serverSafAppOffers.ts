import { mutation, query, MutationCtx } from "../_generated/server";
import { v } from "convex/values";

// Admin-managed recipes for buying a bundle through the My Safaricom app (SafApp).
const stepValidator = v.object({
  stepIndex: v.number(),
  action: v.string(),
  target: v.optional(v.string()),
  button: v.optional(v.string()),
  value: v.optional(v.string()),
  timeoutMs: v.optional(v.number()),
});

type Step = {
  stepIndex: number;
  action: string;
  target?: string;
  button?: string;
  value?: string;
  timeoutMs?: number;
};

const OFFER_TYPES = ["Data", "SMS", "Minutes", "Airtime", "Bundles", "Other"];

const REQUIRED_FIELDS: Record<string, ("target" | "button" | "value")[]> = {
  TAP: ["target"],
  TAP_ROW: ["target", "button"],
  TYPE: ["value"],
  WAIT_FOR: ["target"],
  VERIFY: ["value"],
  SCROLL_UNTIL: ["target"],
  READ_RESULT: [],
};

async function requireAdmin(ctx: MutationCtx, requestingUserId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_user_id", (q) => q.eq("userId", requestingUserId))
    .first();
  if (!user?.isAdmin) throw new Error("Unauthorized");
}

function checkAndNormalize(name: string, price: number, offerType: string, steps: Step[]): Step[] {
  if (!name.trim()) throw new Error("Name is required");
  if (!(price > 0)) throw new Error("Price must be greater than 0");
  if (!OFFER_TYPES.includes(offerType)) {
    throw new Error(`Type must be one of: ${OFFER_TYPES.join(", ")}`);
  }
  if (steps.length === 0) throw new Error("Add at least one step");
  if (steps.length > 60) throw new Error("Too many steps (max 60)");

  return steps.map((s, i) => {
    if (!Object.prototype.hasOwnProperty.call(REQUIRED_FIELDS, s.action)) {
      throw new Error(`Step ${i + 1}: unknown action "${s.action}"`);
    }
    for (const field of REQUIRED_FIELDS[s.action]) {
      if (!s[field]?.trim()) throw new Error(`Step ${i + 1} (${s.action}): "${field}" is required`);
    }
    const step: Step = { stepIndex: i, action: s.action };
    if (s.target?.trim()) step.target = s.target.trim();
    if (s.button?.trim()) step.button = s.button.trim();
    if (s.value?.trim()) step.value = s.value.trim();
    if (s.timeoutMs !== undefined && s.timeoutMs > 0) step.timeoutMs = s.timeoutMs;
    return step;
  });
}

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("serverSafAppOffers").order("desc").collect();
  },
});

export const getAllActive = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("serverSafAppOffers")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const create = mutation({
  args: {
    requestingUserId: v.string(),
    name: v.string(),
    price: v.number(),
    offerType: v.string(),
    steps: v.array(stepValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.requestingUserId);
    const steps = checkAndNormalize(args.name, args.price, args.offerType, args.steps);
    return ctx.db.insert("serverSafAppOffers", {
      name: args.name.trim(),
      price: args.price,
      offerType: args.offerType,
      isActive: true,
      createdAt: Date.now(),
      createdBy: args.requestingUserId,
      steps,
    });
  },
});

export const update = mutation({
  args: {
    requestingUserId: v.string(),
    id: v.id("serverSafAppOffers"),
    name: v.string(),
    price: v.number(),
    offerType: v.string(),
    isActive: v.boolean(),
    steps: v.array(stepValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.requestingUserId);
    const steps = checkAndNormalize(args.name, args.price, args.offerType, args.steps);
    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      price: args.price,
      offerType: args.offerType,
      isActive: args.isActive,
      steps,
    });
  },
});

export const remove = mutation({
  args: { requestingUserId: v.string(), id: v.id("serverSafAppOffers") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.requestingUserId);
    await ctx.db.delete(args.id);
  },
});

export const toggleActive = mutation({
  args: {
    requestingUserId: v.string(),
    id: v.id("serverSafAppOffers"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.requestingUserId);
    await ctx.db.patch(args.id, { isActive: args.isActive });
  },
});
