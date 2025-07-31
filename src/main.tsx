import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import App from './App.tsx';
import outputs from '../amplify_outputs.json';
import './index.css';
import '@aws-amplify/ui-react/styles.css';
//import './authenticator-styles.css'; //  estilos personalizados

// Configurar Amplify
Amplify.configure(outputs);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);