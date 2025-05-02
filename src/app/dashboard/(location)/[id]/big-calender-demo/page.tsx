"use client";
import { use, useState } from "react";
import SessionCalendar from "./components/AttendanceCalendar";
import Sidebar from "./components/Sidebar";

const CalendarPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const locationId = id;

  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);

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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const renderSearchBar = () => {
    return (
      <div className="relative w-full max-w-md mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search sessions, reservations, members..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Calendar</h1>
        {renderSearchBar()}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <SessionCalendar
          locationId={locationId}
          onSessionClick={handleSessionClick}
          height="100vh"
          searchQuery={searchQuery}
          isSearching={isSearching}
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