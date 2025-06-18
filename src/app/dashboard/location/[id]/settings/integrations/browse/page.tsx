'use client'
import Image from "next/image"
import Link from "next/link";
import { Partner } from "@/types";
import { ChangeEvent, useState, use } from "react";
import { IntergrationPartners } from './partners';
import { Badge, Button } from "@/components/ui";
import { Input } from "@/components/forms";

export default function BrowseIntegrationPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const [filteredPartners, setFilteredPartners] = useState<Partner[]>(IntergrationPartners);

    function filterPartner(event: ChangeEvent<HTMLInputElement>): void {
        const query = event.target.value.toLowerCase();
        if (query !== '') {
            const filtered = IntergrationPartners.filter(partner => partner.name.toLowerCase().includes(query));
            setFilteredPartners(filtered);
        } else {
            setFilteredPartners(IntergrationPartners);
        }
    }

    function generateURL(partner: Partner) {
        const queries = Object.entries(partner.options)
            .map(([key, value]) => {
                // Handle array values by joining with spaces
                if (Array.isArray(value)) {
                    value = value.join(' ');
                }

                // Special handling for state parameter - use location ID
                if (key === "state") {
                    return `${key}=${encodeURIComponent(params.id)}`;
                }

                // Handle redirect_uri by prepending the base URL if it's a relative path
                if (key === "redirect_uri" && typeof value === 'string') {
                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                    const fullUrl = value.startsWith('/') ? `${baseUrl}${value}` : value;
                    return `${key}=${encodeURIComponent(fullUrl)}`;
                }

                // Properly encode all parameter values
                return `${key}=${encodeURIComponent(value as string)}`;
            })
            .filter(Boolean) // Remove any undefined entries
            .join('&');

        return `${partner.url}?${queries}`;
    }

    return (
        <div className="space-y-4">
            <div>
                <Input
                    placeholder='Search Integrations'
                    className=''
                    onChange={filterPartner}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                {filteredPartners.map((partner, index) => (
                    <Link key={index} href={generateURL(partner)} className="border border-foreground/5 rounded-sm py-6 px-4 space-y-4">
                        <div className="flex flex-row gap-4 items-center justify-center">
                            <div className="rounded-full overflow-hidden size-10 flex">
                                <Image src={`/images/partners/${partner.logo}`} alt={partner.name} width={45} height={45} />
                            </div>
                            <div className="text-sm font-bold flex-1 text-foreground text-left">
                                {partner.name}
                                <div className="text-xs">
                                    {partner.tags.map((tag, i) => (
                                        <Badge key={i} size='tiny' className="rounded-sm">{tag}</Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className='text-sm text-foreground mb-2'>{partner.description}</p>
                            <Button variant="outline" size="sm" className="rounded-sm bg-indigo-500 text-white">Connect</Button>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
