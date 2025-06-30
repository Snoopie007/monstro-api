import React from 'react'

export function OrDivider() {
    return (
        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 text-gray-500 bg-white">or</span>
            </div>
        </div>
    )
}
