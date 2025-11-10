// TODO: REFACTOR - Move this to separate user-context.ts file

import { db } from "@/db/db";

// This should NOT be in the auth flow - should be fetched separately
export async function buildUserPayload(userId: string) {
    const user = await db.query.users.findFirst({
      where: (user, { eq }) => eq(user.id, userId),
      with: {
        vendor: {
            columns: {
                id: true,
            phone: true,
            avatar: true,
            stripeCustomerId: true,
          },
          with: {
            locations: {
              with: {
                locationState: {
                  columns: {
                    status: true,
                  },
                },
              },
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
        staff: {
          columns: {
            id: true,
            phone: true,
            avatar: true,
          },
          with: {
            staffLocations: {
              with: {
                location: {
                  columns: {
                    id: true,
                    name: true,
                  },
                },
                roles: {
                  with: {
                    role: {
                      with: {
                        permissions: {
                          with: {
                            permission: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
              columns: {
                status: true,
              },
            },
          },
        },
      },
    });
  
    if (!user) {
      throw new Error("User not found");
    }
  
    let userPayload: any;
  
    if (user.vendor) {
      const {
        vendor: { locations, ...vendor },
        ...rest
      } = user;

      const filteredLocations = locations
        .filter((location) => {
          const { locationState } = location;
          return locationState && ["active"].includes(locationState.status);
        })
        .map((location) => ({
          id: location.id,
          name: location.name,
          status: location.locationState?.status,
        })) || [];
  
      userPayload = {
        id: rest.id,
        name: rest.name,
        email: rest.email,
        phone: vendor.phone,
        image: vendor?.avatar,
        vendorId: vendor?.id,
        stripeCustomerId: vendor?.stripeCustomerId,
        role: "vendor",
        locations: filteredLocations,
      };
    } else if (user.staff) {
      const {
        staff: { staffLocations, ...staff },
        ...rest
      } = user;
  
      const transformedLocations = staffLocations.map((staffLocation: any) => {
        const permissions = new Set<string>();
        staffLocation.roles.forEach((roleAssignment: any) => {
          roleAssignment.role.permissions.forEach((rp: any) => {
            permissions.add(rp.permission.name);
          });
        });
  
        return {
          id: staffLocation.location.id,
          name: staffLocation.location.name,
          status: staffLocation.status,
          roles: staffLocation.roles.map((r: any) => r.role),
          permissions: Array.from(permissions),
        };
      });
  
      userPayload = {
        id: rest.id,
        name: rest.name,
        email: rest.email,
        phone: staff.phone,
        image: staff?.avatar,
        staffId: staff?.id,
        role: "staff",
        locations: transformedLocations,
      };
    } else {
      throw new Error("User is not associated with a vendor or staff account");
    }
  
    return userPayload;
  }