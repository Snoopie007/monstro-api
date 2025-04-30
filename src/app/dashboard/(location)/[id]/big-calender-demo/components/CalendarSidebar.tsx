"use client";

import { format, isToday, isSameDay, addDays } from "date-fns";

const CalendarSidebar = ({ programs, events }: { programs: any[], events: any[] }) => {
  const todaysEvents = events.filter(event => isToday(new Date(event.start)));
  const tomorrowsEvents = events.filter(event => isSameDay(new Date(event.start), addDays(new Date(), 1)));

  return (
    <div className="w-80 bg-white border-l p-6 overflow-y-auto">
      <h2 className="text-xl font-bold mb-6 text-gray-800">My Calendars</h2>
      
      <div className="space-y-4">
        {programs.map(program => (
          <div key={program.id} className="flex items-center">
            <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: program.color || '#3b82f6' }}></div>
            <span className="text-sm">{program.name}</span>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="font-bold mb-4 text-gray-700">Quick View</h3>
        <div className="space-y-2">
          <button className="w-full text-left p-2 hover:bg-gray-100 rounded">Day</button>
          <button className="w-full text-left p-2 hover:bg-gray-100 rounded">Week</button>
          <button className="w-full text-left p-2 hover:bg-gray-100 rounded">Month</button>
          <button className="w-full text-left p-2 hover:bg-gray-100 rounded">Year</button>
          <button className="w-full text-left p-2 hover:bg-gray-100 rounded">Search</button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="font-bold mb-4 text-gray-700">Upcoming Events</h3>
        
        <div className="mb-6">
          <h4 className="font-bold text-gray-700">TODAY {format(new Date(), 'MMM d, yyyy')}</h4>
          {todaysEvents.length > 0 ? (
            <div className="mt-2 space-y-2">
              {todaysEvents.map((event, index) => (
                <div key={index} className="flex items-start p-3 bg-white rounded-lg shadow-sm border-l-4 border-blue-500">
                  <div className="flex-1">
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
              No events scheduled for today
            </div>
          )}
        </div>

        <div>
          <h4 className="font-bold text-gray-700">TOMORROW {format(addDays(new Date(), 1), 'MMM d, yyyy')}</h4>
          {tomorrowsEvents.length > 0 ? (
            <div className="mt-2 space-y-2">
              {tomorrowsEvents.map((event, index) => (
                <div key={index} className="flex items-start p-3 bg-white rounded-lg shadow-sm border-l-4 border-green-500">
                  <div className="flex-1">
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
              No events scheduled for tomorrow
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarSidebar;