import { Authenticator, useAuthenticator, ThemeProvider } from '@aws-amplify/ui-react';
import type { AuthUser } from 'aws-amplify/auth';
import AdminInterface from './AdminInterface';

// Extendemos AuthUser para incluir atributos
interface ExtendedAuthUser extends AuthUser {
  attributes?: {
    email?: string;
    name?: string;
    [key: string]: string | undefined;
  };
}

// 🎨 Tema personalizado (modo oscuro + naranja + texto blanco)
const theme = {
  name: 'admin-dark-orange',
  tokens: {
    colors: {
      font: {
        primary: { value: '#ffffff' }
      },
      brand: {
        primary: {
          10: { value: '#fff8f0' },
          20: { value: '#ffe4cc' },
          40: { value: '#ffb366' },
          60: { value: '#f89520' },
          80: { value: '#e67e00' },
          90: { value: '#cc6f00' },
          100: { value: '#b35f00' }
        }
      },
      background: {
        primary: { value: '#121212' },
        secondary: { value: '#222222' }
      },
      neutral: {
        10: { value: '#ffffff' },
        20: { value: '#f5f5f5' },
        40: { value: '#cccccc' },
        60: { value: '#666666' },
        80: { value: '#333333' },
        90: { value: '#222222' },
        100: { value: '#121212' }
      }
    }
  }
};

// 🌐 Traducciones para email y password
const formFields = {
  signIn: {
    email: {
      label: 'Correo electrónico',
      placeholder: 'Ingresa tu correo'
    },
    password: {
      label: 'Contraseña',
      placeholder: 'Ingresa tu contraseña'
    }
  }
};

// 🧩 Header y Footer
const components = {
  Header() {
    return (
      <div style={{
        textAlign: 'center',
        padding: '2rem 0',
        backgroundColor: '#121212'
      }}>
        <h1 style={{
          color: '#f89520',
          fontSize: '2rem',
          margin: '0 0 0.5rem 0'
        }}>
          Demo Catalog
        </h1>
        <p style={{
          color: '#ddd',
          margin: 0
        }}>
          Acceso de Administrador
        </p>
      </div>
    );
  },
  Footer() {
    return (
      <div style={{
        textAlign: 'center',
        padding: '1rem',
        backgroundColor: '#121212'
      }}>
        <a
          href="/"
          style={{
            color: '#f89520',
            textDecoration: 'none'
          }}
        >
          ← Volver al catálogo público
        </a>
      </div>
    );
  }
};

// 👤 Componente autenticado (admin interface)
function AuthenticatedAdmin() {
  const { user, signOut } = useAuthenticator();
  const extendedUser = user as ExtendedAuthUser;
  const currentUser = extendedUser?.attributes?.email || extendedUser?.username || 'Usuario';

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/'; // Opcional: redirige al salir
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return <AdminInterface currentUser={currentUser} onLogout={handleLogout} />;
}

// 🚪 Componente principal con Authenticator
function AdminRoute() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121212' }}>
      <ThemeProvider theme={theme}>
        <Authenticator
          formFields={formFields}
          components={components}
          hideSignUp={true}
          loginMechanisms={['email']} // 💥 CAMBIADO para usar email como login
        >
          <AuthenticatedAdmin />
        </Authenticator>
      </ThemeProvider>
    </div>
  );
}

export default AdminRoute;
