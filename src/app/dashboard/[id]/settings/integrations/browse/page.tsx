'use client'
import Image from "next/image"


import Link from "next/link";
import { Partner } from "@/types";
import { ChangeEvent, useState, use } from "react";
import { IntergrationPartners } from './partners';
import { Badge, Button } from "@/components/ui";


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
        <div className="space-y-4">
            <div >
                <input placeholder='Search Intergrations' className='flex-1 w-full rounded-xs text-sm bg-transparent py-1.5 px-4 border-foreground/60 border ' />
            </div>
            <div className="grid grid-cols-2 gap-4">
                {filteredPartners.map((partner, index) => (
                    <Link key={index} href={generateURL(partner)} className="border border-foreground/20 rounded-sm py-6 px-4 space-y-4">
                        <div className="flex flex-row gap-4 items-center justify-center">
                            <div className="">
                                <div className="rounded-full overflow-hidden w-[45px] h-[45px] flex ">
                                    <Image src={`/images/partners/${partner.logo}`} alt={partner.name} width={45} height={45} />
                                </div>
                            </div>

                            <div className="text-base font-bold flex-1 text-foreground text-left">
                                {partner.name}
                                <div className="text-xs">
                                    {partner.tags.map((tag, i) => (
                                        <Badge key={i} className="bg-indigo-500 rounded-xs">{tag}</Badge>

                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className='text-sm text-foreground mb-2'>{partner.description}</p>
                            <Button variant="foreground" size="xs">Connect</Button>
                        </div>
                    </Link>
                ))}
            </div>
        </div >
    )
}
