
import { compileMDX } from 'next-mdx-remote/rsc'
import { JSXElementConstructor } from 'react'
import { ReactElement } from 'react'

export type MonstroLegal = {
    content: ReactElement<any, string | JSXElementConstructor<any>>,
}


const GitHubUser = "Snoopie007"
const Repo = "monstro-blog"

export async function getTOS(fileName: string, folder: string = "pages"): Promise<MonstroLegal | undefined> {
    console.log(fileName, folder)
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
