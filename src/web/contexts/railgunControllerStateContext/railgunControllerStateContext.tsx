/* eslint-disable no-console */
import React, { createContext } from 'react'

import { EnhancedRailgunControllerState } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT  (Railgun disabled — stubbed out for dev/testing)
// ─────────────────────────────────────────────────────────────────────────────

const RailgunControllerStateContext = createContext<EnhancedRailgunControllerState>(
  {} as EnhancedRailgunControllerState
)

const RailgunControllerStateProvider: React.FC<any> = ({ children }) => {
  // Stubbed: skip all railgun initialization, just pass empty context
  return (
    <RailgunControllerStateContext.Provider value={{} as EnhancedRailgunControllerState}>
      {children}
    </RailgunControllerStateContext.Provider>
  )
}

export { RailgunControllerStateProvider, RailgunControllerStateContext }
