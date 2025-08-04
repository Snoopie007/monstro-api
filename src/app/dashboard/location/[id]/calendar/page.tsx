import CalendarPageClient from "./page-client";

export default function CalendarPage(props: {
  params: Promise<{ id: string }>;
}) {
  return <CalendarPageClient params={props.params} />;
}
