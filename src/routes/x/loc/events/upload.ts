import S3Bucket from "@/libs/s3";
import { Elysia } from "elysia";

type EventAccessContext = {
	eventLocationAccess: { allowed: boolean };
};

export const eventUploadRoutes = new Elysia()
	.post("/upload", async (ctx) => {
		const { params, request, status, eventLocationAccess } = ctx as typeof ctx & EventAccessContext;
		if (!eventLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

		const { lid } = params as { lid: string };

		try {
			const formData = await request.formData();
			const file = formData.get("file");
			if (!(file instanceof File)) return status(400, { error: "No file provided" });
			if (!file.type.startsWith("image/")) return status(400, { error: "File must be an image" });
			if (file.size > 10 * 1024 * 1024) return status(400, { error: "Image must be 10 MB or smaller" });

			const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
			const uploadFile = new File([file], `${Date.now()}-${crypto.randomUUID()}.${extension}`, { type: file.type });
			const { url } = await new S3Bucket().uploadFile(uploadFile, `locs/${lid}/events`);

			return status(201, { url });
		} catch (error) {
			console.error(error);
			return status(500, { error: "Failed to upload image" });
		}
	}, { parse: "none" });
