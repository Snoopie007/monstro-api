import { BotsPageClient } from "./BotsPageClient";
import { getBotsPageData } from "@/libs/server/bots";

export default async function BotsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  try {
    // Fetch all data using the server utility function
    const { location, templates, personas, docs } = await getBotsPageData(params.id);

    return (
      <BotsPageClient
        locationId={params.id}
        location={location}
        templates={templates}
        personas={personas}
        docs={docs}
      />
    );
  } catch (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-58px)]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-muted-foreground">Location not found</h2>
          <p className="text-muted-foreground">The requested location could not be found.</p>
        </div>
      </div>
    );
  }
}
