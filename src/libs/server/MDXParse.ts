import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const docsDirectory = path.join(process.cwd(), 'docs');

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


export async function getTOS(): Promise<string | null> {

    try {
        const file = fs.readFileSync(path.join(docsDirectory, 'term-of-use.mdx'), 'utf8');
        const { content } = matter(file);
        return content;
    } catch (error) {
        console.error(error);
        return null;
    }
}

