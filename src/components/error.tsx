import React from 'react'

export default function ErrorComponent({ error }: { error: Error }) {
    return (
        <div className='h-[calc(100vh-120px)] w-full'>
            <div className='flex flex-col  h-full items-center justify-center '>
                <p className='text-lg'>Uh oh, something went wrong. Please contact support.</p>
            </div>
        </div>
    )
}
