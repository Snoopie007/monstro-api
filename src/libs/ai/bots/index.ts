export function sse(event: string, data: unknown) {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export * from "./type";
export * from "./prompts";
export * from "./memory";
export * from "./tools";
