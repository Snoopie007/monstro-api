export async function tryCatch<T, E = Error>(
	promise: Promise<T>,
): Promise<{ error: E | null; result: T | null }> {
	try {
		const result = await promise;
		return { error: null, result };
	} catch (error) {
		console.log("Error in tryCatch", error);
		return { error: error as E, result: null };
	}
}

