import { AbstractConnector } from '@web3-react/abstract-connector'

export type Account = string
export type Balance = string

export type AccountType = 'contract' | 'normal'

export type Status = 'connected' | 'disconnected' | 'connecting' | 'error'

type EthereumProviderEip1193 = {
  request: (args: {
    method: string
    params?: unknown[] | object
  }) => Promise<unknown>
}

type EthereumProviderSend = {
  send: (method: string, params: string[]) => Promise<unknown>
}

type EthereumProviderSendAsync = {
  sendAsync: (
    params: {
      method: string
      params: string[]
      from: string
      jsonrpc: '2.0'
      id: number
    },
    callback: (err: Error, result: unknown) => void
  ) => void
  selectedAddress: string
}

type EthereumProviderEvents = {
  on: (event: string, result: (chainId: number) => void) => void
}

export type EthereumProvider = EthereumProviderEip1193 &
  EthereumProviderSend &
  EthereumProviderSendAsync & EthereumProviderEvents

export type Wallet = {
  account: Account | null
  balance?: string
  chainId?: number | null
  connect: (connectorId: string) => void
  connector: string | null
  connectors: object
  error: Error | null
  library?: any
  getBlockNumber?: () => number | null
  changeAccount: () => void
  networkName?: string
  reset: () => void
  status: Status
  type: AccountType | null
}

export type ConnectorInit = () => Promise<Connector>

export type Connector = {
  // Using `params: any` rather than `params: { chainId: number; [key: string]: any }`:
  // TS 3.9 doesn’t seem to accept `[key: string]: any` as valid to add extra
  // parameters, when using `class implements Connector`. It also rejects any
  // extra parameters added to `{}` or `object` in this case.
  web3ReactConnector: (params: any) => AbstractConnector
  handleActivationError?: (error: Error) => Error | null
}
export type ConnectorConfig = {}
