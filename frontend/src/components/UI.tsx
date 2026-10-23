import type { ReactNode,ButtonHTMLAttributes,InputHTMLAttributes } from 'react';
import { X } from 'lucide-react';
export function Button({children,variant='primary',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'quiet'|'danger'}){return <button {...props} className={`btn btn-${variant} ${props.className??''}`}>{children}</button>}
export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'orange'|'red'|'green'|'pink'}){return <span className={`badge badge-${tone}`}>{children}</span>}
export function Card({children,className=''}:{children:ReactNode;className?:string}){return <section className={`card ${className}`}>{children}</section>}
export function TextField(props:InputHTMLAttributes<HTMLInputElement>){return <input {...props} className={`text-field ${props.className??''}`}/>}
export function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){return <div className="modal-shade" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-title"><strong>{title}</strong><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={19}/></button></div>{children}</section></div>}
