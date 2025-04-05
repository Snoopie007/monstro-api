"use client";

import { useEffect, useState, use } from "react";
import SessionCalendar from "./components/AttendanceCalendar";

const CalendarPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const locationId = id;

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/protected/loc/${locationId}/programs`);
        if (!response.ok) throw new Error("Failed to fetch programs");
        const data = await response.json();
        setPrograms(data);
        if (data.length > 0) setSelectedProgram(data[0].id); // default selection
      } catch (error) {
        console.error("Error fetching programs:", error);
      }
    };

    fetchPrograms();
  }, [locationId]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>

      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Filter:
        </label>
        <select
          value={selectedProgram}
          onChange={(e) => setSelectedProgram(e.target.value)}
          className="p-2 border rounded-md w-full md:w-1/3"
        >
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </select>
      </div>

      <SessionCalendar selectedProgramId={selectedProgram} />
    </div>
  );
};

export default CalendarPage;
