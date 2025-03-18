
import { auth } from "@/auth";
import { db } from "@/db/db";
import { permissions, roleHasPermissions, roles } from "@/db/schemas";
import { NextResponse } from "next/server";
import { permission } from "process";

type RoleProps = {
    id: number
}
export async function GET(req: Request, props: { params: Promise<RoleProps> }) {
    const params = await props.params;

    try {
        const roles = await db.query.roles.findMany({
            where: (roles, { eq }) => eq(roles.locationId, params.id),
            with: {
                permissions: true
            }
        })

        console.log(roles);
        
        return NextResponse.json(roles, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function POST(req: Request, props: { params: Promise<RoleProps> }) {
    const params = await props.params;
    const data = await req.json()
    console.log(data)
    console.log(params);
    
    try {
        const [role] = await db.insert(roles).values({
           name: data.name,
           guardName: "default",
           locationId: params.id,
           color: data.color,

        }).returning({ id: roles.id })


        if(data.permission && data.permission.length >0)
        {
            const permission = await db.query.permissions.findMany({
                where:(permissions,{ inArray }) => inArray(permissions.name, data.permission.name)
            })

            const permissionIds = permission.map((permission)=>permission.id)

            if(permissionIds.length > 0)
            {
                await db.insert(roleHasPermissions).values(
                    permissionIds.map((permissionId) => ({
                        roleId: role.id,
                        permissionId: permissionId,
                    }))
                );
                
            }
        }
        return NextResponse.json(role, { status: 200 })

    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}