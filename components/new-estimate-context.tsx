"use client";

import { createContext, useContext } from "react";
import type { EstimateType } from "@/lib/types";

export interface EstimateContextValue {
  estimateType: EstimateType | null;
  projectId: string | null;
  materialsIncluded: boolean | null;
  advisorAnswers: Record<string, string> | null;
}

const EMPTY: EstimateContextValue = {
  estimateType: null,
  projectId: null,
  materialsIncluded: null,
  advisorAnswers: null,
};

const Ctx = createContext<EstimateContextValue>(EMPTY);

export const EstimateContextProvider = Ctx.Provider;

/** Read the commercial/residential + project + advisor context set on the
 * New-estimate screen. Any estimate created outside that screen gets EMPTY. */
export function useEstimateContext(): EstimateContextValue {
  return useContext(Ctx);
}
