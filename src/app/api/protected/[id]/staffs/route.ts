
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
                    name: 'John Doe',
                    email: '',
                    phone: '1234567890',
                    image: '#',
                    role: {
                        id: 1,
                        name: 'Admin',
                        color: 'red',
                        permissions: ['read', 'write']
                    },
                    status: 'Active',
                    created: new Date()// 2021-09-01 in milliseconds   
                },
                {
                    id: 2,
                    name: 'Jane Doe',
                    email: '',
                    phone: '1234567890',
                    image: '#',
                    role: {
                        id: 1,
                        name: 'Staff',
                        color: 'red',
                        permissions: ['read', 'write']
                    },
                    status: 'Active',
                    created: new Date() // 2021-09-01 in milliseconds   
                },
                {
                    id: 3,
                    name: 'John Smith',
                    email: 'steve@test.com',
                    phone: '1234567890',
                    image: '#',
                    role: {
                        id: 1,
                        name: 'Staff',
                        color: 'red',
                        permissions: ['read', 'write']
                    },
                    status: 'Active',
                    created: new Date() // 2021-09-01 in milliseconds   
                }

            ]
            return NextResponse.json(data, { status: 200 });
        }
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}