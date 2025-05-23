
import { SupportDoc, SupportDocMeta } from '@/types/admin'
import { DocToC } from '@/types/admin'
import { compileMDX } from 'next-mdx-remote/rsc'
import { JSXElementConstructor } from 'react'
import { ReactElement } from 'react'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug'

export type MonstroLegal = {
    content: ReactElement<any, string | JSXElementConstructor<any>>,
}


const GitHubUser = "Snoopie007"
const Repo = "monstro-blog"


/*!
 * reading-duration
 * Copyright (c) Mutasim
 * MIT Licensed
*/
interface ReadingOptions {
    wordsPerMinute?: number;
    emoji?: boolean;
}

export function readingDuration(htmlContent: string, options: ReadingOptions = {}): string {
    const { wordsPerMinute = 200, emoji = true } = options;

    const plainText = htmlContent.replace(/<[^>]*>/g, '');
    const words = plainText.split(/\s+/).length;


    const minutes = (words / wordsPerMinute);

    // Round up to the nearest minute
    const readingTime = Math.ceil(minutes);

    return `${emoji ? '⌛ ' : ''}${readingTime} min read`;
};


export async function getTOS(fileName: string, folder: string = "pages"): Promise<MonstroLegal | undefined> {

    const res = await fetch(`https://raw.githubusercontent.com/${GitHubUser}/${Repo}/main/${folder}/${fileName}.mdx`, {
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            'X-GitHub-Api-Version': '2022-11-28',
        },
        next: { revalidate: 1000 }
    })


    if (!res.ok) return undefined

    const rawMDX = await res.text()

    if (rawMDX === '404: Not Found') return undefined


    const { content } = await compileMDX<MonstroLegal>({
        source: rawMDX,
        options: {
            parseFrontmatter: true,
        }
    })

    const tos: MonstroLegal = {
        content: content
    }

    return tos
}


function buildToC(raw: string): DocToC[] {
    const headingsRegex = /\n(?<flag>#{1,6})\s+(?<headline>.+)/g;
    return Array.from(raw.matchAll(headingsRegex)).map(({ groups }) => {
        const flag = groups?.flag;
        const headline = groups?.headline;
        return {
            level: flag?.length,
            headline: headline,
            slug: headline?.toLocaleLowerCase().replace(/[^\w\s]/gi, '').split(" ").join("-")
        };
    })
}

export async function getSupportDocByName(fileName: string): Promise<SupportDoc | undefined> {

    const res = await fetch(`https://raw.githubusercontent.com/${GitHubUser}/support-mdx/main/${fileName}.mdx`, {
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            'X-GitHub-Api-Version': '2022-11-28',
        }
    });

    if (!res.ok) return undefined

    const rawMDX = await res.text()

    if (rawMDX === '404: Not Found') return undefined
    const duration = readingDuration(rawMDX, {
        emoji: false
    });

    const { frontmatter, content } = await compileMDX<SupportDocMeta>({
        source: rawMDX,
        components: {

        },
        options: {
            parseFrontmatter: true,
            mdxOptions: {
                rehypePlugins: [
                    rehypeSlug,
                    [rehypeAutolinkHeadings, {
                        behavior: 'before'
                    }],
                ],
            },
        }
    })


    const doc: SupportDoc = {
        toc: buildToC(rawMDX),
        meta: {
            title: frontmatter.title,
            file: fileName,
            description: frontmatter.description,
            published: frontmatter.published,
            duration: duration,
            tags: frontmatter.tags
        }, content
    }

    return doc
}

