import { db } from "@/db/db";
import { groupPosts, media } from "@subtrees/schemas";
import { auth } from "@/libs/auth/server";
import S3Bucket from "@/libs/server/s3";
import { NextRequest, NextResponse } from "next/server";

// Allowed media types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Determines the file type category based on MIME type
 */
function getFileTypeCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
    return 'other';
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const groupId = formData.get("groupId") as string;
        const title = formData.get("title") as string;
        const content = formData.get("content") as string;
        const videoEmbed = formData.get("videoEmbed") as string | null;
        const files = formData.getAll("files") as File[];

        if (!groupId || !groupId.trim()) {
            return NextResponse.json(
                { error: "Group ID is required" },
                { status: 400 }
            );
        }

        if (!title || !title.trim()) {
            return NextResponse.json(
                { error: "Title is required" },
                { status: 400 }
            );
        }

        if (!content || !content.trim()) {
            return NextResponse.json(
                { error: "Content is required" },
                { status: 400 }
            );
        }

        // Parse video embed if provided
        let postMetadata: Record<string, any> = {};
        if (videoEmbed) {
            try {
                const videoData = JSON.parse(videoEmbed);
                postMetadata.videoEmbed = videoData;
            } catch {
                // If it's not JSON, store as plain URL
                postMetadata.videoEmbed = { url: videoEmbed };
            }
        }

        // Insert the post
        const [newPost] = await db.insert(groupPosts).values({
            groupId: groupId.trim(),
            authorId: session.user.id,
            title: title.trim(),
            content: content.trim(),
            status: 'published',
            metadata: postMetadata,
        }).returning();

        if (!newPost) {
            return NextResponse.json(
                { error: "Failed to create post" },
                { status: 500 }
            );
        }

        // Process uploaded files (if any)
        const uploadedMedia: any[] = [];
        const s3 = new S3Bucket();

        for (const file of files) {
            // Validate file
            if (!file || !file.name || file.size === 0) continue;

            // Check file size
            if (file.size > MAX_FILE_SIZE) {
                console.warn(`File ${file.name} exceeds size limit, skipping`);
                continue;
            }

            // Check file type
            if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                console.warn(`File ${file.name} has unsupported type (${file.type}), skipping`);
                continue;
            }

            try {
                // Upload to S3
                const s3Result = await s3.uploadFile(
                    file,
                    `groups/${groupId}/posts/${newPost.id}`
                );

                // Insert media record
                const [mediaRecord] = await db.insert(media).values({
                    ownerId: newPost.id,
                    ownerType: 'post',
                    fileName: file.name,
                    fileType: getFileTypeCategory(file.type),
                    fileSize: file.size,
                    mimeType: file.type,
                    url: s3Result.url,
                    thumbnailUrl: null,
                    altText: null,
                }).returning();

                uploadedMedia.push(mediaRecord);
            } catch (uploadError) {
                console.error(`Failed to upload file ${file.name}:`, uploadError);
                // Continue with other files
            }
        }

        // Fetch the post with user info
        const enrichedPost = await db.query.groupPosts.findFirst({
            where: (posts, { eq }) => eq(posts.id, newPost.id),
            with: {
                author: true,
            },
        });

        return NextResponse.json({ 
            success: true, 
            post: {
                ...enrichedPost,
                media: uploadedMedia,
            }
        }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating post:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

