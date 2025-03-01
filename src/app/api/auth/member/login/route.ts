import { NextResponse } from "next/server"
import { sign } from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { db } from "@/db/db"
import { SignJWT } from "jose"

// This should be replaced with your actual user retrieval logic
async function getUser(email: string) {
  const user = await db.query.users.findFirst({
    where: (user, { eq }) => eq(user.email, `${email}`),
    with: {
      member: {
        with: {
          memberLocations: true
        }
      }
    },
  })
  if (!user || !user.password) return null;
  console.log(user.member.memberLocations);
  return user;
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    const user = await getUser(email)
    if (!user || !user.password) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const match = await bcrypt.compare(`${password}`, user.password);
    console.log(match)
    if (!match) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    // Create a JWT token
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const jwt = await new SignJWT(user).setProtectedHeader({alg: "HS256"}).setExpirationTime("1d").setIssuedAt().sign(secret);
    console.log(jwt)
    user.password = "";
    return NextResponse.json({ token: jwt, ...user })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}

