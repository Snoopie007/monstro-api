import React from "react";
import { Botlist, AIChatBox, BotInfo } from "./components";
import { AIChatProvider } from "./components/Chat/AIChatProvider";
import {
  MOCK_BOT_TEMPLATES,
  MOCK_AI_PERSONAS,
  MOCK_DOCUMENTS,
} from "@/mocks/bots";

export default async function BotsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  // TODO: Replace with actual database queries
  // const location = await db.query.locations.findFirst({
  //     where: (locations, { eq }) => eq(locations.id, params.id),
  // });

  // Mock location data for now
  const location = {
    id: params.id,
    name: "Demo Fitness Center",
    address: "123 Main St",
    city: "Demo City",
    state: "CA",
    zipCode: "12345",
  };

  // TODO: Replace with actual database queries
  // const [templates, personas, docs] = await Promise.all([
  //     db.query.botTemplates.findMany(),
  //     db.query.aiPersona.findMany({
  //         where: (persona, { eq }) => eq(persona.locationId, params.id)
  //     }),
  //     db.query.documents.findMany({
  //         where: (doc, { eq }) => eq(doc.locationId, params.id)
  //     })
  // ]);

  // Using mock data for now
  const templates = MOCK_BOT_TEMPLATES;
  const personas = MOCK_AI_PERSONAS.filter(
    (p) => p.locationId === params.id || p.locationId === "loc-1"
  );
  const docs = MOCK_DOCUMENTS.filter(
    (d) => d.locationId === params.id || d.locationId === "loc-1"
  );

  return (
    <div className="flex flex-row h-[calc(100vh-58px)] p-2 gap-2">
      {/* Left Panel: Bot Management */}
      <div className="flex flex-row gap-2 flex-3/6">
        <Botlist lid={params.id} templates={templates} />
        <BotInfo lid={params.id} personas={personas} docs={docs} />
      </div>

      {/* Right Panel: Bot Testing Chat */}
      <div className="flex-3/6">
        <AIChatProvider>
          <AIChatBox location={location} />
        </AIChatProvider>
      </div>
    </div>
  );
}
