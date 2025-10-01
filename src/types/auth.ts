

export type BaseUser = {
  id: string; // UUID from database
  name: string;
  email: string;
  image?: string | null; // Optional, can be null
  emailVerified?: Date | null;
  role: string;
  stripeCustomerId: string | null;
  phone: string | null;
  sbToken?: string;
};

export type ExtendedUser = BaseUser & {

  memberId?: string | null;
};


export type ExtendedVendorUser = ExtendedUser & {
  vendorId: string;
};
