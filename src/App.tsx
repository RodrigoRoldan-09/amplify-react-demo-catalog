import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import UserInterface from './components/UserInterface';

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta protegida con Cognito */}
        <Route path="/admin" element={<AdminRoute />} />

        {/* Rutas públicas */}
        <Route path="/" element={<UserInterface />} />
        <Route path="/demos" element={<UserInterface />} />
      </Routes>
    </Router>
  );
}

export default App;
