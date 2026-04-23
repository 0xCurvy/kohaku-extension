/**
 * Curvy form hook that matches the interface expected by useDepositForm.
 *
 * Unlike Railgun/PPv1, Curvy plugin handles shield/transfer/unshield through
 * its own broadcast mechanism — no AccountOp signing flow. The shield operation
 * does produce an AccountOp for the on-chain approve+deposit, so we wire it
 * through the standard estimation modal. Transfer and unshield are handled
 * separately (direct broadcast via the plugin).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useModalize } from 'react-native-modalize'
import { formatUnits, parseUnits } from 'viem'

import { TokenResult } from '@ambire-common/libs/portfolio'
import { getTokenAmount } from '@ambire-common/libs/portfolio/helpers'
import { AddressState, AddressStateOptional } from '@ambire-common/interfaces/domains'
import useAddressInput from '@common/hooks/useAddressInput'
import useBackgroundService from '@web/hooks/useBackgroundService'
import useControllerState from '@web/hooks/useControllerState'
import useSelectedAccountControllerState from '@web/hooks/useSelectedAccountControllerState'

const useCurvyForm = () => {
  const { dispatch } = useBackgroundService()
  const curvyState = useControllerState('curvy')
  const { portfolio } = useSelectedAccountControllerState()

  const { ref: estimationModalRef, open: openEstimationModal, close: closeModalRaw } = useModalize()

  const [depositAmount, setDepositAmount] = useState<string>('')
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('')
  const [selectedToken, setSelectedToken] = useState<TokenResult | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [amountFieldMode, setAmountFieldMode] = useState<'token' | 'fiat'>('token')
  const [isRecipientAddressUnknownAgreed, setIsRecipientAddressUnknownAgreed] = useState(false)
  const [programmaticUpdateCounter, setProgrammaticUpdateCounter] = useState(0)

  const [addressState, setAddressStateRaw] = useState<AddressState>({
    fieldValue: '',
    ensAddress: '',
    isDomainResolving: false
  })

  const setAddressState = useCallback((newState: AddressStateOptional) => {
    setAddressStateRaw((prev) => ({ ...prev, ...newState }))
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCacheResolvedDomain = useCallback((..._args: [string, string, 'ens']) => {}, [])

  const addressInputState = useAddressInput({
    addressState,
    setAddressState,
    overwriteError: '',
    overwriteValidLabel: '',
    handleCacheResolvedDomain
  })

  // Surface curvy controller errors to the user
  useEffect(() => {
    if (curvyState?.error) {
      setMessage({ type: 'error', text: curvyState.error })
    }
  }, [curvyState?.error])

  const closeEstimationModal = useCallback(() => {
    closeModalRaw()
  }, [closeModalRaw])

  const resetForm = useCallback(() => {
    setDepositAmount('')
    setWithdrawalAmount('')
    setMessage(null)
    setSelectedToken(null)
    setAmountFieldMode('token')
    setIsRecipientAddressUnknownAgreed(false)
    setProgrammaticUpdateCounter(0)
    setAddressStateRaw({ fieldValue: '', ensAddress: '', isDomainResolving: false })
  }, [])

  const handleUpdateForm = useCallback(
    (params: { [key: string]: any }) => {
      if (params.depositAmount !== undefined) setDepositAmount(params.depositAmount)
      if (params.withdrawalAmount !== undefined) {
        setWithdrawalAmount(params.withdrawalAmount)
        setProgrammaticUpdateCounter((c) => c + 1)
      }
      if (params.selectedToken !== undefined) setSelectedToken(params.selectedToken)
      if (params.addressState !== undefined) {
        setAddressState(params.addressState)
        setProgrammaticUpdateCounter((c) => c + 1)
      }
      setMessage(null)
    },
    [setAddressState]
  )

  const ethPrice = useMemo(() => {
    return portfolio.tokens
      .find((token) => token.name === 'Ether')
      ?.priceIn.find((price) => price.baseCurrency === 'usd')?.price
  }, [portfolio.tokens])

  // Curvy balance from controller state
  const curvyBalance = curvyState?.balance || []

  const totalApprovedBalance = useMemo(() => {
    // eslint-disable-next-line no-console
    console.log('[useCurvyForm] curvyBalance raw:', curvyBalance)
    // Sum all balances from curvy plugin
    // Each item is AssetAmount: { asset: AssetId, amount: bigint }
    const total = curvyBalance.reduce((sum: bigint, b: any) => {
      try {
        // b.amount is bigint from AssetAmount type
        const amt = b.amount !== undefined ? BigInt(b.amount) : BigInt(b.balance || 0)
        // eslint-disable-next-line no-console
        console.log('[useCurvyForm] balance item:', b.asset, 'amount:', amt.toString())
        return sum + amt
      } catch {
        return sum
      }
    }, 0n)
    // eslint-disable-next-line no-console
    console.log('[useCurvyForm] totalApprovedBalance:', total.toString())
    return { total, accounts: curvyBalance }
  }, [curvyBalance])

  const totalPendingBalance = useMemo(() => ({ total: 0n, accounts: [] }), [])
  const totalDeclinedBalance = useMemo(() => ({ total: 0n, accounts: [] }), [])
  const emptyImportedBalance = useMemo(() => ({ total: 0n, accounts: [] }), [])

  const ethPrivateBalance = useMemo(() => {
    try {
      return formatUnits(totalApprovedBalance.total, 18)
    } catch {
      return '0'
    }
  }, [totalApprovedBalance.total])

  const totalPrivatePortfolio = useMemo(
    () => Number(ethPrivateBalance) * (ethPrice || 0),
    [ethPrivateBalance, ethPrice]
  )

  // For shield: build native or erc20 asset and dispatch to controller
  const handleDeposit = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('[useCurvyForm] handleDeposit called', { depositAmount, selectedToken: selectedToken?.address, curvyStatus: curvyState?.status })
    if (!depositAmount || !selectedToken) {
      // eslint-disable-next-line no-console
      console.warn('[useCurvyForm] handleDeposit early return: missing depositAmount or selectedToken')
      return
    }

    if (curvyState?.status !== 'ready') {
      // eslint-disable-next-line no-console
      console.warn('[useCurvyForm] handleDeposit: curvy plugin not ready, status =', curvyState?.status)
      setMessage({ type: 'error', text: 'Curvy plugin is not ready yet. Please wait.' })
      return
    }

    const isNative = selectedToken.address === '0x0000000000000000000000000000000000000000'
    const asset = isNative
      ? { __type: 'native' as const }
      : { __type: 'erc20' as const, contract: selectedToken.address as `0x${string}` }

    // eslint-disable-next-line no-console
    console.log('[useCurvyForm] dispatching CURVY_CONTROLLER_SHIELD', { asset, amount: depositAmount })

    // prepareShield internally calls syncSignAccountOp, building the AccountOp
    dispatch({
      type: 'CURVY_CONTROLLER_SHIELD',
      params: {
        asset: { asset, amount: BigInt(depositAmount) }
      }
    })

    dispatch({
      type: 'CURVY_CONTROLLER_HAS_USER_PROCEEDED',
      params: { proceeded: true }
    })

    openEstimationModal()
  }, [depositAmount, selectedToken, curvyState?.status, dispatch, openEstimationModal])

  const validationFormMsgs = useMemo(() => {
    const amount = (() => {
      if (!depositAmount || !selectedToken) return { success: false, message: '' }
      try {
        const formatted = formatUnits(BigInt(depositAmount), selectedToken.decimals)
        if (Number(formatted) <= 0)
          return { success: false, message: 'The amount must be greater than 0.' }

        const tokenInPortfolio = portfolio.tokens.find(
          (t) =>
            t.chainId === selectedToken.chainId &&
            t.address.toLowerCase() === selectedToken.address.toLowerCase()
        )
        const tokenBalance = tokenInPortfolio ? getTokenAmount(tokenInPortfolio) : 0n
        if (BigInt(depositAmount) > tokenBalance)
          return { success: false, message: 'Insufficient balance.' }

        return { success: true, message: '' }
      } catch {
        return { success: false, message: 'Invalid amount.' }
      }
    })()

    const recipientAddress = { success: true, message: '' }

    return { amount, recipientAddress }
  }, [depositAmount, selectedToken, portfolio.tokens])

  const maxAmount = useMemo(() => {
    if (!selectedToken) return '0'
    const tokenInPortfolio = portfolio.tokens.find(
      (t) =>
        t.chainId === selectedToken.chainId &&
        t.address.toLowerCase() === selectedToken.address.toLowerCase()
    )
    if (!tokenInPortfolio) return '0'
    return formatUnits(getTokenAmount(tokenInPortfolio), selectedToken.decimals)
  }, [selectedToken, portfolio.tokens])

  const handleMultipleRagequit = useCallback(async () => {}, [])
  const handleSelectedAccount = useCallback(() => {}, [])
  const isRagequitLoading = useCallback(() => false, [])

  const isReady = curvyState?.status === 'ready'

  const loadPrivateAccount = useCallback(async () => {
    // Auto-init curvy if not already initialized
    if (curvyState?.status === 'idle') {
      dispatch({
        type: 'CURVY_CONTROLLER_INIT',
        params: {
          environment: 'testnet' as const,
          chainId: BigInt(11155111)
        }
      })
    }
    if (curvyState?.status === 'ready') {
      dispatch({ type: 'CURVY_CONTROLLER_FETCH_BALANCE' })
    }
  }, [curvyState?.status, dispatch])

  const refreshPrivateAccount = useCallback(async () => {
    if (curvyState?.status === 'ready') {
      dispatch({ type: 'CURVY_CONTROLLER_FETCH_BALANCE' })
    }
  }, [curvyState?.status, dispatch])

  return {
    chainId: 11155111n,
    supportedAssets: new Set<string>(),
    ethPrice,
    message,
    poolInfo: null,
    chainData: null,
    seedPhrase: '',
    poolAccounts: [],
    hasProceeded: curvyState?.hasProceeded ?? false,
    depositAmount,
    selectedToken,
    accountService: null,
    syncState: undefined,
    withdrawalAmount,
    privacyProvider: 'curvy' as const,
    showAddedToBatch: false,
    estimationModalRef,
    selectedPoolAccount: null,
    signAccountOpController: curvyState?.signAccountOpController ?? null,
    latestBroadcastedAccountOp: curvyState?.latestBroadcastedAccountOp ?? null,
    isLoading: curvyState?.status === 'initializing',
    isReady,
    isRefreshing: false,
    isAccountLoaded: isReady,
    isLoadingAnonymitySet: false,
    totalApprovedBalance,
    totalPendingBalance,
    totalDeclinedBalance,
    totalPrivatePortfolio,
    ethPrivateBalance,
    totalImportedApprovedBalance: emptyImportedBalance,
    totalImportedPendingBalance: emptyImportedBalance,
    totalImportedDeclinedBalance: emptyImportedBalance,
    totalImportedPrivatePortfolio: 0,
    ethImportedPrivateBalance: '0',
    importedAccountsWithNames: {},
    validationFormMsgs,
    isReadyToLoad: true,
    loadingError: curvyState?.error || null,
    loadingSelectionAlgorithm: false,
    latestBroadcastedToken: null,
    handleDeposit,
    handleMultipleRagequit,
    handleUpdateForm,
    isRagequitLoading,
    closeEstimationModal,
    handleSelectedAccount,
    loadPrivateAccount,
    refreshPrivateAccount,
    addressState,
    setAddressState,
    addressInputState,
    amountFieldMode,
    setAmountFieldMode,
    amountInFiat: '0',
    isRecipientAddressUnknown: false,
    isRecipientAddressUnknownAgreed,
    setIsRecipientAddressUnknownAgreed,
    maxAmount,
    programmaticUpdateCounter,
    relayerQuote: null,
    updateQuoteStatus: () => {},
    unshield: async () => {},
    isUnshielding: false,
    resetForm
  } as const
}

export default useCurvyForm
