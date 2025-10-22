import useSWR from "swr";
import { MemberTag, MemberTagInsert } from "@/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTags(locationId: string) {
	const { data, error, isLoading, mutate } = useSWR<MemberTag[]>(
		`/api/protected/loc/${locationId}/tags`,
		fetcher
	);

	const createTag = async (tagData: Omit<MemberTagInsert, "locationId">) => {
		const response = await fetch(`/api/protected/loc/${locationId}/tags`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(tagData),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to create tag");
		}

		const newTag = await response.json();
		mutate();
		return newTag;
	};

	const updateTag = async (
		tagId: string,
		tagData: Partial<Omit<MemberTagInsert, "locationId">>
	) => {
		const response = await fetch(
			`/api/protected/loc/${locationId}/tags/${tagId}`,
			{
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(tagData),
			}
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to update tag");
		}

		const updatedTag = await response.json();
		mutate(); // Refresh the data
		return updatedTag;
	};

	const deleteTag = async (tagId: string) => {
		const response = await fetch(
			`/api/protected/loc/${locationId}/tags/${tagId}`,
			{
				method: "DELETE",
			}
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to delete tag");
		}

		mutate(); // Refresh the data
	};

	return {
		tags: data || [],
		error,
		isLoading,
		mutate,
		createTag,
		updateTag,
		deleteTag,
	};
}

export function useMemberTags(locationId: string, memberId: string) {
	const { data, error, isLoading, mutate } = useSWR<MemberTag[]>(
		`/api/protected/loc/${locationId}/members/${memberId}/tags`,
		fetcher
	);



	return {
		memberTags: data || [],
		error,
		isLoading,
		mutate,
	};
}
