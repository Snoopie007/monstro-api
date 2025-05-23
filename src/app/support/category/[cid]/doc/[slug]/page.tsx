import { getSupportDocByName } from '@/libs/server/MDXParse';
import { SupportDocMeta } from '@/types/admin';
import { Clock } from 'lucide-react';
import { notFound } from 'next/navigation';
import React from 'react'
import { MobileTOC } from './components/toc';
import SideSupport from '../../components/SideSupport';
import { cn } from '@/libs/utils';


export async function generateMetadata({ params }: { params: Promise<{ cid: string, slug: string }> }): Promise<SupportDocMeta> {
    const { cid, slug } = await params;
    const doc = await getSupportDocByName(`${cid.charAt(0).toUpperCase() + cid.slice(1)}/${slug}`);
    if (!doc) {
        return notFound()
    }
    return {
        title: doc.meta.title,
        description: doc.meta.description,
        tags: doc.meta.tags
    }
}

async function SupportDocPage(props: { params: Promise<{ cid: string, slug: string }> }) {
    const { cid, slug } = await props.params;
    let folder;
    if (cid.includes("%20")) {
        const splitFolder = cid.split("%20");
        folder = splitFolder.map((char) => {
            return char.charAt(0).toUpperCase() + char.slice(1)
        }).join("%20")

    } else {
        folder = cid.charAt(0).toUpperCase() + cid.slice(1)
    }

    const doc = await getSupportDocByName(`${folder}/${slug}`);

    if (!doc) {
        return notFound()
    }
    return (
        <div className={"max-w-6xl m-auto py-6"}>
            <div className="grid grid-cols-6 gap-4">
                <article className={"col-span-4 p-6 bg-foreground/5 rounded-md "}>
                    <h1 className='text-2xl font-semibold'>{doc.meta.title}</h1>
                    <div className="grid grid-cols-2 lg:flex items-center justify-start gap-3 my-4">
                        <div className="flex  flex-row  gap-2  items-center ">
                            <Clock className='size-3.5' />
                            {doc.meta.duration}
                        </div>
                    </div>
                    {doc.toc.length > 0 && (
                        <MobileTOC toc={doc.toc} />
                    )}
                    <div className={cn(
                        'prose text-foreground prose-headings:my-4 prose-h2:text-3xl prose-lg max-w-full prose-p:font-roboto prose-p:leading-7 ',
                        'prose-strong:text-foreground'

                    )}>
                        {doc.content}
                    </div>
                </article>
                <div className="col-span-2  w-full h-full relative    ">
                    <div className='px-4 py-6 rounded-md bg-foreground/5 space-y-2 sticky'
                        style={{ top: '10px', scrollBehavior: 'smooth' }}>
                        {doc.toc.length > 0 && (
                            <div className='space-y-2'>
                                <div className=" text-base ">
                                    Table of Contents
                                </div>
                                <div className='space-y-4 bg-foreground/5 rounded-md p-4'>
                                    {doc.toc.map((toc) => (
                                        <a key={toc.slug} href={`#${toc.slug}`}
                                            className="text-sm block text-muted-foreground hover:text-foreground"
                                        >
                                            {toc.headline}
                                        </a>
                                    ))}
                                </div>

                                <div>
                                    <SideSupport />
                                </div>
                            </div>
                        )}

                    </div>

                </div>
            </div>
        </div>
    )
}

export default SupportDocPage