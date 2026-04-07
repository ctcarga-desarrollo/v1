import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import '@/pages/LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    // Navegación directa al dashboard sin validación
    navigate('/dashboard');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Lado izquierdo - Logo */}
        <div className="login-left">
          <img 
            src="https://customer-assets.emergentagent.com/job_2f7d0b2d-48f5-48d8-97ec-b1793c396cc6/artifacts/d1sq0sbe_CTCARGA%20SIN%20FONDO.png" 
            alt="CTCARGA Logo" 
            className="logo-image"
          />
          <h2 className="platform-title">Plataforma de gestión y transporte inteligente</h2>
        </div>

        {/* Lado derecho - Formulario */}
        <div className="login-right">
          <h1 className="login-title" data-testid="login-title">Inicio de sesión</h1>
          
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              data-testid="email-input"
            />

            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                data-testid="toggle-password-btn"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <a href="#" className="forgot-password" data-testid="forgot-password-link">
              ¿Olvidaste tu contraseña?
            </a>

            <button type="submit" className="login-button" data-testid="login-submit-btn">
              Ingresar
            </button>
          </form>

          <div className="divider">
            <span>o inicia sesión con</span>
          </div>

          <div className="social-buttons">
            <button className="social-button" data-testid="google-login-btn">
              <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0xNy42NCA5LjJjMC0uNjM3LS4wNTctMS4yNTEtLjE2NC0xLjg0SDl2My40ODFoNC44NDRhNC4xNCA0LjE0IDAgMCAxLTEuNzk2IDIuNzE2djIuMjU5aDIuOTA4YzEuNzAyLTEuNTY3IDIuNjg0LTMuODc1IDIuNjg0LTYuNjE1eiIgZmlsbD0iIzQyODVGNCIvPjxwYXRoIGQ9Ik05IDE4YzIuNDMgMCA0LjQ2Ny0uODA2IDUuOTU2LTIuMTgzbC0yLjkwOC0yLjI1OWMtLjgwNi41NC0xLjgzNy44Ni0zLjA0OC44Ni0yLjM0NCAwLTQuMzI4LTEuNTgzLTUuMDM2LTMuNzFILjk1N3YyLjMzMkExIDkgMCAwIDAgOSAxOHoiIGZpbGw9IiMzNEE4NTMiLz48cGF0aCBkPSJNMy45NjQgMTAuNzFBNS40MSA1LjQxIDAgMCAxIDMuNjgyIDljMC0uNTkzLjEwMi0xLjE3LjI4Mi0xLjcxVjQuOTU4SC45NTdBOSA5IDAgMCAwIDAgOWMwIDEuNDUyLjM0OCAyLjgyNy45NTcgNC4wNDJsMy4wMDctMi4zMzJ6IiBmaWxsPSIjRkJCQzA1Ii8+PHBhdGggZD0iTTkgMy41OGMyLjMyMSAwIDQuNDA2Ljc5OCA2LjA0NiAyLjM2bC0yLjMxIDIuMzFDMTEuNTExIDcuMDY1IDEwLjMxIDYuNTggOSA2LjU4YTUuNDMgNS40MyAwIDAgMC01LjAzNiAzLjcxTC45NTcgNy45NThBOSA5IDAgMCAxIDkgMy41OHoiIGZpbGw9IiNFQTQzMzUiLz48L2c+PC9zdmc+" alt="Google" />
              <span>Google</span>
            </button>

            <button className="social-button" data-testid="microsoft-login-btn">
              <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsPSIjZjI1MDIyIiBkPSJNMCAwaDguNTcxdjguNTcxSDB6Ii8+PHBhdGggZmlsbD0iIzdhYmEwMCIgZD0iTTkuNDI5IDBoOC41NzF2OC41NzFIOS40Mjl6Ii8+PHBhdGggZmlsbD0iIzAwYTRlZiIgZD0iTTAgOS40MjloOC41NzFWMThIMHoiLz48cGF0aCBmaWxsPSIjZmZiOTAwIiBkPSJNOS40MjkgOS40MjlIMThWMThIOS40Mjl6Ii8+PC9zdmc+" alt="Microsoft" />
              <span>Microsoft</span>
            </button>

            <button className="social-button sso-button" data-testid="sso-login-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="7" height="7" fill="#5B4B8A" rx="1"/>
                <rect x="14" y="3" width="7" height="7" fill="#5B4B8A" rx="1"/>
                <rect x="3" y="14" width="7" height="7" fill="#5B4B8A" rx="1"/>
                <rect x="14" y="14" width="7" height="7" fill="#5B4B8A" rx="1"/>
              </svg>
              <span>Mi empresa SSO</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;