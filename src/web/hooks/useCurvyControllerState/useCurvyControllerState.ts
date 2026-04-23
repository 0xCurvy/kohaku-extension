import { useContext } from 'react'

import { CurvyControllerStateContext } from '@web/contexts/curvyControllerStateContext'

export default function useCurvyControllerState() {
  const context = useContext(CurvyControllerStateContext)

  if (!context) {
    throw new Error('useCurvyControllerState must be used within a CurvyControllerStateProvider')
  }

  return context
}
