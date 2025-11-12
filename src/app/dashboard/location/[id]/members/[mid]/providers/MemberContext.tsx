"use client";
import { Member, MemberLocation, PaymentMethod } from "@/types";
import {
	createContext,
	useReducer,
	ReactElement,
	useCallback,
	useContext,
} from "react";

type StateType = {
	member: Member;
	ml: MemberLocation;
	paymentMethods: PaymentMethod[];
};

const enum REDUCER_ACTION_TYPE {
	MUTATE,
	UPDATE_MEMBER,
	UPDATE_MEMBER_LOCATION,
	SET_PAYMENT_METHODS,
}

type ReducerAction = {
	type: REDUCER_ACTION_TYPE;
	payload?:
	| Member
	| MemberLocation
	| PaymentMethod[]
	| ((prev: Member) => Member)
	| ((prev: MemberLocation) => MemberLocation)
	| ((prev: PaymentMethod[]) => PaymentMethod[]);
};

const reducer = (state: StateType, action: ReducerAction): StateType => {
	switch (action.type) {
		case REDUCER_ACTION_TYPE.MUTATE:
			return { ...state, member: action.payload as Member };
		case REDUCER_ACTION_TYPE.UPDATE_MEMBER:
			const newMember =
				typeof action.payload === "function"
					? (action.payload as (prev: Member) => Member)(state.member)
					: (action.payload as Member);
			return { ...state, member: newMember };
		case REDUCER_ACTION_TYPE.UPDATE_MEMBER_LOCATION:
			const newMemberLocation =
				typeof action.payload === "function"
					? (action.payload as (prev: MemberLocation) => MemberLocation)(
						state.ml
					)
					: (action.payload as MemberLocation);
			return { ...state, ml: newMemberLocation };
		case REDUCER_ACTION_TYPE.SET_PAYMENT_METHODS:
			const newPaymentMethods =
				typeof action.payload === "function"
					? (action.payload as (prev: PaymentMethod[]) => PaymentMethod[])(
						state.paymentMethods
					)
					: (action.payload as PaymentMethod[]);
			return {
				...state,
				paymentMethods: newPaymentMethods
			};
		default:
			throw new Error();
	}
};

const useMemberContext = (initState: StateType) => {
	const [state, dispatch] = useReducer(reducer, initState);

	const mutate = useCallback((member: Member) => {
		dispatch({
			type: REDUCER_ACTION_TYPE.MUTATE,
			payload: member,
		});
	}, []);

	const updateMember = useCallback(
		(memberOrFn: Member | ((prev: Member) => Member)) => {
			dispatch({
				type: REDUCER_ACTION_TYPE.UPDATE_MEMBER,
				payload: memberOrFn,
			});
		},
		[]
	);

	const updateMemberLocation = useCallback(
		(
			memberLocationOrFn:
				| MemberLocation
				| ((prev: MemberLocation) => MemberLocation)
		) => {
			dispatch({
				type: REDUCER_ACTION_TYPE.UPDATE_MEMBER_LOCATION,
				payload: memberLocationOrFn,
			});
		},
		[]
	);

	const setPaymentMethods = useCallback((paymentMethodsOrFn: PaymentMethod[] | ((prev: PaymentMethod[]) => PaymentMethod[])) => {
		dispatch({
			type: REDUCER_ACTION_TYPE.SET_PAYMENT_METHODS,
			payload: paymentMethodsOrFn,
		});
	}, []);

	return {
		state,
		mutate,
		updateMember,
		updateMemberLocation,
		setPaymentMethods,
	};
};

type UseMemberContextType = ReturnType<typeof useMemberContext>;

export const MemberContext = createContext<UseMemberContextType | null>(null);

type MemberProviderType = {
	ml: MemberLocation;
	paymentMethods: PaymentMethod[];
	member: Member;
	children?: ReactElement | ReactElement[] | undefined;
};

export const MemberProvider = ({
	member,
	ml,
	paymentMethods,
	children,
}: MemberProviderType): ReactElement => {
	return (
		<MemberContext.Provider
			value={useMemberContext({ member, ml, paymentMethods })}
		>
			{children}
		</MemberContext.Provider>
	);
};

type UseMemberStatusHookType = {
	member: Member;
	ml: MemberLocation;
	paymentMethods: PaymentMethod[];
	mutate: (member: Member) => void;
	updateMember: (memberOrFn: Member | ((prev: Member) => Member)) => void;
	updateMemberLocation: (
		memberLocationOrFn:
			| MemberLocation
			| ((prev: MemberLocation) => MemberLocation)
	) => void;
	setPaymentMethods: (paymentMethodsOrFn: PaymentMethod[] | ((prev: PaymentMethod[]) => PaymentMethod[])) => void;
};

export const useMemberStatus = (): UseMemberStatusHookType => {
	const context = useContext(MemberContext);
	if (!context) {
		throw new Error("useMemberStatus must be used within a MemberProvider");
	}
	const {
		state: { member, ml, paymentMethods },
		mutate,
		updateMember,
		updateMemberLocation,
		setPaymentMethods,
	} = context;
	return { member, ml, paymentMethods, mutate, updateMember, updateMemberLocation, setPaymentMethods };
};
