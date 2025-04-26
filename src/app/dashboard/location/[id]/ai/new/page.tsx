import { NewBot } from "./components";
import { ScrollArea } from "@/components/ui";


export default async function NewAIBotPage(props: { params: Promise<{ lid: number }> }) {
    const params = await props.params;
    return (

        <ScrollArea className="h-[calc(100vh-58px)] w-full overflow-hidden">
            <div className="max-w-2xl mx-auto pt-16 pb-12 space-y-4">
                <NewBot lid={params.lid} />
            </div>
        </ScrollArea>


    )
}