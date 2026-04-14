import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import Ofertas from "@/pages/Ofertas";
import CreacionOfertas from "@/pages/CreacionOfertas";
import Flota from "@/pages/Flota";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ofertas" element={<Ofertas />} />
          <Route path="/creacion-ofertas" element={<CreacionOfertas />} />
          <Route path="/flota" element={<Flota />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;