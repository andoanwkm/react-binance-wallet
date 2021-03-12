# react-connect-wallet

> A library helps client connect to wallet extension like Metamask, Binance Chain 

[![NPM](https://img.shields.io/npm/v/react-connect-wallet.svg)](https://www.npmjs.com/package/react-connect-wallet) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save react-connect-wallet
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
  const { account, connect, reset, status, error, balance } = useWallet()
  return (
    <div>
      <h1>Binance Chain Connector</h1>
      {status === 'disconnected' ? (
        <button onClick={() => connect('bsc')}>Connect</button>
      ) : (
        <button onClick={() => reset()}>Disconnect</button>
      )}
      { error?.message }
      {account && <p>Connected as {account}</p>}
      {Number(balance) >= 0 && <p>{balance}</p>}
    </div>
  )
}

export default App
```

## License

MIT © [andoanwkm](https://github.com/andoanwkm)
