import { db } from "@/db/db";
import {
  users,
  staffs,
  staffsLocations,
  staffsLocationRoles,
} from "@/db/schemas";
import { and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { MonstroData } from "@/libs/data";
import { EmailSender } from "@/libs/server/emails";

type StaffProps = {
  id: string;
};
const emailSender = new EmailSender();

export async function GET(
  req: Request,
  props: { params: Promise<StaffProps> }
) {
  const params = await props.params;
  try {
    const staffs = await db.query.staffsLocations.findMany({
      where: (staffsLocations, { eq }) =>
        and(eq(staffsLocations.locationId, params.id)),
      with: {
        staff: true,
        roles: {
          with: {
            role: true,
          },
        },
      },
    });
    return NextResponse.json(staffs, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  props: { params: Promise<StaffProps> }
) {
  const params = await props.params;
  const data = await req.json();

  // Validate role exists
  const role = await db.query.roles.findFirst({
    where: (roles, { eq }) => eq(roles.id, data.role), // Changed from data.roleId to data.role
  });

  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const existingUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, data.email),
  });

  let userId: string;
  const staffName = `${data.firstName} ${data.lastName}`.trim(); // Combine firstName and lastName

  if (existingUser) {
    userId = existingUser.id;

    // Check if staff record already exists for this user
    const existingStaff = await db.query.staffs.findFirst({
      where: (staffs, { eq }) => eq(staffs.userId, existingUser.id),
    });

    if (!existingStaff) {
      // Create staff record for existing user
      const [newStaff] = await db
        .insert(staffs)
        .values({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          userId: existingUser.id,
        })
        .returning();

      // Create staff-location relationship
      const [staffLocation] = await db
        .insert(staffsLocations)
        .values({
          staffId: newStaff.id,
          locationId: params.id,
        })
        .returning();

      // Assign role to staff-location
      await db.insert(staffsLocationRoles).values({
        staffLocationId: staffLocation.id,
        roleId: data.role,
      });
    } else {
      // Check if staff-location relationship exists
      const existingStaffLocation = await db.query.staffsLocations.findFirst({
        where: (staffsLocations, { and, eq }) =>
          and(
            eq(staffsLocations.staffId, existingStaff.id),
            eq(staffsLocations.locationId, params.id)
          ),
      });

      if (!existingStaffLocation) {
        // Create staff-location relationship
        const [staffLocation] = await db
          .insert(staffsLocations)
          .values({
            staffId: existingStaff.id,
            locationId: params.id,
          })
          .returning();

        // Assign role to staff-location
        await db.insert(staffsLocationRoles).values({
          staffLocationId: staffLocation.id,
          roleId: data.role,
        });
      } else {
        // Update role if staff-location exists
        await db
          .insert(staffsLocationRoles)
          .values({
            staffLocationId: existingStaffLocation.id,
            roleId: data.role,
          })
          .onConflictDoNothing(); // In case role already assigned
      }
    }

    try {
      await emailSender.send({
        options: {
          to: existingUser.email,
          subject: "Welcome to Monstro",
        },
        template: "MemberInvite",
        data: {
          ui: { button: "Join the team." },
          location: { name: staffName },
          monstro: MonstroData,
          member: { name: staffName },
        },
      });
      return NextResponse.json({ success: true }, { status: 200 });
    } catch (emailError) {
      console.error(
        `Failed to send email to ${existingUser.email}:`,
        emailError
      );
      return NextResponse.json({ error: emailError }, { status: 500 });
    }
  } else {
    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        email: data.email,
        name: staffName, // Use combined name for user table
        created: new Date(),
        // Removed password as it's optional and not provided in request
      })
      .returning();

    userId = newUser.id;

    // Create staff record
    const [newStaff] = await db
      .insert(staffs)
      .values({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        userId: newUser.id,
      })
      .returning();

    // Create staff-location relationship
    const [staffLocation] = await db
      .insert(staffsLocations)
      .values({
        staffId: newStaff.id,
        locationId: params.id,
      })
      .returning();

    // Assign role to staff-location
    await db.insert(staffsLocationRoles).values({
      staffLocationId: staffLocation.id,
      roleId: data.role,
    });

    try {
      await emailSender.send({
        options: {
          to: data.email,
          subject: "Welcome to Monstro",
        },
        template: "MemberInvite",
        data: {
          ui: { button: "Join the team." },
          location: { name: staffName },
          monstro: MonstroData,
          member: { name: staffName },
        },
      });

      return NextResponse.json({ success: true }, { status: 200 });
    } catch (emailError) {
      console.error(`Failed to send email to ${data.email}:`, emailError);
      return NextResponse.json({ error: emailError }, { status: 500 });
    }
  }
}
