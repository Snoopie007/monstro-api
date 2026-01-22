import { Elysia, t } from "elysia";
import { db } from "../../../db/db";
import bcrypt from "bcryptjs";
import { generateMobileToken } from "../../../libs/auth";

const MobileLoginSchema = {
    body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
    }),
};


export async function mobileLogin(app: Elysia) {

    app.post('/login', async ({ body, status }) => {

        const { email, password } = body;

        if (!email || !password) {
            return status(400, { message: "Email and password are required" })
        }
        const normalizedEmail = email.trim().toLowerCase();
        try {

            const account = await db.query.accounts.findFirst({
                where: (account, { eq }) => eq(account.accountId, normalizedEmail),
                with: {
                    user: true
                },
            });

            console.log(account ? "Account found" : "Account not found");

            if (!account || !account.password) {
                console.log("User not found or no password in simple query");
                return status(404, { message: "User not found." })
            }

            const match = await bcrypt.compare(password, account.password);

            console.log("Password match:", match);

            if (!match) {
                console.log("Password mismatch");
                return status(400, { message: "Invalid email or password." })
            }

            const member = await db.query.members.findFirst({
                where: (member, { eq }) => eq(member.userId, `${account.userId}`)
            });

            if (!member) {
                return status(404, { message: "Member record not found." })
            }


            const user = account.user;
            const data = {
                ...user,
                referralCode: member.referralCode,
                phone: member.phone,
                memberId: member?.id,
                role: "member",
            };


            const { accessToken, refreshToken, expires } = await generateMobileToken({
                memberId: member.id,
                userId: user?.id,
                email: user.email,

            });

            return status(200, {
                token: accessToken,
                refreshToken,
                expires,
                user: data,
                setupCompleted: member.setupCompleted
            })
        } catch (error) {
            console.error("Error in mobile login:", error);
            return status(500, { message: "Internal server error" });
        }
    }, MobileLoginSchema);
    return app;
}