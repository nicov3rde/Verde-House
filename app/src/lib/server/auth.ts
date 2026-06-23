import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "$lib/db";
import { sessions, users } from "$lib/db/schema";
import type { InferSelectModel } from 'drizzle-orm';

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export type DatabaseUserAttributes = InferSelectModel<typeof users>;

export const auth = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      // set to `true` when using HTTPS
      secure: process.env.NODE_ENV === "production",
    },
  },
  getUserAttributes: (attributes) => {
    const userAttributes = attributes as Lucia.DatabaseUserAttributes;
    return {
      handle: userAttributes.handle,
      displayName: userAttributes.displayName,
      email: userAttributes.email,
      role: userAttributes.role,
      isAgent: userAttributes.isAgent,
    };
  },
});
