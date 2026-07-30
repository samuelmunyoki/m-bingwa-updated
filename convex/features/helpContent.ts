import { mutation, query, MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Every write to this table (add/edit/delete/reorder of any block — text,
// image, or video) must go through this check. Regular users may only ever
// read (see getAll below).
async function assertAdmin(ctx: MutationCtx, requestingUserId: string) {
  const requestingUser = await ctx.db
    .query("users")
    .withIndex("by_user_id", (q) => q.eq("userId", requestingUserId))
    .first();
  if (!requestingUser?.isAdmin) throw new Error("Unauthorized");
}

export const generateUploadUrl = mutation({
  args: { requestingUserId: v.string() },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.requestingUserId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const blocks = await ctx.db.query("helpContent").withIndex("by_order").collect();
    return Promise.all(
      blocks.map(async (block) => ({
        ...block,
        url: block.storageId ? await ctx.storage.getUrl(block.storageId) : null,
      }))
    );
  },
});

export const addBlock = mutation({
  args: {
    requestingUserId: v.string(),
    type: v.union(v.literal("heading"), v.literal("text"), v.literal("image"), v.literal("video")),
    content: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.requestingUserId);

    const last = await ctx.db.query("helpContent").withIndex("by_order").order("desc").first();
    const nextOrder = (last?.order ?? -1) + 1;
    const now = Date.now();

    return await ctx.db.insert("helpContent", {
      type: args.type,
      content: args.content,
      storageId: args.storageId,
      caption: args.caption,
      order: nextOrder,
      createdBy: args.requestingUserId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateBlock = mutation({
  args: {
    requestingUserId: v.string(),
    id: v.id("helpContent"),
    content: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.requestingUserId);

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Block not found");

    // Replacing the attached file — delete the old one so storage doesn't leak
    if (args.storageId && existing.storageId && args.storageId !== existing.storageId) {
      await ctx.storage.delete(existing.storageId);
    }

    await ctx.db.patch(args.id, {
      content: args.content ?? existing.content,
      storageId: args.storageId ?? existing.storageId,
      caption: args.caption ?? existing.caption,
      updatedAt: Date.now(),
    });
  },
});

export const deleteBlock = mutation({
  args: {
    requestingUserId: v.string(),
    id: v.id("helpContent"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.requestingUserId);

    const existing = await ctx.db.get(args.id);
    if (!existing) return;

    if (existing.storageId) {
      await ctx.storage.delete(existing.storageId);
    }
    await ctx.db.delete(args.id);
  },
});

export const reorderBlocks = mutation({
  args: {
    requestingUserId: v.string(),
    orderedIds: v.array(v.id("helpContent")),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.requestingUserId);

    await Promise.all(
      args.orderedIds.map((id: Id<"helpContent">, index: number) =>
        ctx.db.patch(id, { order: index, updatedAt: Date.now() })
      )
    );
  },
});
