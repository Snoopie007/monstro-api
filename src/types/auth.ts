
export type ExtendedUser = {
  id: string; // UUID from database
  name: string;
  email: string;
  image?: string | null; // Optional, can be null
  emailVerified?: Date | null;
  role?: string;
  stripeCustomerId?: string | null;
  phone?: string | null;
  token?: string;
  firstName?: string | null;
  lastName?: string | null;
  expireTime?: Date | null;
  memberId?: string | null;
  sbToken?: string;
};


