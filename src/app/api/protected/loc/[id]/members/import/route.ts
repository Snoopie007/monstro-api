import { db } from '@/db/db';
import { importMembers } from '@/db/schemas/ImportMembers';
import { NextResponse } from 'next/server';
export async function POST(request: Request, props: { params: Promise<{ id: number }> }) {

  const data = await request.formData();
  const file = data.get('file');
  const programId = data.get('programId');
  const planId = data.get('planId');

  const params = await props.params;
  if (!file) {
    return NextResponse.json({ status: 'fail', message: 'No file uploaded' }, { status: 400 });
  }
  if (file && file instanceof Blob) {
    try {

      // Read file content
      const arrayBuffer = await file.arrayBuffer();
      const content = new TextDecoder('utf-8').decode(arrayBuffer);

      // Split content into rows and extract headers
      const rows = content.trim().split('\n');
      const headers = rows[0].split(',').map(h => h.trim());

      // Loop through records and map values to headers
      const records = rows.slice(1).map(row => {
        const values = row.split(',').map(v => v.trim());
        return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
      });
      const addedRecords = [];
      // Example: Looping over each record
      for (const record of records) {
        try {
          const inserted = await db.insert(importMembers).values({
            firstName: record.first_name,
            lastName: record.last_name,
            email: record.email,
            phone: record.phone,
            lastRenewalDay: record.last_renewal_day,
            terms: record.terms,
            termCount: parseInt(record.term_count, 10),
            status: record.status,
            planId: planId && typeof planId === 'string' ? parseInt(planId, 10) : null,
            created: new Date(),
            locationId: params.id
          });

          addedRecords.push(inserted);
        } catch (error) {
          console.error(`Error inserting record: ${record.email}`, error);
        }
      }
      return NextResponse.json({ status: 'success', message: 'File uploaded successfully', data: { sample: records.slice(0, 3) } });
    } catch (error) {
      return NextResponse.json({ status: 'fail', message: 'No file uploaded', error: error }, { status: 500 });
    }

  }

}
