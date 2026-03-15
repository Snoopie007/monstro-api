
export function generateOtp(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate username from name (Discord-style)
export function generateUsername(name: string): string {
	const cleaned = (name || "user")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "")
		.substring(0, 32);
	return cleaned.length >= 2 ? cleaned : `${cleaned}user`;
}

export const MEMBER_AUTH_COLUMNS = {
	id: true,
	email: true,
	firstName: true,
	lastName: true,
	setupCompleted: true,
	phone: true,
	referralCode: true,
	familyInviteCode: true,
} as const;

export const USER_AUTH_COLUMNS = {
	id: true,
	username: true,
	discriminator: true,
	email: true,
	image: true,
	isChild: true,
} as const;

