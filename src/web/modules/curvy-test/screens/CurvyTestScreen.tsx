import React, { useState } from 'react'
import { ScrollView, View, TextInput, Button, Text, StyleSheet } from 'react-native'
import useControllerState from '@web/hooks/useControllerState'
import useBackgroundService from '@web/hooks/useBackgroundService'

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#1a1a1a' },
  section: { marginBottom: 16, padding: 12, backgroundColor: '#2a2a2a', borderRadius: 8 },
  label: { color: '#aaa', fontSize: 12, marginBottom: 4 },
  value: { color: '#fff', fontSize: 14, marginBottom: 8 },
  error: { color: '#f55', fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
    fontSize: 13
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  json: {
    color: '#7f7',
    fontSize: 11,
    fontFamily: 'monospace',
    backgroundColor: '#111',
    padding: 8,
    borderRadius: 4
  },
  title: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }
})

export default function CurvyTestScreen() {
  const { dispatch } = useBackgroundService()
  const state = useControllerState('curvyTest')

  const [curvyId, setCurvyId] = useState('')
  const [chainIdStr, setChainIdStr] = useState('11155111')
  const [apiBaseUrl, setApiBaseUrl] = useState('')

  const [shieldContract, setShieldContract] = useState('')
  const [shieldAmount, setShieldAmount] = useState('')

  const [transferContract, setTransferContract] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferTo, setTransferTo] = useState('')

  const [unshieldContract, setUnshieldContract] = useState('')
  const [unshieldAmount, setUnshieldAmount] = useState('')
  const [unshieldTo, setUnshieldTo] = useState('')

  const handleInit = () => {
    dispatch({
      type: 'CURVY_TEST_CONTROLLER_INIT',
      params: {
        curvyId: curvyId || undefined,
        environment: 'testnet' as const,
        chainId: BigInt(chainIdStr || '11155111'),
        apiBaseUrl: apiBaseUrl || undefined
      }
    })
  }

  const handleFetchBalance = () => {
    dispatch({ type: 'CURVY_TEST_CONTROLLER_FETCH_BALANCE' })
  }

  const handleShield = () => {
    dispatch({
      type: 'CURVY_TEST_CONTROLLER_SHIELD',
      params: {
        asset: {
          asset: { __type: 'erc20' as const, contract: shieldContract as `0x${string}` },
          amount: BigInt(shieldAmount || '0')
        }
      }
    })
  }

  const handleTransfer = () => {
    dispatch({
      type: 'CURVY_TEST_CONTROLLER_TRANSFER',
      params: {
        asset: {
          asset: { __type: 'erc20' as const, contract: transferContract as `0x${string}` },
          amount: BigInt(transferAmount || '0')
        },
        toCurvyId: transferTo
      }
    })
  }

  const handleUnshield = () => {
    dispatch({
      type: 'CURVY_TEST_CONTROLLER_UNSHIELD',
      params: {
        asset: {
          asset: { __type: 'erc20' as const, contract: unshieldContract as `0x${string}` },
          amount: BigInt(unshieldAmount || '0')
        },
        toAddress: unshieldTo
      }
    })
  }

  const handleDestroy = () => {
    dispatch({ type: 'CURVY_TEST_CONTROLLER_DESTROY' })
  }

  return (
    <ScrollView style={styles.container}>
      {/* Status */}
      <View style={styles.section}>
        <Text style={styles.title}>Curvy Test</Text>
        <Text style={styles.label}>Status</Text>
        <Text style={[styles.value, state.status === 'error' && styles.error]}>
          {state.status || 'idle'}
        </Text>
        {!!state.curvyId && (
          <>
            <Text style={styles.label}>Curvy ID</Text>
            <Text style={styles.value}>{state.curvyId}</Text>
          </>
        )}
        {!!state.error && (
          <>
            <Text style={styles.label}>Error</Text>
            <Text style={styles.error}>{state.error}</Text>
          </>
        )}
      </View>

      {/* Init */}
      <View style={styles.section}>
        <Text style={styles.title}>Initialize</Text>
        <Text style={styles.label}>Curvy ID (optional — leave blank to login)</Text>
        <TextInput
          style={styles.input}
          value={curvyId}
          onChangeText={setCurvyId}
          placeholder="my-curvy-id"
          placeholderTextColor="#555"
        />
        <Text style={styles.label}>Chain ID</Text>
        <TextInput
          style={styles.input}
          value={chainIdStr}
          onChangeText={setChainIdStr}
          placeholder="11155111"
          placeholderTextColor="#555"
          keyboardType="numeric"
        />
        <Text style={styles.label}>API Base URL (blank = https://api.curvy.box)</Text>
        <TextInput
          style={styles.input}
          value={apiBaseUrl}
          onChangeText={setApiBaseUrl}
          placeholder="http://localhost:8080"
          placeholderTextColor="#555"
          autoCapitalize="none"
        />
        <Button title="Initialize" onPress={handleInit} />
      </View>

      {/* Balance */}
      <View style={styles.section}>
        <Text style={styles.title}>Balance</Text>
        <Button title="Fetch Balance" onPress={handleFetchBalance} />
        {state.balance?.length > 0 && (
          <Text style={styles.json}>{JSON.stringify(state.balance, bigintReplacer, 2)}</Text>
        )}
      </View>

      {/* Shield */}
      <View style={styles.section}>
        <Text style={styles.title}>Shield</Text>
        <Text style={styles.label}>ERC20 contract address</Text>
        <TextInput
          style={styles.input}
          value={shieldContract}
          onChangeText={setShieldContract}
          placeholder="0x..."
          placeholderTextColor="#555"
        />
        <Text style={styles.label}>Amount (wei)</Text>
        <TextInput
          style={styles.input}
          value={shieldAmount}
          onChangeText={setShieldAmount}
          placeholder="1000000"
          placeholderTextColor="#555"
          keyboardType="numeric"
        />
        <Button title="Prepare Shield" onPress={handleShield} />
      </View>

      {/* Transfer */}
      <View style={styles.section}>
        <Text style={styles.title}>Transfer</Text>
        <Text style={styles.label}>ERC20 contract address</Text>
        <TextInput
          style={styles.input}
          value={transferContract}
          onChangeText={setTransferContract}
          placeholder="0x..."
          placeholderTextColor="#555"
        />
        <Text style={styles.label}>Amount (wei)</Text>
        <TextInput
          style={styles.input}
          value={transferAmount}
          onChangeText={setTransferAmount}
          placeholder="1000000"
          placeholderTextColor="#555"
          keyboardType="numeric"
        />
        <Text style={styles.label}>Recipient Curvy ID</Text>
        <TextInput
          style={styles.input}
          value={transferTo}
          onChangeText={setTransferTo}
          placeholder="recipient-curvy-id"
          placeholderTextColor="#555"
        />
        <Button title="Transfer" onPress={handleTransfer} />
      </View>

      {/* Unshield */}
      <View style={styles.section}>
        <Text style={styles.title}>Unshield</Text>
        <Text style={styles.label}>ERC20 contract address</Text>
        <TextInput
          style={styles.input}
          value={unshieldContract}
          onChangeText={setUnshieldContract}
          placeholder="0x..."
          placeholderTextColor="#555"
        />
        <Text style={styles.label}>Amount (wei)</Text>
        <TextInput
          style={styles.input}
          value={unshieldAmount}
          onChangeText={setUnshieldAmount}
          placeholder="1000000"
          placeholderTextColor="#555"
          keyboardType="numeric"
        />
        <Text style={styles.label}>Recipient address</Text>
        <TextInput
          style={styles.input}
          value={unshieldTo}
          onChangeText={setUnshieldTo}
          placeholder="0x..."
          placeholderTextColor="#555"
        />
        <Button title="Unshield" onPress={handleUnshield} />
      </View>

      {/* Last Result */}
      {state.lastResult !== null && (
        <View style={styles.section}>
          <Text style={styles.title}>Last Result</Text>
          <Text style={styles.json}>{JSON.stringify(state.lastResult, bigintReplacer, 2)}</Text>
        </View>
      )}

      <View style={[styles.section, { marginBottom: 32 }]}>
        <Button title="Destroy / Reset" color="#a44" onPress={handleDestroy} />
      </View>
    </ScrollView>
  )
}

function bigintReplacer(_key: string, value: any) {
  return typeof value === 'bigint' ? value.toString() : value
}
