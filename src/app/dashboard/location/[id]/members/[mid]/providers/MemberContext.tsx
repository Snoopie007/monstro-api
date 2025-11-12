"use client";
import { Member, MemberLocation, MemberPaymentMethod } from "@/types";
import {
	createContext,
	useReducer,
	ReactElement,
	useCallback,
	useContext,
} from "react";
import { Stripe } from "stripe";

type StateType = {
	member: Member;
	ml: MemberLocation;
};

const enum REDUCER_ACTION_TYPE {
	MUTATE,
	UPDATE_MEMBER,
	UPDATE_MEMBER_LOCATION,
	ADD_PAYMENT_METHOD,
	REMOVE_PAYMENT_METHOD,
}

type ReducerAction = {
	type: REDUCER_ACTION_TYPE;
	payload?:
	| Member
	| MemberLocation
	| MemberPaymentMethod
	| string
	| ((prev: Member) => Member)
	| ((prev: MemberLocation) => MemberLocation);
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
		case REDUCER_ACTION_TYPE.ADD_PAYMENT_METHOD:
			const paymentMethodToAdd = action.payload as MemberPaymentMethod;
			return {
				...state,
				ml: {
					...state.ml,
					memberPaymentMethods: [...(state.ml.memberPaymentMethods || []), paymentMethodToAdd]
				}
			};
		case REDUCER_ACTION_TYPE.REMOVE_PAYMENT_METHOD:
			const paymentMethodIdToRemove = action.payload as string;
			return {
				...state,
				ml: {
					...state.ml,
					memberPaymentMethods: (state.ml.memberPaymentMethods || []).filter(
						pm => pm.stripeId !== paymentMethodIdToRemove
					)
				}
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

	const addPaymentMethod = useCallback((paymentMethod: Stripe.PaymentMethod) => {
		dispatch({
			type: REDUCER_ACTION_TYPE.ADD_PAYMENT_METHOD,
			payload: paymentMethod as unknown as MemberPaymentMethod,
		});
	}, []);

	const removePaymentMethod = useCallback((paymentMethodId: string) => {
		dispatch({
			type: REDUCER_ACTION_TYPE.REMOVE_PAYMENT_METHOD,
			payload: paymentMethodId,
		});
	}, []);

	return {
		state,
		mutate,
		updateMember,
		updateMemberLocation,
		addPaymentMethod,
		removePaymentMethod,
	};
};

type UseMemberContextType = ReturnType<typeof useMemberContext>;

export const MemberContext = createContext<UseMemberContextType | null>(null);

type MemberProviderType = {
	ml: MemberLocation;
	member: Member;
	children?: ReactElement | ReactElement[] | undefined;
};

export const MemberProvider = ({
	member,
	ml,
	children,
}: MemberProviderType): ReactElement => {
	return (
		<MemberContext.Provider
			value={useMemberContext({ member, ml })}
		>
			{children}
		</MemberContext.Provider>
	);
};

type UseMemberStatusHookType = {
	member: Member;
	ml: MemberLocation;
	mutate: (member: Member) => void;
	updateMember: (memberOrFn: Member | ((prev: Member) => Member)) => void;
	updateMemberLocation: (
		memberLocationOrFn:
			| MemberLocation
			| ((prev: MemberLocation) => MemberLocation)
	) => void;
	addPaymentMethod: (paymentMethod: Stripe.PaymentMethod) => void;
	removePaymentMethod: (paymentMethodId: string) => void;
};

export const useMemberStatus = (): UseMemberStatusHookType => {
	const context = useContext(MemberContext);
	if (!context) {
		throw new Error("useMemberStatus must be used within a MemberProvider");
	}
	const {
		state: { member, ml },
		mutate,
		updateMember,
		updateMemberLocation,
		addPaymentMethod,
		removePaymentMethod,
	} = context;
	return { member, ml, mutate, updateMember, updateMemberLocation, addPaymentMethod, removePaymentMethod };
};
