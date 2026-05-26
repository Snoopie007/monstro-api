import { importPKCS8, SignJWT } from "jose";
/**
 * Generate Apple client secret JWT dynamically
 * Apple requires a fresh JWT signed with your private key for each auth request
 */
export async function generateAppleClientSecret(): Promise<string> {
    const teamId = process.env.APPLE_TEAM_ID!;
    const clientId = process.env.AUTH_APPLE_ID!;
    const keyId = process.env.APPLE_KEY_ID!;
    const privateKeyPEM = process.env.APPLE_PRIVATE_KEY!;

    // Import the private key
    const privateKey = await importPKCS8(privateKeyPEM, "ES256");

    const now = Math.floor(Date.now() / 1000);

    // Generate JWT with 5-minute expiration (fresh for each request)
    const jwt = await new SignJWT({})
        .setProtectedHeader({ alg: "ES256", kid: keyId })
        .setIssuer(teamId)
        .setSubject(clientId)
        .setAudience("https://appleid.apple.com")
        .setIssuedAt(now)
        .setExpirationTime(now + 5 * 60) // 5 minutes
        .sign(privateKey);

    return jwt;
}