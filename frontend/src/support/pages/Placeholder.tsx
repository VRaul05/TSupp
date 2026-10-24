import { ArrowLeft, Construction } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export default function Placeholder({title}:{title:string}){const nav=useNavigate();return <div className="placeholder"><button className="icon-button" onClick={()=>nav('/tickets')}><ArrowLeft/></button><Construction size={34}/><h2>{title}</h2><p>Esta sección todavía no tiene contenido disponible.</p></div>}
