'use client'
import Image from "next/image"


import Link from "next/link";
import { Partner } from "@/types";
import { ChangeEvent, useState, use } from "react";
import {IntergrationPartners} from './partners';


export default function BrowseIntergrationPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const [filteredPartners, setFilteredPartners] = useState<Partner[]>(IntergrationPartners);


    function filterPartner(event: ChangeEvent<HTMLInputElement>): void {
        const query = event.target.value.toLowerCase();
        if (query !== '') {
            const filtered = IntergrationPartners.filter(partner => partner.name.toLowerCase().includes(query));
            console.log(filtered)
            setFilteredPartners(filtered);

        } else {
            setFilteredPartners(IntergrationPartners);
        }

    }

    function generateURL(partner: Partner) {

        const queries = Object.entries(partner.options)
            .map(([key, value]) => {
                // Check if the value is an array
                if (Array.isArray(value)) {
                    // Join the array elements with a space
                    value = value.join(' ');
                }
                if (key == "state") {
                    return `${key}=${params.id}`;
                }
                return `${key}=${value}`;
            }).join('&');
        return `${partner.url}?${queries}`;
        // const url = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=${options.requestType}&redirect_uri=${options.redirectUri}&client_id=${options.clientId}&scope=${options.scopes.join(' ')}`;
        // window.open(url, 'PopupWindow', 'width=600,height=600,scrollbars=yes');
        // window.success = (data: any) => {
        //     console.log("data")
        // }

    }

    return (
        <div>
            <div className="mb-8">
                <input placeholder='Search...' onChange={filterPartner} className='w-full rounded-sm text-sm bg-white/5 py-3  px-4 border font-roboto ' />
            </div>
            <div className="grid grid-cols-2 gap-4">
                {filteredPartners.map((partner, index) => (
                    <Link key={index} href={generateURL(partner)} className="border rounded-sm py-6 px-4">
                        <div className="flex flex-row mb-4 gap-4 items-center justify-center">
                            <div className="">
                                <div className="rounded-full overflow-hidden w-[40px] h-[40px] flex ">
                                    <Image src={`/images/partners/${partner.logo}`} alt={partner.name} width={40} height={40} />
                                </div>
                            </div>

                            <div className="text-base font-bold flex-1 text-foreground text-left">
                                {partner.name}
                                <div className="text-xs">
                                    {partner.tags.map((tag, i) => (
                                        <span key={i} className="bg-indigo-500 text-white px-2 rounded-sm py-0.5">{tag}</span>

                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className='text-base text-foreground mb-2'>{partner.description}</p>
                            <span className="inline-flex items-center px-3 py-1 font-semibold text-sm mt-2 gap-2 rounded-sm text-background bg-foreground"> Connect</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div >
    )
}
