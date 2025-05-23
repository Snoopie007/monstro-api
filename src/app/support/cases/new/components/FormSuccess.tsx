'use client'

export function CaseFormSuccess({ caseId }: { caseId: number }) {
    return (
        <div className='p-4 border border-foreground/10 rounded-sm space-y-2'>
            <div className='text-base font-bold flex items-center gap-1'>

                We have successfuly created your ticket.
            </div>
            <p className='text-sm'>One of Monstro's support will be in touch with in the next 24 to 48 business hour to the email you provided.</p>
            <div className='bg-foreground/5 border border-foreground/10 rounded-sm p-2 text-sm'>
                <b >Case Number: </b> {caseId + 100}
            </div>
        </div>
    )
}