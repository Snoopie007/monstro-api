"use client";
import {
  createContext,
  useReducer,
  ReactElement,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { ReportFilters } from "@/types/reports";
import { DateRange } from "react-day-picker";

interface ReportState {
  filters: ReportFilters;
}

const enum REDUCER_ACTION_TYPE {
  SET_FILTERS,
  UPDATE_DATE_RANGE,
  RESET_FILTERS,
}

type ReducerAction =
  | { type: REDUCER_ACTION_TYPE.SET_FILTERS; payload: ReportFilters }
  | {
      type: REDUCER_ACTION_TYPE.UPDATE_DATE_RANGE;
      payload: DateRange | undefined;
    }
  | { type: REDUCER_ACTION_TYPE.RESET_FILTERS };

const reducer = (state: ReportState, action: ReducerAction): ReportState => {
  switch (action.type) {
    case REDUCER_ACTION_TYPE.SET_FILTERS:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };
    case REDUCER_ACTION_TYPE.UPDATE_DATE_RANGE:
      return {
        ...state,
        filters: {
          ...state.filters,
          dateRange: action.payload,
          startDate: action.payload?.from,
          endDate: action.payload?.to,
        },
      };
    case REDUCER_ACTION_TYPE.RESET_FILTERS:
      return {
        ...state,
        filters: {},
      };
    default:
      throw new Error("Unknown action type");
  }
};

const useReportContext = (initState: ReportState) => {
  const [state, dispatch] = useReducer(reducer, initState);

  const setFilters = useCallback((filters: ReportFilters) => {
    dispatch({
      type: REDUCER_ACTION_TYPE.SET_FILTERS,
      payload: filters,
    });
  }, []);

  const updateDateRange = useCallback((dateRange: DateRange | undefined) => {
    dispatch({
      type: REDUCER_ACTION_TYPE.UPDATE_DATE_RANGE,
      payload: dateRange,
    });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({
      type: REDUCER_ACTION_TYPE.RESET_FILTERS,
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      state,
      setFilters,
      updateDateRange,
      resetFilters,
    }),
    [state, setFilters, updateDateRange, resetFilters]
  );

  return contextValue;
};

type UseReportContextType = ReturnType<typeof useReportContext>;

export const ReportContext = createContext<UseReportContextType | null>(null);

interface ReportProviderProps {
  children: ReactElement | ReactElement[];
}

export const ReportProvider = ({
  children,
}: ReportProviderProps): ReactElement => {
  const contextValue = useReportContext({ filters: {} });

  return (
    <ReportContext.Provider value={contextValue}>
      {children}
    </ReportContext.Provider>
  );
};

interface UseReportFiltersHookType {
  filters: ReportFilters;
  setFilters: (filters: ReportFilters) => void;
  updateDateRange: (dateRange: DateRange | undefined) => void;
  resetFilters: () => void;
}

export const useReportFilters = (): UseReportFiltersHookType => {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error("useReportFilters must be used within a ReportProvider");
  }

  const {
    state: { filters },
    setFilters,
    updateDateRange,
    resetFilters,
  } = context;

  return {
    filters,
    setFilters,
    updateDateRange,
    resetFilters,
  };
};
