import React, { useEffect, useState } from "react";

const Sidebar: React.FC<{
  session: any;
  reservations: any[];
  onClose: () => void;
}> = ({ session, reservations, onClose }) => {
  const [memberNames, setMemberNames] = useState<Record<number, string>>({});
  const [checkInStatus, setCheckInStatus] = useState<Record<number, boolean>>({});
  const [attendanceMap, setAttendanceMap] = useState<Record<number, number>>({});

  // Fetch member names
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

  // Check time window
  const isWithinTimeWindow = () => {
    const now = new Date();
    const start = new Date(now.getTime() - 15 * 60 * 1000);
    const end = new Date(now.getTime() - 15 * 60 * 1000);

    const earlyWindow = new Date(start.getTime() - 15 * 60 * 1000);
    const lateWindow = new Date(end.getTime() + 15 * 60 * 1000);

    return now >= earlyWindow && now <= lateWindow;
  };

  // Check-in / Check-out handler
  const handleCheckInOut = async (
    reservationId: number,
    memberId: number,
    type: "in" | "out"
  ) => {
    const now = new Date();
    const payload =
      type === "in"
        ? {
            startTime: session.start,
            endTime: session.end,
            checkInTime: now,
          }
        : {
            checkOutTime: now,
          };

    try {
      let url = `http://localhost:3000/api/protected/loc/${session.locationId}/members/${memberId}/attendances/${reservationId}`;
      const method = type === "in" ? "POST" : "PATCH";

      if (type === "out") {
        const attendanceId = attendanceMap[reservationId];
        if (!attendanceId) {
          console.error("Attendance ID is missing or invalid for check-out.");
          return;
        }

        url = `http://localhost:3000/api/protected/loc/${session.locationId}/members/${memberId}/attendances/${reservationId}/checkout/${attendanceId}`;
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Failed to check ${type}`);

      const data = await res.json();
      console.log(`${type === "in" ? "Checked in" : "Checked out"}:`, data);

      if (type === "in") {
        const attendance = Array.isArray(data) ? data[0] : data;

        if (!attendance?.id) {
          console.error("Check-in response does not contain a valid attendance ID.");
          return;
        }

        setAttendanceMap((prev) => ({
          ...prev,
          [reservationId]: Number(attendance.id),
        }));

        setCheckInStatus((prev) => ({ ...prev, [reservationId]: true }));
      } else if (type === "out") {
        setCheckInStatus((prev) => ({ ...prev, [reservationId]: false }));
      }
    } catch (err) {
      console.error(`Error during check-${type}:`, err);
    }
  };

  return (
    <div className="fixed top-0 right-0 w-80 h-full bg-white shadow-lg z-50 p-4 overflow-y-auto">
      <div className="flex justify-between items-center border-b pb-2 mb-4">
        <h2 className="text-lg font-semibold">Session Details</h2>
        <button onClick={onClose} className="text-sm text-red-500 font-medium">
          Close
        </button>
      </div>

      <h3 className="font-medium mb-1">{session.title}</h3>
      <p className="text-sm text-gray-600">Start: {session.start.toString()}</p>
      <p className="text-sm text-gray-600 mb-3">End: {session.end.toString()}</p>
      <p className="text-sm text-gray-600 mb-3">Duration: {session.duration}</p>

      <h4 className="font-semibold mb-2">Reservations:</h4>
      {reservations.length > 0 ? (
        <ul className="space-y-2">
          {reservations.map((res) => (
            <li key={res.id} className="flex justify-between items-center text-sm">
              <span>{memberNames[res.memberId] || "Loading..."}</span>

              {isWithinTimeWindow() && (
                <div className="flex space-x-2 ml-2">
                  <button
                    className={`px-2 py-1 rounded text-xs ${
                      checkInStatus[res.id]
                        ? "bg-gray-300 text-white"
                        : "bg-green-500 text-white"
                    }`}
                    onClick={() => handleCheckInOut(res.id, res.memberId, "in")}
                    disabled={!!checkInStatus[res.id]}
                  >
                    Check In
                  </button>

                  <button
                    className={`px-2 py-1 rounded text-xs ${
                      !checkInStatus[res.id]
                        ? "bg-gray-300 text-white"
                        : "bg-red-500 text-white"
                    }`}
                    onClick={() => handleCheckInOut(res.id, res.memberId, "out")}
                    disabled={!checkInStatus[res.id]}
                  >
                    Check Out
                  </button>
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
