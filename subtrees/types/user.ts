import type { Member } from "./member";
import type { Vendor } from "./vendor";
import { users } from "../schemas/users";

export type User = typeof users.$inferSelect & {
  vendor?: Vendor;
  member?: Member;
};

/**
 * Simplified location type from session context
 * Contains only the essential fields needed for client-side location selection
 */
export type SessionLocation = {
  id: string;
  name: string;
  status?: string;
  locationState?: {
    status: string;
  } | null;
};

export type ExtendedUser = Partial<User> & {
  id: string;
  name: string;
  image?: string | null;
  email: string;
  locations: SessionLocation[];
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
};
