"use client";
import React, { useEffect, useState } from "react";
import { format } from "date-fns";

interface SidebarProps {
	session: {
		id: number;
		title: string;
		start: Date | string;
		end: Date | string;
		duration: number;
		locationId: string;
		resource?: any;
	};
	reservations: Array<{
		id: number;
		memberId: number;
		[key: string]: any;
	}>;
	onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ session, reservations, onClose }) => {
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
							`/api/protected/loc/${session.locationId}/members/${reservation.memberId}`
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
			fetchMemberNames();
		}
	}, [session, reservations]);

	const showButtons = true;

	const isWithinTimeWindow = () => {
		try {
			const now = new Date();
			const startDate = new Date(session.start);
			const endDate = new Date(session.end);


			// Allow 15 minutes before start and 15 minutes after end
			const earlyWindow = new Date(startDate.getTime() - 15 * 60 * 1000);
			const lateWindow = new Date(endDate.getTime() + 15 * 60 * 1000);

			console.log("Early window (15min before):", earlyWindow);
			console.log("Late window (15min after):", lateWindow);

			const isWithin = now >= earlyWindow && now <= lateWindow;
			console.log("Is within window:", isWithin);

			return isWithin;
		} catch (e) {
			console.error("Error checking time window:", e);
			return false;
		}
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
			let url = `/api/protected/loc/${session.locationId}/members/${memberId}/attendances/${reservationId}`;
			const method = type === "in" ? "POST" : "PATCH";

			if (type === "out") {
				const attendanceId = attendanceMap[reservationId];
				if (!attendanceId) {
					console.error("Attendance ID is missing or invalid for check-out.");
					return;
				}
				url = `/api/protected/loc/${session.locationId}/members/${memberId}/attendances/${reservationId}/checkout/${attendanceId}`;
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

	// Safe date formatting
	const formatDate = (date: Date | string) => {
		try {
			const dateObj = date instanceof Date ? date : new Date(date);
			return format(dateObj, "MMMM d, yyyy");
		} catch (e) {
			console.error("Error formatting date:", e);
			return "";
		}
	};

	// Safe time formatting
	const formatTime = (date: Date | string) => {
		try {
			const dateObj = date instanceof Date ? date : new Date(date);
			return format(dateObj, "h:mm a");
		} catch (e) {
			console.error("Error formatting time:", e);
			return "";
		}
	};

	return (
		<div className="fixed inset-y-0 right-0 w-80 h-full bg-white shadow-lg z-50 p-4 overflow-y-auto border-l border-gray-200">
			{/* Close button */}
			<button
				onClick={onClose}
				className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
				aria-label="Close sidebar"
			>
				<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
				</svg>
			</button>

			{/* Session header */}
			<div className="mb-6">
				<h2 className="text-lg font-semibold text-gray-800 mb-1">{session?.title || "Session"}</h2>
				<p className="text-sm text-gray-600">{formatDate(session?.start)}</p>
			</div>

			{/* Today's events section */}
			<div className="mb-6">
				<h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
					<span className="bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
						TODAY
					</span>
					{formatDate(session?.start)}
				</h3>

				{reservations.length > 0 ? (
					<ul className="space-y-3">
						{reservations.map((res) => (
							<li key={res.id} className="pl-4 border-l-2 border-blue-200">
								<div className="flex justify-between items-start">
									<div>
										<p className="text-sm font-medium text-gray-800">
											{memberNames[res.memberId] || "Loading..."}
										</p>
										{session?.start && session?.end && (
											<p className="text-xs text-gray-500">
												{formatTime(session.start)} - {formatTime(session.end)}
											</p>
										)}
									</div>

									{true && ( // Force show buttons for testing
										<div className="flex space-x-2">
											<button
												className={`px-2 py-1 rounded text-xs ${checkInStatus[res.id]
													? "bg-gray-200 text-gray-500 cursor-not-allowed"
													: "bg-green-500 hover:bg-green-600 text-white"
													}`}
												onClick={() => handleCheckInOut(res.id, res.memberId, "in")}
												disabled={!!checkInStatus[res.id]}
											>
												Check In
											</button>
											<button
												className={`px-2 py-1 rounded text-xs ${!checkInStatus[res.id]
													? "bg-gray-200 text-gray-500 cursor-not-allowed"
													: "bg-red-500 hover:bg-red-600 text-white"
													}`}
												onClick={() => handleCheckInOut(res.id, res.memberId, "out")}
												disabled={!checkInStatus[res.id]}
											>
												Check Out
											</button>
										</div>
									)}
								</div>
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-gray-500 pl-4">No reservations for today</p>
				)}
			</div>
		</div>
	);
};

export default Sidebar;