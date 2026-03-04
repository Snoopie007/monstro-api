import { JWT } from "google-auth-library";

// Simple referral code generator
export function generateReferralCode(): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let result = "";
	for (let i = 0; i < 8; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
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

