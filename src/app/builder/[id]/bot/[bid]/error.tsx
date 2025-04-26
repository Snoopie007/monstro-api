'use client' // Error boundaries must be Client Components

export default function Error() {

    return (
        <div className='h-screen w-screen flex flex-col items-center justify-center'>
            <h2 className='text-gray-700 text-medium text-lg'>Something went wrong!</h2>

        </div>
    )
}