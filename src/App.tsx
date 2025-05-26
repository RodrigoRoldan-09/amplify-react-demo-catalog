import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminInterface from './components/AdminInterface';
import UserInterface from './components/UserInterface';

function App() {
  return (
    <Router>
      <Routes>
        {/* Admin interface - full CRUD capabilities */}
        <Route path="/admin" element={<AdminInterface />} />
        
        {/* User interface - view only */}
        <Route path="/" element={<UserInterface />} />
        <Route path="/demos" element={<UserInterface />} />
      </Routes>
    </Router>
  );
}

export default App;