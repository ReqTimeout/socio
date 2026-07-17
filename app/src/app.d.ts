import type { Session, User } from "better-auth/types";

declare global {
  namespace App {
    interface Locals {
      session: Session | null;
      user: User | null;
    }
    // PageData global is intentionally empty; per-route PageData is generated
    // from each load function. Avoid declaring required fields here or every
    // load must return them.
    interface PageData {}
  }
}

export {};
