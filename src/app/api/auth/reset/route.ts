import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db/db"; 
import { users } from "@/db/schemas"; 
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();
        const { email, password, password_confirmation, token } = data;

       
        if (!email || !password || !password_confirmation || !token) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        
        if (password !== password_confirmation) {
            return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
        }

        
        const user = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, email),
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

      
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        
        await db.update(users)
            .set({ password: hashedPassword })
            .where(eq(users.email, email));

        return NextResponse.json({ success: true, message: "Password reset successfully" }, { status: 200 });

    } catch (err) {
        console.error("Error resetting password:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
