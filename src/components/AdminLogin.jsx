import { useState } from 'react';
import { Trophy, Lock, LogIn, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { login } from '../services/auth';

export default function AdminLogin({ onLogin, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const session = login(username, password);
    if (session) {
      setError('');
      onLogin(session);
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-stripe" aria-hidden="true" />
        <div className="login-body">
          <div className="login-brand">
            <Trophy size={30} className="login-trophy" />
            <div>
              <h1 className="login-title">Panel del organizador</h1>
              <p className="login-subtitle">Quiniela Mundial 26 · acceso restringido</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <label className="login-field">
              <span>Usuario</span>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(event) => { setUsername(event.target.value); if (error) setError(''); }}
                placeholder="admin o caty"
              />
            </label>

            <label className="login-field">
              <span>Contraseña</span>
              <div className="login-password-wrap">
                <input
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); if (error) setError(''); }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPwd}
                  onClick={() => setShowPwd(value => !value)}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && <div className="login-error" role="alert"><Lock size={13} /> {error}</div>}

            <button type="submit" className="login-submit">
              <LogIn size={16} /> Entrar
            </button>
          </form>

          <button type="button" className="login-back" onClick={onBack}>
            <ArrowLeft size={14} /> Volver a la quiniela
          </button>
        </div>
      </div>
    </div>
  );
}
