'use client'


import { LiaCopySolid } from "react-icons/lia";
export default function CopyTicket({ id }: { id: number }) {

    function copyToClipboard() {
        navigator.clipboard.writeText(`${100 + +id}`)
    }


    return (

        <LiaCopySolid size={16} className="hover:opacity-70 cursor-pointer  mt-0.5 stroke-white" onClick={(e) => { copyToClipboard() }} />

    )
}
