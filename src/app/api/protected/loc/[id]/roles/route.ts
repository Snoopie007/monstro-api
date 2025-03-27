
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

        
        
        return NextResponse.json(roles, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function POST(req: Request, props: { params: Promise<RoleProps> }) {
    const params = await props.params;
    const data = await req.json()
    console.log(data)
    try {
        const [role] = await db.insert(roles).values({
           name: data.name,
           guardName: "default",
           locationId: params.id,
           color: data.color,

        }).returning({ id: roles.id })

        

        
        if(data.permissions && data.permissions.length >0)
        {
            console.log( data.permissions.name)
            const permission = await db.query.permissions.findMany({
                where:(permission,{ inArray }) => inArray(permission.name, data.permissions)

            })
            console.log("Permission",permission)

            const permissionIds = permission.map((permission)=>permission.id)
            console.log("Permission Id",permissionIds)

            if(permissionIds.length > 0)
            {
               const inserted= await db.insert(roleHasPermissions).values(
                    permissionIds.map((permissionId) => ({
                        roleId: role.id,
                        permissionId: permissionId,
                    }))
                );
                console.log("inserted permissiin is ",inserted)


                
            }
        }
        return NextResponse.json(role, { status: 200 })

    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}