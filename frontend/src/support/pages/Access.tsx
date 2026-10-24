import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ShieldCheck, Ticket } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/UI';
import type { Role } from '../data/tickets';
export default function Access(){const [role,setRole]=useState<Role>('agente');const {login}=useApp();const navigate=useNavigate();return <main className="access-view"><div className="access-card"><div className="access-symbol"><Ticket size={27}/></div><h1>PUGSTIC</h1><p>Plataforma unificada de gestión de servicios de TI y conocimiento</p><span className="demo-label"><ShieldCheck size={15}/> Acceso de demostración</span><label htmlFor="role">Selecciona el rol de prueba</label><select id="role" value={role} onChange={e=>setRole(e.target.value as Role)}><option value="agente">Agente de soporte</option><option value="supervisor">Supervisor-administrador</option><option value="empleado">Empleado</option></select><Button onClick={()=>{login(role);navigate('/tickets')}}>Entrar a la consola</Button><small>Este selector simula la sesión para probar las rutas. La autenticación real se realizará mediante FastAPI/JWT.</small><p className="portal-switch"><a href="/login">Ir al portal del empleado</a></p></div></main>}
