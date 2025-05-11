import { SessionCalendarProvider } from "./providers/SessionCalendarProvider";

interface CalendarLayoutProps {
    children: React.ReactNode,
    params: Promise<{ id: string }>
}


export default async function CalendarLayout(props: CalendarLayoutProps) {
    const params = await props.params;
    const { children } = props;


    return (
        <SessionCalendarProvider initialDate={new Date()}>
            <div className="w-full  h-[calc(100vh-52px)]">
                {children}
            </div>
        </SessionCalendarProvider>

    )
}
