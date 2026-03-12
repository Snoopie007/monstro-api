
// Simple referral code generator
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateCode(length: number = 8): string {
	let result = "";
	for (let i = 0; i < length; i++) {
		result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
	}
	return result;
}

export function generateReferralCode(): string {
	return generateCode();
}

// Family invite code generator (same pattern, separate field)
export function generateFamilyInviteCode(): string {
	return generateCode(6);
}


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

// Generate random 4-digit discriminator (0-9999)
export function generateDiscriminator(): number {
	return Math.floor(Math.random() * 10000);
}

