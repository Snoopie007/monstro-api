'use client';
import { useState } from "react";

export function SearchInput() {
    const [searchQuery, setSearchQuery] = useState("");
    return (
        <input
            placeholder='Search subscriptions'
            className='text-xs bg-transparent py-1 px-2 rounded-xs border'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
        />
    );
}