"use client";

import { useEffect, useState, use } from "react";
import SessionCalendar from "./components/AttendanceCalendar";
import Sidebar from "./components/Sidebar";

const CalendarPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const locationId = id;

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<any>(null); 
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false); 
  const [reservations, setReservations] = useState<any[]>([]); 

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/api/protected/loc/${locationId}/programs`
        );
        const data = await response.json();

        const programsArray = Array.isArray(data.programs)
          ? data.programs
          : Array.isArray(data)
            ? data
            : [];

        setPrograms(programsArray);
      } catch (error) {
        console.error("Error fetching programs:", error);
      }
    };

    fetchPrograms();
  }, [locationId]);

  
  const handleSessionClick = async (session: any) => {
    setSelectedSession(session); 
    setIsSidebarOpen(true); 

    try {
     
      console.log("Fetching reservations for session:", session.id);
      const response = await fetch(
        `http://localhost:3000/api/protected/loc/${locationId}/reservations/${session.id}`,
      );
      const data = await response.json();
      console.log("session id", session.id)
      setReservations(data); 
      console.log("Fetched reservations:", data);

    } catch (error) {
      console.error("Error fetching reservations:", error);
    }
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false); 
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>

      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Filter by Program
        </label>
        <select
          value={selectedProgram}
          onChange={(e) => setSelectedProgram(e.target.value)}
          className="p-2 border rounded-md w-full md:w-1/3"
        >
          <option value="">All Programs</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </select>
      </div>

      <SessionCalendar
        selectedProgramId={selectedProgram}
        locationId={locationId}
        onSessionClick={handleSessionClick} // Pass handler to calendar
      />

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

