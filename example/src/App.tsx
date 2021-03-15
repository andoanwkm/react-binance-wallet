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
