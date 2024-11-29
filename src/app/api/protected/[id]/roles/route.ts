
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { permission } from "process";

export async function GET() {
    const session = await auth();
    try {
        if (session) {
            /* Adding Your API logic Here */

            const data = [
                {
                    id: 1,
                    name: 'Admin',
                    color: 'red',
                    staffs: 10,
                    permissions: ["create staff", "delete staff"]
                },
                {
                    id: 2,
                    name: 'Staff',
                    color: 'red',
                    staffs: 10,
                    permissions: ["create staff", "delete staff"]
                },
                {
                    id: 3,
                    name: 'Manager',
                    color: 'red',
                    staffs: 10,
                    permissions: ["create staff", "delete staff", "create role"]
                }
            ]
            return NextResponse.json(data, { status: 200 });
        }
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}