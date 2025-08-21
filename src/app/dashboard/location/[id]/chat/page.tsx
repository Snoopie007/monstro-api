import React from "react";
import ChatUI from "./ChatUI";

export default async function ChatPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    return (
        <div className="h-[calc(100vh-50px)] w-full bg-background text-foreground">
            <ChatUI locationId={id} />
        </div>
    );
}


