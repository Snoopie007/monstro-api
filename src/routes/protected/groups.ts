import { db } from "@/db/db";
import { Elysia } from "elysia";
type GetParams = {
	params: {
		gid: string
	}
	status: any
}

export function groupRoutes(app: Elysia) {
	return app.get('/', async ({ params, status }: GetParams) => {

		try {
			const group = await db.query.groups.findFirst({
				where: (groups, { eq }) => eq(groups.id, params.gid),
				with: {
					location: true,
					posts: {
						orderBy: (posts, { desc }) => desc(posts.created),
						with: {
							medias: true,
							user: true,
						},
					},
					groupMembers: {
						with: {
							user: true,
						},
					},
				},
			});

			if (!group) {
				return status(404, { error: "Group not found" });
			}

			return status(200, group);
		} catch (error) {
			console.error(error);
			return status(500, { error: "Failed to fetch group" });
		}
	})
}


type GroupPostParams = {
	params: {
		gid: string
		pid: string
	}
	status: any
}

export function groupPostRoutes(app: Elysia) {
	return app.group('/posts/:pid', (app) => {
		app.get('/comments', async ({ params, status }: GroupPostParams) => {
			const { gid, pid } = params;
			try {

				const comments = await db.query.comments.findMany({
					where: (comments, { eq, and, isNull }) => and(
						eq(comments.ownerId, pid),
						eq(comments.ownerType, "post"),
						isNull(comments.deletedOn),
						isNull(comments.parentId),
					),
					orderBy: (comments, { desc }) => desc(comments.created),
					limit: 10,
					with: {
						user: true,
					},
				});

				if (!comments) {
					return status(404, { error: "Post comments not found" });
				}
				return status(200, comments);
			} catch (error) {
				console.error(error);
				return status(500, { error: "Failed to fetch post comments" });
			}
		})
		return app;
	})
}