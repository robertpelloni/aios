import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Billing, Tools, Cloud, Jules } from './pages/Placeholders';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="billing" element={<Billing />} />
          <Route path="tools" element={<Tools />} />
          <Route path="cloud" element={<Cloud />} />
          <Route path="jules" element={<Jules />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
