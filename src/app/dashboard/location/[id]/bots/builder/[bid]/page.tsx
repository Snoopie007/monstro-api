import { BotBuilder } from "./components/BotBuilder";
import { BotBuilderProvider } from "./providers/BotBuilderProvider";
import { ReactFlowProvider } from "@xyflow/react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, and } from "drizzle-orm";
import { bots } from "@/db/schemas";
import "@xyflow/react/dist/style.css";

interface BotBuilderPageProps {
  params: Promise<{ id: string; bid: string }>;
}

export default async function BotBuilderPage(props: BotBuilderPageProps) {
  const params = await props.params;

  // Check authentication
  const session = await auth();
  if (!session) {
    notFound();
  }

  // Fetch the bot from database
  const botData = await db.query.bots.findFirst({
    where: and(eq(bots.id, params.bid), eq(bots.locationId, params.id)),
  });

  if (!botData) {
    notFound();
  }

  // Transform to expected format for ExtendedBot
  const bot = {
    ...botData,
    persona: [],
    scenarios: [],
    knowledge: [],
    botKnowledge: [],
    botPersona: [],
  };

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
