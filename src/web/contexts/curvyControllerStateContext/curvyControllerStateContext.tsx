/* eslint-disable no-console */
import React, { createContext, useEffect, useRef } from 'react'

import useBackgroundService from '@web/hooks/useBackgroundService'
import useControllerState from '@web/hooks/useControllerState'
import useSelectedAccountControllerState from '@web/hooks/useSelectedAccountControllerState'

import type { CurvyStatus } from '@ambire-common/controllers/curvy/curvy'

export interface CurvyControllerState {
  curvyId: string | null
  balance: any[]
  status: CurvyStatus
  error: string | null
  lastResult: any
}

const CurvyControllerStateContext = createContext<CurvyControllerState>({
  curvyId: null,
  balance: [],
  status: 'idle',
  error: null,
  lastResult: null
})

const CurvyControllerStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { dispatch } = useBackgroundService()
  const curvyState = useControllerState('curvy') as CurvyControllerState | undefined
  const keystoreState = useControllerState('keystore')
  const isUnlocked = !!keystoreState?.isUnlocked
  const { account: selectedAccount } = useSelectedAccountControllerState()

  const initedForAccountRef = useRef<string | null>(null)
  const fetchedForAccountRef = useRef<string | null>(null)

  // Reset refs when account changes so new account gets fresh init + balance fetch
  useEffect(() => {
    if (!selectedAccount) return
    if (initedForAccountRef.current !== selectedAccount.addr) {
      console.log('[CurvyContext] Account changed, resetting init/fetch flags for:', selectedAccount.addr)
      initedForAccountRef.current = null
      fetchedForAccountRef.current = null
    }
  }, [selectedAccount?.addr])

  // Auto-init curvy plugin when account is available and keystore is unlocked
  useEffect(() => {
    if (!isUnlocked || !selectedAccount || !dispatch) return
    if (curvyState?.status === 'initializing') return
    if (initedForAccountRef.current === selectedAccount.addr) return

    console.log('[CurvyContext] Auto-initializing curvy for account:', selectedAccount.addr)
    initedForAccountRef.current = selectedAccount.addr
    dispatch({ type: 'CURVY_CONTROLLER_INIT', params: {} as any })
  }, [isUnlocked, selectedAccount?.addr, dispatch, curvyState?.status])

  // Auto-fetch balance once init completes
  useEffect(() => {
    if (!selectedAccount || !dispatch) return
    if (curvyState?.status !== 'ready') return
    if (fetchedForAccountRef.current === selectedAccount.addr) return

    console.log('[CurvyContext] Auto-fetching balance for account:', selectedAccount.addr)
    fetchedForAccountRef.current = selectedAccount.addr
    dispatch({ type: 'CURVY_CONTROLLER_FETCH_BALANCE' })
  }, [curvyState?.status, selectedAccount?.addr, dispatch])

  const value: CurvyControllerState = {
    curvyId: curvyState?.curvyId ?? null,
    balance: curvyState?.balance ?? [],
    status: curvyState?.status ?? 'idle',
    error: curvyState?.error ?? null,
    lastResult: curvyState?.lastResult ?? null
  }

  return (
    <CurvyControllerStateContext.Provider value={value}>
      {children}
    </CurvyControllerStateContext.Provider>
  )
}

export { CurvyControllerStateProvider, CurvyControllerStateContext }
