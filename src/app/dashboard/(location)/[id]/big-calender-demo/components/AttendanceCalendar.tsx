"use client";
import { useEffect, useState, useRef } from "react";
import { Calendar, Event, View, Views } from "react-big-calendar";
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

interface Program {
  id: string;
  name: string;
}

const SessionCalendar: React.FC<{
  selectedProgramId: string;
  locationId: string;
  onSessionClick: (session: Event) => void;
  height?: string;
}> = ({ selectedProgramId: initialSelectedProgramId, locationId, onSessionClick, height = "60vh" }) => {
  const [sessions, setSessions] = useState<Event[]>([]);
  const [view, setView] = useState<"month" | "week" | "day">(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState(initialSelectedProgramId);
  const [isLoading, setIsLoading] = useState(false);
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setIsLoading(true);
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrograms();
  }, [locationId]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const baseUrl = `http://localhost:3000/api/protected/loc/${locationId}/program_sessions`;
        const url = selectedProgramId
          ? `${baseUrl}/${selectedProgramId}`
          : baseUrl;

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
            title: session.programName,
            start,
            end,
            duration: session.duration,
            resource: session.programId,
          };
        });

        setSessions(mappedSessions);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      }
    };

    fetchSessions();
  }, [selectedProgramId, locationId]);

  const eventStyleGetter = (event: Event) => {
    const colorMap: Record<string, string> = {
      '1': 'rgba(192, 240, 192, 0.8)',
      '2': 'rgba(173, 216, 230, 0.8)',
      '3': 'rgba(255, 228, 181, 0.8)',
      '4': 'rgba(221, 160, 221, 0.8)',
      '5': 'rgba(255, 182, 193, 0.8)',
    };
    
    const resourceId = event.resource?.toString() || '1';
    const backgroundColor = colorMap[resourceId] || colorMap['1'];
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: '#333',
        border: '0px',
        display: 'block',
        fontWeight: 500,
        fontSize: '0.9em',
        padding: '2px 5px',
      }
    };
  };

  const dayPropGetter = (date: Date) => {
    const today = new Date();
    if (date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()) {
      return {
        style: {
          backgroundColor: '#f0f9ff',
        }
      };
    }
    return {};
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleView = (newView: View) => {
      if (newView === Views.MONTH || newView === Views.WEEK || newView === Views.DAY) {
          setView(newView);
      }
  };

  const moveToToday = () => {
    setDate(new Date());
  };

  const moveToPrevious = () => {
    const newDate = new Date(date);
    if (view === Views.MONTH) {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === Views.WEEK) {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setDate(newDate);
  };

  const moveToNext = () => {
    const newDate = new Date(date);
    if (view === Views.MONTH) {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === Views.WEEK) {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setDate(newDate);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderMiniCalendar = () => {
    const currentDate = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    
    const days = [];
    const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    
    const weekdayHeaders = weekdays.map((day) => (
      <div key={day} className="text-xs font-medium text-center text-gray-500 py-1">
        {day}
      </div>
    ));

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = currentDate.getDate() === day && 
                      currentDate.getMonth() === month && 
                      currentDate.getFullYear() === year;
      
      days.push(
        <div 
          key={`day-${day}`}
          className={`h-8 flex items-center justify-center text-sm ${
            isToday 
              ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center' 
              : 'text-gray-700 hover:bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center'
          }`}
        >
          {day}
        </div>
      );
    }

    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <span className="font-medium text-gray-700">
            {date.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
          </span>
          <div className="flex gap-1">
            <button 
              onClick={moveToPrevious}
              className="p-1 rounded hover:bg-gray-100"
            >
              ‹
            </button>
            <button 
              onClick={moveToNext}
              className="p-1 rounded hover:bg-gray-100"
            >
              ›
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdayHeaders}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="font-medium text-gray-700 mb-2">Today {currentDate.toLocaleDateString()}</div>
          <div className="text-sm text-gray-600">
            No events scheduled
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="calendar-wrapper flex-1">
        <div className="calendar-header flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
          <div className="navigation-controls flex items-center gap-1">
            <button 
              onClick={moveToPrevious}
              className="nav-btn px-3 py-1 bg-gray-100 rounded-l-md border border-gray-300 hover:bg-gray-200 transition-colors"
            >
              <span className="sr-only">Previous</span>
              <span aria-hidden="true">‹</span>
            </button>
            <button 
              onClick={moveToToday}
              className="today-btn px-4 py-1 bg-gray-100 border-t border-b border-gray-300 hover:bg-gray-200 transition-colors"
            >
              Today
            </button>
            <button 
              onClick={moveToNext}
              className="nav-btn px-3 py-1 bg-gray-100 rounded-r-md border border-gray-300 hover:bg-gray-200 transition-colors"
            >
              <span className="sr-only">Next</span>
              <span aria-hidden="true">›</span>
            </button>
            <h2 className="ml-4 text-lg font-semibold text-gray-700">
              {date.toLocaleDateString('default', { 
                month: 'long', 
                year: 'numeric',
                ...(view === Views.WEEK && { day: 'numeric' })
              })}
            </h2>
          </div>
          
          <div className="view-controls flex items-center mx-auto">
            <button 
              className={`view-btn px-3 py-1 border border-gray-300 hover:bg-gray-200 transition-colors ${
                view === Views.DAY ? 'bg-gray-200' : 'bg-gray-100'
              } rounded-l-md`}
              onClick={() => handleView(Views.DAY)}
            >
              Day
            </button>
            <button 
              className={`view-btn px-3 py-1 border-t border-b border-gray-300 hover:bg-gray-200 transition-colors ${
                view === Views.WEEK ? 'bg-gray-200' : 'bg-gray-100'
              }`}
              onClick={() => handleView(Views.WEEK)}
            >
              Week
            </button>
            <button 
              className={`view-btn px-3 py-1 border border-gray-300 hover:bg-gray-200 transition-colors ${
                view === Views.MONTH ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}
              onClick={() => handleView(Views.MONTH)}
            >
              Month
            </button>
          </div>

          <div className="flex items-center">
          <label className="block text-sm font-medium text-gray-700 mr-2">
            Filter
          </label>
          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={isLoading}
          >
            <option value="">All Programs</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        </div>
        </div>
  

        <div 
          ref={calendarContainerRef} 
          className="calendar-container rounded-lg border border-gray-200 overflow-hidden"
          style={{ 
            height: height, 
            position: "relative",
            width: "100%"
          }}
        >
          <Calendar
            localizer={localizer}
            events={sessions}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            style={{ 
              minHeight: "100%", 
              width: "100%" 
            }}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            view={view}
            onView={handleView}
            date={date}
            onNavigate={handleNavigate}
            onSelectEvent={onSessionClick}
            eventPropGetter={eventStyleGetter}
            dayPropGetter={dayPropGetter}
          />
        </div>
      </div>
  
      <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
        {/* Moved Program Filter to the right side */}
        
  
        {/* Mini Calendar */}
        {renderMiniCalendar()}
      </div>
  
      <style jsx global>{`
        .rbc-calendar {
          width: 100%;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .rbc-toolbar {
          display: none;
        }
        
        .rbc-month-view,
        .rbc-time-view {
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }
        
        .rbc-header {
          padding: 0.75rem 0.25rem;
          font-weight: 600;
          font-size: 0.875rem;
          text-transform: uppercase;
          color: #4b5563;
          background-color: #f9fafb;
        }
        
        .rbc-date-cell {
          padding: 0.25rem 0.5rem;
          text-align: right;
          color: #374151;
          font-weight: 400;
        }
        
        .rbc-off-range {
          color: #9ca3af;
        }
        
        .rbc-today {
          background-color: #f0f9ff;
        }
        
        .rbc-event {
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        
        .rbc-event:hover {
          transform: scale(1.01);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .rbc-show-more {
          color: #3b82f6;
          font-weight: 500;
          font-size: 0.85em;
          padding: 0.125rem 0.25rem;
          background-color: transparent;
        }
        
        .rbc-toolbar button {
          color: #4b5563;
        }
        
        .rbc-toolbar button.rbc-active {
          background-color: #3b82f6;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default SessionCalendar;