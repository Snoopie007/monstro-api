export type UnifiedContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  type: 'member' | 'guest';
  botMetadata?: Record<string, any>;
  created: Date;
};

export type GuestContact = {
  id: string;
  locationId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  botMetadata: Record<string, any>;
  created: Date;
};

export type MemberContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  botMetadata: Record<string, any>;
  memberLocationId: string;
};