import { ALLOWED_IMAGE_TYPES } from "@subtrees/constants/data";

export const MAX_POST_FILE_SIZE = 10 * 1024 * 1024;

export type PostFileTypeCategory = "image" | "video" | "audio" | "document" | "other";
export type PostUploadFile = {
    name: string;
    type: string;
    size: number;
    arrayBuffer: () => Promise<ArrayBuffer>;
};

export function getFileTypeCategory(mimeType: string): PostFileTypeCategory {
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        return "image";
    }
    return "other";
}

export function isAllowedPostImageType(mimeType: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

export function parsePostVideoEmbed(videoEmbed: string | null): Record<string, any> {
    if (!videoEmbed || !videoEmbed.trim()) {
        return {};
    }

    try {
        const parsed = JSON.parse(videoEmbed);
        return { videoEmbed: parsed };
    } catch {
        return { videoEmbed: { url: videoEmbed.trim() } };
    }
}

export function isPostUploadFile(value: unknown): value is PostUploadFile {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as Partial<PostUploadFile>;
    return (
        typeof candidate.name === "string"
        && typeof candidate.type === "string"
        && typeof candidate.size === "number"
        && typeof candidate.arrayBuffer === "function"
    );
}

export function getPostFiles(formData: { getAll: (name: string) => unknown[] }): PostUploadFile[] {
    const rawFiles = formData.getAll("files");
    return rawFiles.filter(isPostUploadFile);
}

export function getTrimmedFormValue(formData: { get: (name: string) => unknown }, key: string): string {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}
