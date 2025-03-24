import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { eq } from 'drizzle-orm';
import { roleHasPermissions, roles } from '@/db/schemas';
import { db } from '@/db/db';

type RoleProps = {
  rid: number,
  id: number
}
export async function DELETE(req: Request, props: { params: Promise<RoleProps> }) {
  const params = await props.params;

  try {
    await db.delete(roles).where(eq(roles.id, params.rid))
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}

export async function PUT(req: Request, props: { params: Promise<RoleProps> }) {
  const params = await props.params;
  const data = await req.json()

  try {
         const [role] = await db.update(roles).set({
            name: data.name,
            guardName: "default",
            locationId: params.id,
            color: data.color,
 
         }).where(eq(roles.id, params.rid)).returning({ id: roles.id })
         
         if (!role) {
          return NextResponse.json({ error: "Role update failed" }, { status: 500 });
        }
 
        if(data.permissions && data.permissions.length >0)
          {
              
              const permission = await db.query.permissions.findMany({
                  where:(permission,{ inArray }) => inArray(permission.name, data.permissions)
  
              })
              
              const permissionIds = permission.map((permission)=>permission.id)
              console.log(roleHasPermissions.roleId)
              const deleted =await db.delete(roleHasPermissions).where(eq(roleHasPermissions.roleId, role.id));
              console.log(deleted)
  
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