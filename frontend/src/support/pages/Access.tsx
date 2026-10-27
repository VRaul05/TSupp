
import { useNavigate } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { ShieldCheck, Ticket } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/UI';

export default function Access() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginWithCredentials } = useApp();
  const navigate = useNavigate();

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      await loginWithCredentials(email, password);
      navigate('/tickets', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="access-view">
      <div className="access-card">
        <div className="access-symbol"><Ticket size={27}/></div>
        <h1>PUGSTIC</h1>
        <p>Plataforma unificada de gestión de servicios de TI y conocimiento</p>
        <span className="demo-label"><ShieldCheck size={15}/> Acceso seguro con FastAPI/JWT</span>

        <form onSubmit={handleLogin} className="access-login-form">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="agente.prueba@tsupp.local"
            autoComplete="username"
            required
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Ingresa tu contraseña"
            autoComplete="current-password"
            required
          />

          {error && <p role="alert" style={{ color: '#dc2626', marginTop: 12 }}>{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Entrar a la consola'}
          </Button>
        </form>

        <small>Acceso para agentes y supervisores autorizados.</small>
        <p className="portal-switch"><a href="/login">Ir al portal del empleado</a></p>
      </div>
    </main>
  );
}
