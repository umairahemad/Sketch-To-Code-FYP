import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Homepage from './homepage'
import Canvas from './canvas'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/canvas" element={<Canvas />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App