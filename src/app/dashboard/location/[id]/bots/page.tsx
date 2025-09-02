import { SupportPageClient } from "./SupportPageClient";
// import { getSupportPageData } from "@/libs/server/support";

export default async function SupportPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  try {
    // TODO: Implement getSupportPageData function
    // const { location, supportBot, conversations } = await getSupportPageData(params.id);

    // Temporary placeholder data
    const location = { id: params.id, name: "Location" };
    const supportBot = null;
    const conversations = [];

    return (
      <SupportPageClient
        locationId={params.id}
        location={location}
        supportBot={supportBot}
        conversations={conversations}
      />
    );
  } catch (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-58px)]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-muted-foreground">
            Location not found
          </h2>
          <p className="text-muted-foreground">
            The requested location could not be found.
          </p>
        </div>
      </div>
    );
  }
}
