import React, { useEffect, useState } from "react";

const Sidebar: React.FC<{
  session: any;
  reservations: any[];
  onClose: () => void;
}> = ({ session, reservations, onClose }) => {
  const [memberNames, setMemberNames] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchMemberNames = async () => {
      const namesMap: Record<number, string> = {};

      await Promise.all(
        reservations.map(async (reservation) => {
          try {
            const res = await fetch(
              `http://localhost:3000/api/protected/loc/${session.locationId}/members/${reservation.memberId}`
            );
            const data = await res.json();
            const fullName = `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim();
            namesMap[reservation.memberId] = fullName || "Unknown";
          } catch (err) {
            console.error(`Failed to fetch member ${reservation.memberId}`, err);
            namesMap[reservation.memberId] = "Unknown";
          }
        })
      );

      setMemberNames(namesMap);
    };

    if (session?.locationId && reservations.length > 0) {
      setMemberNames({}); 
      fetchMemberNames();
    }
  }, [session, reservations]);

  const isWithinTimeWindow = () => {
    const now = new Date();
    const start = new Date(now.getTime() - 15 * 60 * 1000); // Adjusted to use the current time minus 15 minutes
    // new Date(session.start);
    const end = new Date(session.end);

    const earlyWindow = new Date(start.getTime() - 15 * 60 * 1000);
    const lateWindow = new Date(end.getTime() + 15 * 60 * 1000);

    return now >= earlyWindow && now <= lateWindow;
  };

  return (
    <div className="fixed top-0 right-0 w-80 h-full bg-white shadow-lg z-50 p-4 overflow-y-auto">
      <div className="flex justify-between items-center border-b pb-2 mb-4">
        <h2 className="text-lg font-semibold">Session Details</h2>
        <button onClick={onClose} className="text-sm text-red-500 font-medium">Close</button>
      </div>

      <h3 className="font-medium mb-1">{session.title}</h3>
      <p className="text-sm text-gray-600">Start: {session.start.toString()}</p>
      <p className="text-sm text-gray-600 mb-3">End: {session.end.toString()}</p>

      <h4 className="font-semibold mb-2">Reservations:</h4>
      {reservations.length > 0 ? (
        <ul className="space-y-2">
          {reservations.map((res) => (
            <li key={res.id} className="flex justify-between items-center text-sm">
              <span>{memberNames[res.memberId] || "Loading..."}</span>

              {isWithinTimeWindow() && (
                <div className="flex space-x-2 ml-2">
                  <button className="px-2 py-1 bg-green-500 text-white rounded text-xs">Check In</button>
                  <button className="px-2 py-1 bg-red-500 text-white rounded text-xs">Check Out</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No reservations.</p>
      )}
    </div>
  );
};

export default Sidebar;
