import { UpdateBot } from "./components";
import { ScrollArea } from "@/components/ui";


interface Props {
    params: Promise<{ lid: string, bid: number }>
}

export default async function UpdateAIBotPage(props: Props) {
    const params = await props.params;
    return (

        <ScrollArea className="h-[calc(100vh-58px)] w-full overflow-hidden">
            <div className="max-w-2xl mx-auto pt-16 pb-12 space-y-4">
                <UpdateBot lid={params.lid} bid={params.bid} />
            </div>
        </ScrollArea>
    )
}