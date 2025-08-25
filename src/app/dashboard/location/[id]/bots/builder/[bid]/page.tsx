import { BotBuilder } from "./components/BotBuilder";
import { BotBuilderProvider } from "./providers/BotBuilderProvider";
import { ReactFlowProvider } from "@xyflow/react";
import { MOCK_EXTENDED_BOTS } from "@/mocks/bots";
import { notFound } from "next/navigation";
import "@xyflow/react/dist/style.css";

interface BotBuilderPageProps {
  params: Promise<{ id: string; bid: string }>;
}

export default async function BotBuilderPage(props: BotBuilderPageProps) {
  const params = await props.params;

  // TODO: Replace with actual database query
  const bot = MOCK_EXTENDED_BOTS.find((b) => b.id === params.bid);

  if (!bot) {
    notFound();
  }

  return (
    <div className="fixed inset-0 bg-background">
      <ReactFlowProvider>
        <BotBuilderProvider bot={bot}>
          <BotBuilder />
        </BotBuilderProvider>
      </ReactFlowProvider>
    </div>
  );
}
