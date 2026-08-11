import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import bcrypt from "bcryptjs";
import { USER_AUTH_COLUMNS, MEMBER_AUTH_COLUMNS } from "@/utils/userUtils";
import { generateMobileToken } from "@/libs/auth";

const MobileLoginSchema = {
    body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
    }),
};


export async function staffLogin(app: Elysia) {

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
                    user: {
                        columns: USER_AUTH_COLUMNS,
                    }
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

            const staff = await db.query.staffs.findFirst({
                where: (staff, { eq }) => eq(staff.userId, account.userId),
                columns: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                },
            });

            if (!staff) {
                return status(404, { message: "Staff record not found." })
            }

            const user = account.user;
            const data = {
                ...user,
                ...staff,
                id: user.id,
                staffId: staff.id,
            };

            const { accessToken, refreshToken, expires } = await generateMobileToken({
                staffId: staff.id,
                userId: user?.id,
                email: user.email,

            });

            return status(200, {
                token: accessToken,
                refreshToken,
                expires,
                user: data,
            })
        } catch (error) {
            console.error("Error in mobile login:", error);
            return status(500, { message: "Internal server error" });
        }
    }, MobileLoginSchema);
    return app;
}