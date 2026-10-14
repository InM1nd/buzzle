import React, { createContext, useContext } from "react";

export type BeeArtVariant = "original" | "honey" | "reference";
const BeeArtContext = createContext<BeeArtVariant>("original");
export const BeeArtProvider = BeeArtContext.Provider;
export const useBeeArtVariant = () => useContext(BeeArtContext);
