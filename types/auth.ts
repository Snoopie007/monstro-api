
export type BaseUser = {
  id: string; // UUID from database
  name: string;
  email: string;
  image?: string | null; // Optional, can be null
  emailVerified?: Date | null;
  role: string;
  phone: string | null;
  apiToken?: string;
};

export type ExtendedUser = BaseUser & {

  memberId?: string | null;
};


export type ExtendedVendorUser = ExtendedUser & {
  vendorId: string;
};

export type AuthAdditionalData = {
  migrateId?: string | null;
  ref?: string | null;
  lid?: string | null;
};