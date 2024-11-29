import { Loader2 } from 'lucide-react';
import React from 'react'
const tips = [
    "Hey, did you know optimizing your website for local SEO and encouraging reviews can skyrocket your visibility in local searches?",
    "Hey, did you know building relationships with local businesses and sponsoring community events can strengthen your brand's local presence?",
    "Hey, did you know offering exclusive promotions to nearby customers can bring in more foot traffic and boost sales?",
    "Hey, did you know staying active on social media platforms like Instagram and Nextdoor can keep you connected with your local audience and grow your business?"
];
export default function Loading() {
    return (
        <div className='relative'>
            <div className='flex flex-col items-center justify-center w-full h-[calc(100vh-156px)]'>
                <div className='max-w-[30%] text-lg text-center text-foreground/80'>
                    <b className='bg-indigo-200 text-black px-1'>Quick Tip:</b>  {tips[0]}
                </div>

            </div>
            <div className='fixed  animate-pulse bottom-10 right-10 text-lg text-foreground/80 flex flex-row gap-2 items-center font-medium font-roboto'>
                <Loader2 size={20} className='animate-spin stroke-indigo-400' />
                <span className=''>Loading data...</span>
            </div>
        </div>

    )
}
