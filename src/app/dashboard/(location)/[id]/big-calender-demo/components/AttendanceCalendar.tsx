"use client";
import React from "react";
import { Calendar } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import localizer from "@/libs/calendarLocalizer";

const SessionCalendar: React.FC<{ selectedProgramId: string }> = ({ selectedProgramId }) => {
  console.log("Selected Program:", selectedProgramId);

  return (
    <div className="overflow-y-auto" style={{ height: "60vh" }}>
      <Calendar
        localizer={localizer}
        events={[]} 
        startAccessor="start"
        endAccessor="end"
        titleAccessor="title"
        style={{ height: "100%" }}
        views={["month"]}
      />
    </div>
  );
};

export default SessionCalendar;
