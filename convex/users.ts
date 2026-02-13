import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (user === null) {
      throw new Error("User was deleted");
    }
    return user;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const result = await Promise.all(
      users.map(async (user) => {
        const sessions = await ctx.db
          .query("authSessions")
          .withIndex("userId", (q) => q.eq("userId", user._id))
          .collect();
        const activeSessions = sessions.filter(
          (s) => s.expirationTime > Date.now()
        ).length;
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          _creationTime: user._creationTime,
          activeSessions,
        };
      })
    );
    return result;
  },
});

export const getDetail = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) throw new Error("User not found");

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .collect();
    const activeSessions = sessions.filter(
      (s) => s.expirationTime > Date.now()
    );

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
      .collect();

    return {
      ...user,
      activeSessions: activeSessions.map((s) => ({
        _id: s._id,
        expirationTime: s.expirationTime,
      })),
      accounts: accounts.map((a) => ({
        provider: a.provider,
      })),
    };
  },
});

export const updateRole = mutation({
  args: { id: v.id("users"), role: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(args.id, { role: args.role });
  },
});

export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (args.id === userId) throw new Error("Cannot delete yourself");

    // Delete refresh tokens via sessions
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", args.id))
      .collect();
    for (const session of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of tokens) {
        await ctx.db.delete(token._id);
      }
      await ctx.db.delete(session._id);
    }

    // Delete auth accounts
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.id))
      .collect();
    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }

    // Delete user
    await ctx.db.delete(args.id);
  },
});
