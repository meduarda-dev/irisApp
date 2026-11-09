import React, { createContext, useContext } from 'react';
import { useTccSession } from '../detection/useTccSession';

type TccContextValue = ReturnType<typeof useTccSession>;

const TccContext = createContext<TccContextValue | null>(null);

export function TccProvider({ children }: { children: React.ReactNode }) {
  const session = useTccSession();
  return <TccContext.Provider value={session}>{children}</TccContext.Provider>;
}

export function useTcc() {
  const ctx = useContext(TccContext);
  if (!ctx) throw new Error('useTcc must be used inside TccProvider');
  return ctx;
}
