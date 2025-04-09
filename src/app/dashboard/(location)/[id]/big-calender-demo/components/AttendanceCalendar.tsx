"use client";
import { useEffect, useState } from "react";
import { Calendar, Event } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import localizer from "@/libs/calendarLocalizer";

interface ProgramSession {
  id: number;
  programId: number;
  time: string;
  duration: number;
  day: number;
  programName: string;
}

const SessionCalendar: React.FC<{
  selectedProgramId: string;
  locationId: string;
  onSessionClick: (session: Event) => void;
}> = ({ selectedProgramId, locationId, onSessionClick }) => {
  const [sessions, setSessions] = useState<Event[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const baseUrl = `http://localhost:3000/api/protected/loc/${locationId}/program_sessions`
        const url = selectedProgramId
          ? `${baseUrl}/${selectedProgramId}`
          : `http://localhost:3000/api/protected/loc/${locationId}/program_sessions`

        const res = await fetch(url);
        const json = await res.json();
        const rawSessions = json.session ?? json.sessions ?? [];

        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

        const mappedSessions = rawSessions.map((session: ProgramSession) => {
          const sessionDate = new Date(monday);
          sessionDate.setDate(monday.getDate() + (session.day - 1));

          const [hours, minutes, seconds] = session.time.split(":").map(Number);
          sessionDate.setHours(hours, minutes, seconds || 0);

          const start = new Date(sessionDate);
          const end = new Date(start.getTime() + session.duration * 60000);

          return {
            id: session.id,
            title: `Name: ${session.programName}`,
            start,
            end,
            duration: session.duration,
          };
        });

        setSessions(mappedSessions);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      }
    };

    fetchSessions();
  }, [selectedProgramId, locationId]);

  return (
    <div className="overflow-y-auto" style={{ height: "60vh" }}>
      <Calendar
        localizer={localizer}
        events={sessions}
        startAccessor="start"
        endAccessor="end"
        titleAccessor="title"
        style={{ height: "100%" }}
        views={["month"]}
        onSelectEvent={onSessionClick}
      />
    </div>
  );
};

export default SessionCalendar;