/**
 * Backfill script for attendance refactor migration
 * 
 * This script:
 * 1. Populates denormalized fields on existing reservations
 * 2. Populates denormalized fields on existing recurring reservations
 * 3. Migrates legacy recurring_reservations_exceptions to the new reservation_exceptions table
 * 
 * Run with: bun run src/db/scripts/backfill-reservations.ts
 */

import { db } from '../db';
import { 
  reservations, 
  recurringReservations, 
  recurringReservationsExceptions,
  reservationExceptions,
  programSessions,
  programs 
} from '../schemas';
import { eq, isNull, sql } from 'drizzle-orm';

const BATCH_SIZE = 100;

async function backfillReservations() {
  console.log('🔄 Starting reservations backfill...');
  
  let offset = 0;
  let processed = 0;
  let updated = 0;

  while (true) {
    // Fetch reservations that need backfilling (missing denormalized data)
    const batch = await db.query.reservations.findMany({
      where: isNull(reservations.programId),
      limit: BATCH_SIZE,
      offset,
      with: {
        session: {
          with: {
            program: true,
          },
        },
      },
    });

    if (batch.length === 0) break;

    for (const reservation of batch) {
      if (!reservation.session) {
        console.log(`  ⚠️ Reservation ${reservation.id} has no session, skipping`);
        continue;
      }

      try {
        await db.update(reservations)
          .set({
            programId: reservation.session.programId,
            programName: reservation.session.program?.name,
            sessionTime: reservation.session.time,
            sessionDuration: reservation.session.duration,
            sessionDay: reservation.session.day,
            staffId: reservation.session.staffId,
            // Set default status for existing reservations
            status: reservation.status || 'confirmed',
          })
          .where(eq(reservations.id, reservation.id));
        
        updated++;
      } catch (err) {
        console.error(`  ❌ Failed to update reservation ${reservation.id}:`, err);
      }
    }

    processed += batch.length;
    console.log(`  📊 Processed ${processed} reservations, updated ${updated}`);
    
    if (batch.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  console.log(`✅ Reservations backfill complete: ${updated} updated out of ${processed} processed`);
  return { processed, updated };
}

async function backfillRecurringReservations() {
  console.log('🔄 Starting recurring reservations backfill...');
  
  let offset = 0;
  let processed = 0;
  let updated = 0;

  while (true) {
    // Fetch recurring reservations that need backfilling
    const batch = await db.query.recurringReservations.findMany({
      where: isNull(recurringReservations.programId),
      limit: BATCH_SIZE,
      offset,
      with: {
        session: {
          with: {
            program: true,
          },
        },
      },
    });

    if (batch.length === 0) break;

    for (const recurring of batch) {
      if (!recurring.session) {
        console.log(`  ⚠️ Recurring reservation ${recurring.id} has no session, skipping`);
        continue;
      }

      try {
        await db.update(recurringReservations)
          .set({
            programId: recurring.session.programId,
            programName: recurring.session.program?.name,
            sessionTime: recurring.session.time,
            sessionDuration: recurring.session.duration,
            sessionDay: recurring.session.day,
            staffId: recurring.session.staffId,
            // Set default status for existing recurring reservations
            status: recurring.status || 'confirmed',
          })
          .where(eq(recurringReservations.id, recurring.id));
        
        updated++;
      } catch (err) {
        console.error(`  ❌ Failed to update recurring reservation ${recurring.id}:`, err);
      }
    }

    processed += batch.length;
    console.log(`  📊 Processed ${processed} recurring reservations, updated ${updated}`);
    
    if (batch.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  console.log(`✅ Recurring reservations backfill complete: ${updated} updated out of ${processed} processed`);
  return { processed, updated };
}

async function migrateExceptions() {
  console.log('🔄 Starting exceptions migration...');
  
  let offset = 0;
  let processed = 0;
  let migrated = 0;

  while (true) {
    // Fetch legacy exceptions
    const batch = await db.query.recurringReservationsExceptions.findMany({
      limit: BATCH_SIZE,
      offset,
    });

    if (batch.length === 0) break;

    for (const legacyException of batch) {
      try {
        // Check if this exception already exists in the new table
        const existing = await db.query.reservationExceptions.findFirst({
          where: (e, { and, eq }) => and(
            eq(e.recurringReservationId, legacyException.recurringReservationId),
            eq(e.occurrenceDate, legacyException.occurrenceDate)
          ),
        });

        if (!existing) {
          // Get the recurring reservation to find locationId and sessionId
          const recurring = await db.query.recurringReservations.findFirst({
            where: eq(recurringReservations.id, legacyException.recurringReservationId),
          });

          if (recurring) {
            await db.insert(reservationExceptions).values({
              recurringReservationId: legacyException.recurringReservationId,
              locationId: recurring.locationId,
              sessionId: recurring.sessionId,
              occurrenceDate: legacyException.occurrenceDate,
              initiator: 'member', // Legacy exceptions were member-initiated
              reason: null,
              createdBy: null,
            });
            migrated++;
          }
        }
      } catch (err) {
        console.error(`  ❌ Failed to migrate exception for recurring ${legacyException.recurringReservationId}:`, err);
      }
    }

    processed += batch.length;
    console.log(`  📊 Processed ${processed} legacy exceptions, migrated ${migrated}`);
    
    if (batch.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  console.log(`✅ Exceptions migration complete: ${migrated} migrated out of ${processed} processed`);
  return { processed, migrated };
}

async function verifyMigration() {
  console.log('🔍 Verifying migration...');

  // Count reservations without denormalized data
  const reservationsWithoutProgram = await db.execute(sql`
    SELECT COUNT(*) as count FROM reservations WHERE program_id IS NULL AND session_id IS NOT NULL
  `);
  
  const recurringWithoutProgram = await db.execute(sql`
    SELECT COUNT(*) as count FROM recurring_reservations WHERE program_id IS NULL AND session_id IS NOT NULL
  `);

  const legacyExceptionsCount = await db.execute(sql`
    SELECT COUNT(*) as count FROM recurring_reservations_exceptions
  `);

  const newExceptionsCount = await db.execute(sql`
    SELECT COUNT(*) as count FROM reservation_exceptions WHERE initiator = 'member'
  `);

  console.log('📊 Verification Results:');
  console.log(`  - Reservations missing program_id: ${reservationsWithoutProgram[0]?.count || 0}`);
  console.log(`  - Recurring reservations missing program_id: ${recurringWithoutProgram[0]?.count || 0}`);
  console.log(`  - Legacy exceptions: ${legacyExceptionsCount[0]?.count || 0}`);
  console.log(`  - Migrated exceptions (member-initiated): ${newExceptionsCount[0]?.count || 0}`);
}

async function main() {
  console.log('🚀 Starting attendance refactor backfill script\n');
  console.log('='.repeat(50));

  try {
    // Step 1: Backfill reservations
    const reservationsResult = await backfillReservations();
    console.log('');

    // Step 2: Backfill recurring reservations
    const recurringResult = await backfillRecurringReservations();
    console.log('');

    // Step 3: Migrate exceptions
    const exceptionsResult = await migrateExceptions();
    console.log('');

    // Step 4: Verify migration
    await verifyMigration();

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Backfill complete!');
    console.log(`  📌 Reservations: ${reservationsResult.updated} updated`);
    console.log(`  📌 Recurring: ${recurringResult.updated} updated`);
    console.log(`  📌 Exceptions: ${exceptionsResult.migrated} migrated`);
    
  } catch (err) {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  }

  process.exit(0);
}

main();

