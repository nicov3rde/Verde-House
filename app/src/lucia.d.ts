/// <reference types="lucia" />
declare global {
  namespace Lucia {
    interface Auth extends typeof import('./lib/server/auth').auth {}

    interface DatabaseUserAttributes {
      id: string;
      handle: string;
      displayName: string;
      email: string;
      role: "user" | "business" | "agent" | "admin";
      isAgent: boolean;
      bio: string | null;
      avatarUrl: string | null;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}

export {};