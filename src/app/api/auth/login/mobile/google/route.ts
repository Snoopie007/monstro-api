import { NextResponse } from "next/server"
import { db } from "@/db/db"
import { SignJWT } from "jose"
import bcrypt from "bcryptjs";
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
  return user;
}

export async function POST(req: Request) {
  try {
    const { email,loginMethod,...rest } = await req.json()

    if(loginMethod !== 'google')
    {
      return NextResponse.json({ error: "Invalid login " }, { status: 400 })
    }

    const user = await getUser(email)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

  
    // Create a JWT token
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const jwt = await new SignJWT(user).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1d").setIssuedAt().sign(secret);
    console.log(jwt)
    user.password = "";
    return NextResponse.json({ token: jwt, ...user })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}

