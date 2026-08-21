import type { ToolCall } from "./types";

export async function RAGTool(_toolCall: ToolCall) {
	// if (toolCall.name !== "RAGTool") {
	//     throw new Error("Invalid tool.")
	// }

	// const { type, query } = toolCall.args;

	// return {
	//     message: new ToolMessage({
	//         content: data,
	//         tool_call_id: toolCall.id!,
	//         name: toolCall.name
	//     }),
	//     next
	// }
}
