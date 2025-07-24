import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AdminInterface from './components/AdminInterface';
import UserInterface from './components/UserInterface';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [currentUser, setCurrentUser] = useState('');

  // Verificar si hay usuario guardado en localStorage al cargar
  useEffect(() => {
    const savedUser = localStorage.getItem('demo_catalog_user');
    if (savedUser) {
      setIsAuthenticated(true);
      setCurrentUser(savedUser);
    }
    setIsLoading(false);
  }, []);

  // Función de login simplificada
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Validación contra usuarios predefinidos
    const validUsers = [
      { username: 'rodes', password: 'remr020605' },
      { username: 'reno', password: '!Reno1990.' }
    ];

    const user = validUsers.find(u => 
      u.username.toLowerCase() === loginData.username.toLowerCase() && 
      u.password === loginData.password
    );

    if (user) {
      // Simular login exitoso
      setIsAuthenticated(true);
      setCurrentUser(user.username);
      setLoginData({ username: '', password: '' });
      
      // Guardar en localStorage para persistencia
      localStorage.setItem('demo_catalog_user', user.username);
    } else {
      setLoginError('Usuario o contraseña incorrectos');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser('');
    localStorage.removeItem('demo_catalog_user');
  };

  if (isLoading) {
    return (
      <div style={{
        backgroundColor: '#121212',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        Cargando...
      </div>
    );
  }

  // Componente de Login
  const LoginForm = () => (
    <div style={{
      backgroundColor: '#121212',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#222',
        padding: '40px',
        borderRadius: '8px',
        border: '1px solid #333',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ color: '#f89520', textAlign: 'center', marginBottom: '30px' }}>
          Demo Catalog - Admin
        </h1>
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
              Usuario
            </label>
            <input
              type="text"
              value={loginData.username}
              onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#333',
                color: 'white',
                border: '1px solid #444',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
              placeholder="rodes o reno"
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={loginData.password}
              onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#333',
                color: 'white',
                border: '1px solid #444',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          {loginError && (
            <div style={{
              backgroundColor: '#301b1b',
              color: '#f44336',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              border: '1px solid #d32f2f'
            }}>
              {loginError}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              backgroundColor: '#f89520',
              color: 'white',
              padding: '12px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Iniciar Sesión
          </button>
        </form>

        <div style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#1a1a1a',
          borderRadius: '4px',
          border: '1px solid #444'
        }}>
          <h4 style={{ color: '#f89520', margin: '0 0 10px 0' }}>
            Usuarios de Prueba:
          </h4>
          <div style={{ color: '#ddd', fontSize: '14px' }}>
            <p style={{ margin: '5px 0' }}>
              <strong>Usuario 1:</strong> rodes / remr020605
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Usuario 2:</strong> reno / !Reno1990.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a href="/" style={{ color: '#2196f3', textDecoration: 'none' }}>
            ← Volver al catálogo público
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <Router>
      <Routes>
        {/* Admin interface - requiere autenticación */}
        <Route 
          path="/admin" 
          element={
            isAuthenticated ? 
              <AdminInterface currentUser={currentUser} onLogout={handleLogout} /> : 
              <LoginForm />
          } 
        />
        
        {/* User interface - acceso público */}
        <Route path="/" element={<UserInterface />} />
        <Route path="/demos" element={<UserInterface />} />
      </Routes>
    </Router>
  );
}

export default App;