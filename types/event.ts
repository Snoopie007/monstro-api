import { eventRegistrations, eventTickets, locationEvents } from "../schemas/event";
import type { Location } from "./location";
import type { Member } from "./member";
import type { Staff } from "./staff";
import type { Transaction } from "./transaction";

export type LocationEvent = typeof locationEvents.$inferSelect & {
	location?: Location;
	host?: Staff;
	creator?: Staff;
	tickets?: EventTicket[];
	registrations?: EventRegistration[];
};

export type EventTicket = typeof eventTickets.$inferSelect & {
	event?: LocationEvent;
	registrations?: EventRegistration[];
};

export type EventRegistration = typeof eventRegistrations.$inferSelect & {
	event?: LocationEvent;
	member?: Member;
	location?: Location;
	ticket?: EventTicket;
	transaction?: Transaction;
};
