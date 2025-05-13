import { useState } from 'react'
import Bluetooth from './components/Bluetooth'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <h1>Proyecto #2 - comunicación bidireccional por Bluetooth</h1>
        <Bluetooth />
      </div>
    </>
  )
}

export default App
