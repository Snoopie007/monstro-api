import { Elysia } from "elysia";
import { db } from "../../../db/db";
import bcrypt from "bcryptjs";
import { generateMobileToken } from "../../../libs/auth";
import { z } from "zod";
const MobileLoginSchema = {
    body: z.object({
        email: z.string(),
        password: z.string(),
    }),
};


export async function mobileLogin(app: Elysia) {

    app.post('/login', async ({ body, status }) => {

        const { email, password } = body;

        if (!email || !password) {
            return status(400, { message: "Email and password are required" })
        }
        try {

            const user = await db.query.users.findFirst({
                where: (user, { eq }) => eq(user.email, `${email}`),
            });

            console.log(user ? "User found" : "User not found");

            if (!user || !user.password) {
                console.log("User not found or no password in simple query");
                return status(404, { message: "User not found." })
            }

            const match = await bcrypt.compare(password, user.password);

            console.log("Password match:", match);

            if (!match) {
                console.log("Password mismatch");
                return status(400, { message: "Invalid email or password." })
            }

            const member = await db.query.members.findFirst({
                where: (member, { eq }) => eq(member.userId, `${user.id}`)
            });

            if (!member) {
                return status(404, { message: "Member record not found." })
            }


            const { password: userPassword, ...rest } = user;
            const data = {
                ...rest,
                phone: member.phone,
                image: member?.avatar,
                stripeCustomerId: member?.stripeCustomerId,
                memberId: member?.id,
                role: "member",
            };


            const { accessToken, refreshToken, expires } = await generateMobileToken({
                memberId: member.id,
                userId: user.id,
                email: user.email,
            });

            return status(200, { token: accessToken, refreshToken, expires, user: data })
        } catch (error) {
            console.error("Error in mobile login:", error);
            return status(500, { message: "Internal server error" });
        }
    }, MobileLoginSchema);
    return app;
}