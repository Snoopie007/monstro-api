import CalendarPageClient from "./ClientComponent";

export default function CalendarPage(props: {
  params: Promise<{ id: string }>;
}) {
  return <CalendarPageClient params={props.params} />;
}
