import { NextRequest, NextResponse } from "next/server";
import { decode, getToken } from "next-auth/jwt";
import { jwtVerify, decodeJwt } from 'jose';
import { auth } from "@/auth";
import { db } from "@/db/db";
import { MemberStripePayments } from "@/libs/server/stripe";
import Stripe from "stripe";

type Params = {
    id: number;
    sid: number;
}

const isProduction = process.env.NODE_ENV === 'production';

export async function PATCH(req: NextRequest, props: { params: Promise<Params> }) {
    const { id, sid } = await props.params;
    const body = await req.json();
    // const token = await getToken({
    //     req,
    //     secret: process.env.AUTH_SECRET!,
    //     cookieName: "next-auth.session-token",
    //     salt: isProduction ? `__Secure-next-auth.monstro-session-token` : `next-auth.session-token`
    // });


    // const res = await jwtVerify(
    //     'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEiLCJuYW1lIjoiQnJpYW4gRGlleiIsImVtYWlsIjoidGVzdEBteW1vbnN0cm8uY29tIiwiZW1haWxWZXJpZmllZCI6bnVsbCwiaW1hZ2UiOm51bGwsInBhc3N3b3JkIjoiJDJhJDEwJGJoZ1RrSzAyNkh1MzZmSGEvMktSSk9lVmJxMUxDUnlZYWUwRGpRZEQ2aGtxdElGYzhGY0ZpIiwiY3JlYXRlZCI6IjIwMjUtMDMtMTVUMTU6NTA6MjkuODA3WiIsInVwZGF0ZWQiOm51bGwsImRlbGV0ZWQiOm51bGwsInZlbmRvciI6eyJpZCI6MSwicGhvbmUiOiIrMTUxNjQxODI2NTkiLCJhdmF0YXIiOm51bGwsInN0cmlwZUN1c3RvbWVySWQiOiJjdXNfUnpGR2MxY2FvM2w5Q1EiLCJsb2NhdGlvbnMiOlt7ImlkIjozMCwibmFtZSI6IkdyYWNpZSBNYW5zaW9uIENvbnNlcnZhbmN5IiwibG9jYXRpb25TdGF0ZSI6eyJzdGF0dXMiOiJpbmNvbXBsZXRlIn19LHsiaWQiOjIsIm5hbWUiOiJNYXJ0aWFsIEFydHMgVVNBIiwibG9jYXRpb25TdGF0ZSI6eyJzdGF0dXMiOiJhY3RpdmUifX0seyJpZCI6MjksIm5hbWUiOiJTb3V0aCBUdWxzYSBDaGlsZHJlbnMgQmFsbGV0IiwibG9jYXRpb25TdGF0ZSI6eyJzdGF0dXMiOiJhY3RpdmUifX0seyJpZCI6MTgsIm5hbWUiOiJNYXJ0aWFsIEFydHMgQWR2YW50YWdlIiwibG9jYXRpb25TdGF0ZSI6eyJzdGF0dXMiOiJhY3RpdmUifX1dfSwiZXhwIjoxNzUxMDUyNzU2LCJpYXQiOjE3NTA5NjYzNTZ9.F10jlI7vqsU9PB4DzDlRbyqucsqy1Qxu7MzhnAbRsFI',
    //     new TextEncoder().encode(process.env.AUTH_SECRET),
    //     {
    //         algorithms: ['HS256'],
    //     }
    // )
    // const tt = await decode({
    //     token: token,
    //     secret: process.env.AUTH_SECRET,
    //     salt: isProduction ? `__Secure - next - auth.monstro - session - token` : `next - auth.session - token`,
    // })
    // console.log('Next Decode', token);
    // console.log(res);
    try {

        const sub = await db.query.memberSubscriptions.findFirst({
            where: (ms, { eq }) => eq(ms.id, sid),
        })

        if (!sub) {
            return NextResponse.json({ success: false, message: 'Subscription not found' }, { status: 404 });
        }


        if (sub.stripeSubscriptionId) {

            const stripe = new MemberStripePayments()
            const subscription = await stripe.getSubscription(sub.stripeSubscriptionId)
            const latestInvoice = subscription.latest_invoice as Stripe.Invoice

        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
