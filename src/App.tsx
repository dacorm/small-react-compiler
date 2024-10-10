import { useState } from 'react'
import './assets/App.css'
import {Text} from "./text.tsx";

export const App = () => {
  const [count, setCount] = useState(0)

  return (
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <Text />
      </div>
  )
}
