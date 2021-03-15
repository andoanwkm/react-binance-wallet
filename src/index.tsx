import {
  BscConnector,
  UserRejectedRequestError
} from '@binance-chain/bsc-connector'
import {
  UnsupportedChainIdError,
  useWeb3React,
  Web3ReactProvider
} from '@web3-react/core'
import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import {
  ChainUnsupportedError,
  ConnectionRejectedError,
  ConnectorUnsupportedError
} from './errors'
import {
  AccountType,
  Status,
  Wallet,
  Balance,
  Account,
  EthereumProvider
} from './types'
import {
  getAccountBalance,
  getAccountIsContract,
  getChainId,
  pollEvery
} from './utils'
import PropTypes from 'prop-types'
import JSBI from 'jsbi'
import { InjectedConnector } from '@web3-react/injected-connector'

const NO_BALANCE = '-1'

type WalletContext = {
  // addBlockNumberListener: (callback: (blockNumber: number) => void) => void
  pollBalanceInterval: number
  // pollBlockNumberInterval: number
  // removeBlockNumberListener: (callback: (blockNumber: number) => void) => void
  wallet: Wallet
} | null

const UseWalletContext = React.createContext<WalletContext>(null)

type WalletProviderProps = {
  children: ReactNode
  pollBalanceInterval: number
  // pollBlockNumberInterval: number
}

const WalletProvider = ({
  children,
  pollBalanceInterval
}: WalletProviderProps) => {
  const walletContext = useContext(UseWalletContext)

  if (walletContext !== null) {
    throw new Error('<WalletProvider /> has already been declared.')
  }

  const [connector, setConnector] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [type, setType] = useState<AccountType | null>(null)
  const [status, setStatus] = useState<Status>('disconnected')
  const web3ReactContext = useWeb3React()
  const activationId = useRef<number>(0)
  const { account, library } = web3ReactContext
  const balance = useWalletBalance({ account, library, pollBalanceInterval })
  const chainId = useChainId({ library })
  const connectors: any = useMemo(
    () => ({
      bsc: () => ({
        web3ReactConnector() {
          return new BscConnector({ supportedChainIds: [56, 97] })
        },
        handleActivationError(err: any) {
          if (err instanceof UserRejectedRequestError) {
            return new ConnectionRejectedError()
          }
          return new Error('Unknown error')
        }
      }),
      injected: () => ({
        web3ReactConnector() {
          return new InjectedConnector({ supportedChainIds: [56, 97] })
        },
        handleActivationError(err: Error) {
          return err instanceof UserRejectedRequestError
            ? new ConnectionRejectedError()
            : null
        }
      })
    }),
    []
  )


  const reset = useCallback(() => {
    if (web3ReactContext.active) {
      web3ReactContext.deactivate()
    }
    setConnector(null)
    setError(null)
    setStatus('disconnected')
  }, [web3ReactContext])

  const connect = useCallback(
    async (connectorId = 'injected') => {
      // Prevent race conditions between connections by using an external ID.
      const id = ++activationId.current

      reset()

      // Check if another connection has happened right after deactivate().
      if (id !== activationId.current) {
        return
      }

      if (!connectors[connectorId]) {
        setStatus('error')
        setError(new ConnectorUnsupportedError(connectorId))
        return
      }

      // If no connection happens, we're in the right context and can safely update
      // the connection stage status
      setStatus('connecting')

      const connectorInit = connectors[connectorId] || []

      // Initialize the (useWallet) connector if it exists.
      const connector = await connectorInit?.()

      // Initialize the web3-react connector if it exists.
      const web3ReactConnector = connector?.web3ReactConnector?.()

      if (!web3ReactConnector) {
        setStatus('error')
        setError(new ConnectorUnsupportedError(connectorId))
        return
      }

      try {
        // TODO: there is no way to prevent an activation to complete, but we
        // could reconnect to the last provider the user tried to connect to.
        setConnector(connectorId)
        await web3ReactContext.activate(web3ReactConnector, undefined, true)
        setStatus('connected')
      } catch (err) {
        // Don’t throw if another connection has happened in the meantime.
        if (id !== activationId.current) {
          return
        }

        // If not, the error has been thrown during the current connection attempt,
        // so it's correct to indicate that there has been an error
        setConnector(null)
        setStatus('error')

        if (err instanceof UnsupportedChainIdError) {
          setError(new ChainUnsupportedError())
          return
        }
        // It might have thrown with an error known by the connector
        if (connector.handleActivationError) {
          const handledError = connector.handleActivationError(err)
          if (handledError) {
            setError(handledError)
            return
          }
        }
        // Otherwise, set to state the received error
        setError(err)
      }
    },
    [connectors, reset, web3ReactContext]
  )

  useEffect(() => {
    if (!account || !library) {
      return
    }

    let cancel = false

    setType(null)

    getAccountIsContract(library, account).then((isContract) => {
      if (!cancel) {
        setStatus('connected')
        setType(isContract ? 'contract' : 'normal')
      }
    })

    return () => {
      cancel = true
      setStatus('disconnected')
      setType(null)
    }
  }, [account, library])

  const wallet = useMemo(
    () => ({
      _web3ReactContext: web3ReactContext,
      account: account || null,
      balance,
      connect,
      connector,
      connectors,
      chainId,
      error,
      library,
      reset,
      status,
      type
    }),
    [
      account,
      balance,
      connect,
      connector,
      connectors,
      chainId,
      error,
      library,
      type,
      reset,
      status,
      web3ReactContext
    ]
  )

  return (
    <UseWalletContext.Provider
      value={{
        // addBlockNumberListener,
        // pollBlockNumberInterval,
        // removeBlockNumberListener,
        pollBalanceInterval,
        wallet
      }}
    >
      {children}
    </UseWalletContext.Provider>
  )
}

WalletProvider.defaultProps = {
  pollBalanceInterval: 2000
  // pollBlockNumberInterval: 5000,
}

WalletProvider.propTypes = {
  children: PropTypes.node,
  pollBalanceInterval: PropTypes.number
  // pollBlockNumberInterval: PropTypes.number,
}

const useWalletBalance = ({
  account,
  library,
  pollBalanceInterval
}: {
  account?: Account | null
  library?: EthereumProvider
  pollBalanceInterval: number
}) => {
  const [balance, setBalance] = useState<Balance>(NO_BALANCE)

  useEffect(() => {
    if (!account || !library) {
      return
    }

    let cancel = false

    // Poll wallet balance
    const pollBalance = pollEvery<Balance, any>(
      (
        account: Account,
        library: EthereumProvider,
        onUpdate: (balance: Balance) => void
      ) => {
        let lastBalance = NO_BALANCE
        return {
          async request() {
            return getAccountBalance(library, account)
              .then((value) => {
                return value ? JSBI.BigInt(value).toString() : NO_BALANCE
              })
              .catch(() => NO_BALANCE)
          },
          onResult(balance: Balance) {
            if (!cancel && balance !== lastBalance) {
              lastBalance = balance
              onUpdate(balance)
            }
          }
        }
      },
      pollBalanceInterval
    )

    // start polling balance every x time
    const stopPollingBalance = pollBalance(account, library, setBalance)

    return () => {
      cancel = true
      stopPollingBalance()
      setBalance(NO_BALANCE)
    }
  }, [account, library, pollBalanceInterval])

  return balance
}

const useChainId = ({ library }: { library: EthereumProvider }) => {
  const [chainId, setChainId] = useState<number | null>(null)
  useEffect(() => {
    if (!library) {
      return
    }

    getChainId(library).then((value) => {
      setChainId(parseInt(value.toString(), 16));
    })

    library.on('chainChanged', (value) => setChainId(parseInt(value.toString(), 16)));

    return () => {
      setChainId(null)
    }
  }, [library])
  return chainId;
}

const useWallet = () => {
  const walletContext = useContext(UseWalletContext)

  if (walletContext === null) {
    throw new Error(
      'useWallet() can only be used inside of <WalletProvider />, ' +
        'please declare it at a higher level.'
    )
  }

  // const getBlockNumber = useGetBlockNumber()
  const { wallet } = walletContext

  return useMemo(() => {
    return { ...wallet }
  }, [wallet])

  // return useMemo(() => {
  //   return { ...wallet, getBlockNumber }
  // }, [getBlockNumber, wallet])
}

function WalletProviderWrapper(props: WalletProviderProps) {
  return (
    <Web3ReactProvider getLibrary={(library) => library}>
      <WalletProvider {...props} />
    </Web3ReactProvider>
  )
}

WalletProviderWrapper.propTypes = WalletProvider.propTypes
WalletProviderWrapper.defaultProps = WalletProvider.defaultProps

export { WalletProviderWrapper as WalletProvider, useWallet }
