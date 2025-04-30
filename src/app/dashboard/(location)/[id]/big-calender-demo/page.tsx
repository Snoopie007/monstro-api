"use client";
import { use, useState, } from "react";
import SessionCalendar from "./components/AttendanceCalendar";
import Sidebar from "./components/Sidebar";

const CalendarPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const locationId = id;

  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSessionClick = async (session: any) => {
    setSelectedSession(session);
    setIsSidebarOpen(true);

    try {
      setIsLoading(true);
      const response = await fetch(
        `http://localhost:3000/api/protected/loc/${locationId}/reservations/${session.id}`,
      );
      const data = await response.json();
      setReservations(data);
    } catch (error) {
      console.error("Error fetching reservations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Calendar</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <SessionCalendar
          locationId={locationId}
          onSessionClick={handleSessionClick}
          height="100vh" 
                  />
      </div>

      {isSidebarOpen && selectedSession && (
        <Sidebar
          session={{ ...selectedSession, locationId }}
          reservations={reservations}
          onClose={handleSidebarClose}
        />
      )}
    </div>
  );
};

export default CalendarPage;