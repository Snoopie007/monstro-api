
import React from 'react'
import { db } from '@/db/db'
import { format } from 'date-fns'
import { AddDoc } from './components/AddDoc'
import { decodeId } from '@/libs/server/sqids';
async function getDocuments(lid: string) {
    const decodedLid = decodeId(lid);
    // const docs = await db.query.documents.findMany({
    //     where: (docs, { eq }) => eq(docs.locationId, decodedLid)
    // })
    return [];
}

export default async function AIKnowledgePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const documents = await getDocuments(id);
    return (
        <div className='flex flex-col max-w-xl mx-auto py-4'>
            <div className=' flex flex-row justify-between border-b border-foreground/10 items-center  gap-2 pb-4'>
                <div>
                    <div className='text-lg font-bold'>Knowledge Base</div>
                    <p className='text-sm text-gray-500'>Upload PDFs to create a knowledge base for your AI.</p>
                </div>
                <div>
                    <AddDoc lid={id} />
                </div>
            </div>
            <div className='flex flex-row justify-start items-center  gap-2 py-2'>
                {/* {documents.length > 0 ? (
                    documents.map((doc) => (
                        <div key={doc.id}>
                            <div>{doc.name}</div>
                            <div>{format(doc.created, "MM/dd/yyyy")}</div>
                        </div>
                    ))
                ) : (
                    <div className='text-sm flex flex-col justify-center items-center
                     text-center w-full  h-20 '>
                        <span className='text-base font-medium text-foreground/70'> No documents found</span>
                        <span className='text-sm text-muted-foreground'> Upload a document to get started</span>

                    </div>
                )} */}
            </div>
        </div >
    )
}
