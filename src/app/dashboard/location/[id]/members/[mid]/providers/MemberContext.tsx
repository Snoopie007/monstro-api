"use client";
import { Member, MemberLocation } from "@/types";
import {
  createContext,
  useReducer,
  ReactElement,
  useCallback,
  useContext,
} from "react";
import Stripe from "stripe";

type StateType = {
  member: Member;
  ml: MemberLocation;
  paymentMethods: Stripe.PaymentMethod[];
};

const enum REDUCER_ACTION_TYPE {
  MUTATE,
  UPDATE_MEMBER,
  UPDATE_MEMBER_LOCATION,
  ADD_PAYMENT_METHODS,
}

type ReducerAction = {
  type: REDUCER_ACTION_TYPE;
  payload?:
    | Member
    | MemberLocation
    | Stripe.PaymentMethod
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
    case REDUCER_ACTION_TYPE.ADD_PAYMENT_METHODS:
      return {
        ...state,
        paymentMethods: [
          ...state.paymentMethods,
          action.payload as Stripe.PaymentMethod,
        ],
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

  const addPaymentMethods = useCallback(
    (paymentMethods: Stripe.PaymentMethod) => {
      dispatch({
        type: REDUCER_ACTION_TYPE.ADD_PAYMENT_METHODS,
        payload: paymentMethods,
      });
    },
    []
  );

  return {
    state,
    mutate,
    updateMember,
    updateMemberLocation,
    addPaymentMethods,
  };
};

type UseMemberContextType = ReturnType<typeof useMemberContext>;

export const MemberContext = createContext<UseMemberContextType | null>(null);

type MemberProviderType = {
  ml: MemberLocation;
  member: Member;
  paymentMethods: Stripe.PaymentMethod[];
  children?: ReactElement | ReactElement[] | undefined;
};

export const MemberProvider = ({
  member,
  paymentMethods,
  ml,
  children,
}: MemberProviderType): ReactElement => {
  return (
    <MemberContext.Provider
      value={useMemberContext({ member, paymentMethods, ml })}
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
  } = context;
  return { member, ml, mutate, updateMember, updateMemberLocation };
};

type UseMemberPaymenHookType = {
  paymentMethods: Stripe.PaymentMethod[];
  addPaymentMethods: (paymentMethods: Stripe.PaymentMethod) => void;
};

export const useMemberPaymentMethods = (): UseMemberPaymenHookType => {
  const context = useContext(MemberContext);
  if (!context) {
    throw new Error(
      "useMemberPaymentMethods must be used within a MemberProvider"
    );
  }
  const {
    state: { paymentMethods },
    addPaymentMethods,
  } = context;
  return { paymentMethods, addPaymentMethods };
};
