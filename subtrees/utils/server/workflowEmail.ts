import { and, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { locations } from '../../schemas/locations';
import { vendors } from '../../schemas/vendors';
import { users } from '../../schemas/users';
import { staffs, staffsLocations } from '../../schemas/staffs';
import type { WorkflowTeamRecipient } from '../workflow/email';

/** Account email is authoritative. Only this location's owner and active staff qualify. */
export async function workflowTeamRecipients(reader: Pick<PostgresJsDatabase, 'select'>, locationId: string): Promise<WorkflowTeamRecipient[]> {
    const owners = await reader.select({ userId: users.id, name: users.name, email: users.email }).from(locations)
        .innerJoin(vendors, eq(vendors.id, locations.vendorId)).innerJoin(users, eq(users.id, vendors.userId))
        .where(eq(locations.id, locationId));
    const staff = await reader.select({ userId: users.id, name: users.name, email: users.email }).from(staffsLocations)
        .innerJoin(staffs, eq(staffs.id, staffsLocations.staffId)).innerJoin(users, eq(users.id, staffs.userId))
        .where(and(eq(staffsLocations.locationId, locationId), eq(staffsLocations.status, 'active')));
    const choices: WorkflowTeamRecipient[] = owners.map(owner => ({ ...owner, role: 'vendor' }));
    for (const account of staff) if (!choices.some(choice => choice.userId === account.userId)) choices.push({ ...account, role: 'staff' });
    return choices;
}
