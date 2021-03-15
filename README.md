# React Binance Wallet

> A library helps the client connect to wallet extensions like Metamask, Binance Chain. This project based on source code of [use-wallet](https://github.com/aragon/use-wallet)

[![NPM](https://img.shields.io/npm/v/react-connect-wallet.svg)](https://www.npmjs.com/package/react-connect-wallet) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save react-binance-wallet

yarn add react-binance-wallet
```

## Usage

`index`

```tsx
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import { WalletProvider } from 'react-connect-wallet'

ReactDOM.render(<WalletProvider><App /></WalletProvider>, document.getElementById('root'))
```

`App`

```tsx
import React from 'react'
import {useWallet} from 'react-connect-wallet'

const App = () => {
  const { account, connect, reset, status, error, balance, chainId } = useWallet()
  return (
    <div>
      <h1>Binance Chain Connector</h1>
      {status === 'disconnected' ? (
        <>
        <button style={{ display: 'block', marginBottom: 16 }} onClick={() => connect('injected')}>Connect Metamask</button>
        <button style={{ display: 'block' }} onClick={() => connect('bsc')}>Connect Binance Chain Wallet</button>
        </>
      ) : (
        <button onClick={() => reset()}>Disconnect</button>
      )}
      { error?.message }
      { chainId != null && <p>chainId: {chainId}</p> }
      {account && <p>Connected as {account}</p>}
      {Number(balance) >= 0 && <p>{balance}</p>}
    </div>
  )
}

export default App
```

## License

MIT © [andoanwkm](https://github.com/andoanwkm)
