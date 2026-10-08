export type MemberSessionTime = {
	id: string;
	day: number;
	dayLabel: string;
	time: string;
	duration: number;
};

export type MemberProgramSessions = {
	programId: string;
	name: string;
	planNames: string[];
	sessions: MemberSessionTime[];
};

export type MemberSessionsBlock = {
	type: "list";
	label: string;
	programs: MemberProgramSessions[];
};

export type MemberSessionsResult = {
	ok: true;
	memberId: string;
	name: string;
	summary: string;
	block: MemberSessionsBlock;
};
