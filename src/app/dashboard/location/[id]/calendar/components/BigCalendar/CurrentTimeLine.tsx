import { useEffect } from "react";

import { useState } from "react";


export function CurrentTimeLine() {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        // Update time every minute
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const topPosition = (currentHour * 60 + currentMinute);

    return (
        <div
            className="absolute left-0 right-0 z-20 flex items-center"
            style={{
                top: `${topPosition}px`
            }}
        >
            <div className="w-[60px] flex items-center justify-end pr-2 mt-0.5">
                <div className="size-2 rounded-full bg-red-500"></div>
            </div>
            <div className="h-[1px] w-[90%] bg-red-500 flex-1"></div>
        </div>
    );
}