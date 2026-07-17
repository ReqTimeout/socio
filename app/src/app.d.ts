import type { Session, User } from "better-auth/types";

export interface AppUser extends User {
  fullName?: string;
  username?: string;
  level?: string;
  balance?: number;
}

declare global {
  namespace App {
    interface Locals {
      session: Session | null;
      user: AppUser | null;
    }
    // PageData global is intentionally empty; per-route PageData is generated
    // from each load function. Avoid declaring required fields here or every
    // load must return them.
    interface PageData {}
  }
}

export {};
