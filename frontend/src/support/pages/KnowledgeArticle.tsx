import {useEffect,useMemo,useRef,useState} from 'react';
import {useNavigate,useParams} from 'react-router-dom';
import {ArrowLeft,BookOpen,Bookmark,Check,CheckCircle2,ClipboardCopy,Clock3,Download,Edit3,FileText,Info,Plus,Save,Share2,ShieldAlert,X} from 'lucide-react';
import {useKnowledge} from '../context/KnowledgeContext';
import {useApp} from '../context/AppContext';
import AttachmentPicker from '../components/AttachmentPicker';
import {readTicketAttachment,removeStoredAttachment,saveTicketAttachments} from '../data/attachments';
import type {KnowledgeArticle as Article,KnowledgeAttachment,KnowledgeCategory,KnowledgeVersion} from '../data/knowledge';
import {deserializeKnowledgeContent} from '../services/knowledgeApi';
import type {ApiKnowledgeVersion} from '../services/knowledgeApi';
const categories:KnowledgeCategory[]=['Climatización','Redes y Conectividad','Seguridad y Accesos','Audiovisual y Salas'];
const mapHistory=(items:ApiKnowledgeVersion[]):KnowledgeVersion[]=>items.map(item=>({version:`v0.${item.number}`,date:new Date(item.created_at).toLocaleString('es-MX'),author:'Base de conocimiento',note:item.note, ...deserializeKnowledgeContent(item.content)}));
const blank=(id:string):Article=>({id,title:'',category:'' as KnowledgeCategory,subcategory:'',status:'Borrador',author:'Agente de soporte',updated:'Hoy',excerpt:'',attachments:[],versions:[{version:'v0.1',date:'Hoy',author:'Agente de soporte',note:'Nuevo borrador',summary:'',requirements:[''],steps:['']} ]});
export default function KnowledgeArticle(){const {id}=useParams();const nav=useNavigate();const {articles,createDraftRemote,saveDraftRemote,submitDraftRemote,authorizeDraftRemote,revokeDraftRemote,getVersionsRemote,restoreVersionRemote}=useKnowledge();const {session}=useApp();const article=articles.find(a=>a.id===id);const isNew=id==='nuevo';const canEdit=session?.role==='agente'||session?.role==='supervisor';const canAuthorize=session?.role==='supervisor';const [editing,setEditing]=useState(isNew);const [draft,setDraft]=useState<Article>(()=>article?structuredClone(article):blank(`KB-${typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}`));const [version,setVersion]=useState(article?.versions[0].version||'v0.1');const [toast,setToast]=useState('');const [changeNote,setChangeNote]=useState('');const [saving,setSaving]=useState(false);const [changingStatus,setChangingStatus]=useState(false);const [history,setHistory]=useState<KnowledgeVersion[]>([]);const [historyLoading,setHistoryLoading]=useState(false);const [historyError,setHistoryError]=useState('');const [attachmentBusy,setAttachmentBusy]=useState(false);const [attachmentError,setAttachmentError]=useState('');const draftRef=useRef(draft);draftRef.current=draft;const attachmentBusyRef=useRef(false);const pendingRemoved=useRef<string[]>([]);const show=(s:string)=>{setToast(s);window.setTimeout(()=>setToast(''),3300)};
 const availableVersions=article?[article.versions[0],...history.filter(v=>v.version!==article.versions[0].version)]:history;
 const current=useMemo(()=>editing?draft.versions[0]:(history.find(v=>v.version===version)||article?.versions.find(v=>v.version===version)||history[0]||article?.versions[0]),[article,version,draft,editing,history]);
 useEffect(()=>{if(article&&!isNew)setVersion(article.versions[0].version)},[article?.id]);
 useEffect(()=>{
  if(!id||id==='nuevo'||!canEdit){setHistory([]);setHistoryError('');return;}
  let active=true;setHistoryLoading(true);setHistoryError('');
  void getVersionsRemote(id).then(items=>{if(active)setHistory(mapHistory(items))}).catch(err=>{if(active)setHistoryError(err instanceof Error?err.message:'No se pudo cargar el historial.')}).finally(()=>{if(active)setHistoryLoading(false)});
  return ()=>{active=false};
 },[id,canEdit]);
 const newUploads=useRef(new Map<string,string>());const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;const pending=[...newUploads.current];newUploads.current.clear();void Promise.allSettled(pending.map(([fileId,ownerId])=>removeStoredAttachment(ownerId,fileId)))}},[]);
 const updateVersion=(key:'summary'|'requirements'|'steps'|'command',value:string|string[])=>setDraft(old=>({...old,versions:old.versions.map((v,i)=>i===0?{...v,[key]:value}:v)}));
 const updateList=(key:'requirements'|'steps',index:number,value:string)=>updateVersion(key,(draft.versions[0][key]||[]).map((v,i)=>i===index?value:v));
 const addList=(key:'requirements'|'steps')=>updateVersion(key,[...draft.versions[0][key],'']);
 const cleanupRemoved=()=>{const removed=pendingRemoved.current;pendingRemoved.current=[];newUploads.current.clear();void Promise.allSettled(removed.map(fileId=>removeStoredAttachment(`knowledge:${draft.id}`,fileId)))};
 const cancelEdits=async()=>{
  if(attachmentBusyRef.current)return;
  attachmentBusyRef.current=true;setAttachmentBusy(true);setAttachmentError('');
  try{
   const pending=[...newUploads.current];const results=await Promise.allSettled(pending.map(([fileId,ownerId])=>removeStoredAttachment(ownerId,fileId)));
   const discardedIds=new Set<string>();results.forEach((result,index)=>{if(result.status==='fulfilled'){const fileId=pending[index][0];newUploads.current.delete(fileId);discardedIds.add(fileId)}});setDraft(current=>({...current,attachments:current.attachments.filter(file=>!file.id||!discardedIds.has(file.id))}));
   if(results.some(result=>result.status==='rejected'))throw new Error('No se pudieron descartar todos los adjuntos nuevos. Vuelve a pulsar Cancelar.');
   pendingRemoved.current=[];if(editing&&!isNew)setEditing(false);else nav('/conocimiento');
  }catch(failure){setAttachmentError(failure instanceof Error?failure.message:'No se pudieron descartar los archivos nuevos. Inténtalo de nuevo.')}
  finally{attachmentBusyRef.current=false;if(mounted.current)setAttachmentBusy(false)}
 };
 const save=async()=>{
  if(attachmentBusyRef.current||saving)return;
  if(!draft.category||!draft.title.trim()||!draft.versions[0].summary.trim()||!draft.versions[0].steps.some(x=>x.trim())){
   show('Completa categoría, título, resumen y al menos un paso.');return;
  }
  if(draft.attachments.length>0){show('Por ahora guarda artículos sin adjuntos. La sincronización de archivos está pendiente.');return;}
  const clean:Article={...draft,author:isNew?(session?.role==='supervisor'?'Supervisor':'Agente de soporte'):draft.author,updated:new Date().toLocaleString('es-MX',{timeZone:'America/Mexico_City'}),title:draft.title.trim(),excerpt:draft.versions[0].summary.slice(0,155),status:'Borrador',versions:[{...draft.versions[0],steps:draft.versions[0].steps.filter(Boolean),requirements:draft.versions[0].requirements.filter(Boolean)}]};
  setSaving(true);
  try{
   if(isNew){
    const created=await createDraftRemote(clean);
    cleanupRemoved();setEditing(false);setVersion(created.versions[0].version);
    nav(`/conocimiento/${created.id}`,{replace:true});
   }else{
    const updated=await saveDraftRemote(clean,changeNote);
    cleanupRemoved();setEditing(false);setVersion(updated.versions[0].version);
    show('Borrador guardado en PostgreSQL correctamente.');
   }
  }catch(error){show(error instanceof Error?error.message:'No se pudo guardar el artículo.');}
  finally{setSaving(false);}
 };
 const changeDocumentStatus=async(action:'submit'|'authorize'|'revoke')=>{
  if(!article||changingStatus||saving)return;
  setChangingStatus(true);
  try{
   if(action==='submit')await submitDraftRemote(article.id);
   if(action==='authorize')await authorizeDraftRemote(article.id);
   if(action==='revoke')await revokeDraftRemote(article.id);
   show(action==='submit'?'Documento enviado a revisión.':action==='authorize'?'Documento autorizado.':'Autorización revocada.');
  }catch(error){show(error instanceof Error?error.message:'No se pudo actualizar el estado.');}
  finally{setChangingStatus(false)}
 };
  const restoreSelected=async()=>{
   if(!article||!canAuthorize||editing||saving||changingStatus||attachmentBusy||version===article.versions[0].version)return;
   const number=Number(version.replace(/^v0\./,''));
   if(!Number.isInteger(number)||number<1)return;
   if(!window.confirm(`¿Restaurar ${version}? Se creará una nueva versión en estado Borrador.`))return;
   setChangingStatus(true);
   try{
    const restored=await restoreVersionRemote(article.id,number);
    setVersion(restored.versions[0].version);setDraft(structuredClone(restored));
    const items=await getVersionsRemote(article.id);setHistory(mapHistory(items));setHistoryError('');
    show('Versión restaurada correctamente. El artículo vuelve a Borrador.');
   }catch(error){show(error instanceof Error?error.message:'No se pudo restaurar la versión.');}
   finally{setChangingStatus(false)}
  };
  const upload=async(files:File[])=>{
  if(attachmentBusyRef.current)throw new Error('Hay otra operación de archivos en curso.');
  attachmentBusyRef.current=true;setAttachmentBusy(true);setAttachmentError('');
  const target=draftRef.current;
  try{const ownerId=`knowledge:${target.id}`;const stored=await saveTicketAttachments(ownerId,files,target.attachments,pendingRemoved.current);if(!mounted.current){await Promise.allSettled(stored.map(file=>removeStoredAttachment(ownerId,file.id!)));return}stored.forEach(file=>{if(file.id)newUploads.current.set(file.id,ownerId)});setDraft(current=>current.id===target.id?({...current,attachments:[...current.attachments,...stored]}):current)}
  finally{attachmentBusyRef.current=false;if(mounted.current)setAttachmentBusy(false)}
 };
 const downloadAttachment=async(ownerId:string,file:KnowledgeAttachment)=>{
  if(attachmentBusyRef.current)return;
  attachmentBusyRef.current=true;setAttachmentBusy(true);setAttachmentError('');
  try{
   let url=file.url;let revoke=false;
   if(file.id){const blob=await readTicketAttachment(`knowledge:${ownerId}`,file.id);if(!blob)throw new Error('El archivo no está disponible en este navegador. Adjunta el archivo original de nuevo.');url=URL.createObjectURL(blob);revoke=true}
   if(!url)throw new Error('El contenido de este archivo no está disponible. Adjunta el archivo original para descargarlo.');
   const link=document.createElement('a');link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove();if(revoke)window.setTimeout(()=>URL.revokeObjectURL(url!),1000);
  }catch(failure){setAttachmentError(failure instanceof Error?failure.message:'No se pudo descargar el archivo. Inténtalo de nuevo.')}
  finally{attachmentBusyRef.current=false;setAttachmentBusy(false)}
 };
 const removeAttachment=(file:KnowledgeAttachment,index:number)=>{
  if(attachmentBusyRef.current)return;
  setAttachmentError('');if(file.id&&!pendingRemoved.current.includes(file.id))pendingRemoved.current.push(file.id);
  setDraft(current=>({...current,attachments:current.attachments.filter((entry,position)=>file.id?entry.id!==file.id:position!==index)}));
 };
 if(!article&&!isNew)return <div className="missing">Artículo no encontrado. <button onClick={()=>nav('/conocimiento')}>Volver a conocimiento</button></div>;
 if(article?.status!=='Autorizado'&&!canEdit)return <div className="denied">Este artículo no está autorizado para consulta pública.</div>;
 const display=editing?draft:article!;const text=current!;
 return <div className="screen kb-screen kb-article-screen"><header className="mobile-header kb-header"><button className="icon-button" aria-label="Volver a conocimiento" onClick={()=>nav('/conocimiento')}><ArrowLeft size={19}/></button><strong>Artículo técnico</strong><button className="icon-button kb-header-right" title="Copiar enlace" onClick={()=>{navigator.clipboard?.writeText(location.href).then(()=>show('Enlace copiado')).catch(()=>show('No fue posible copiar el enlace'))}}><Bookmark size={17}/></button><button className="icon-button" title="Compartir enlace" onClick={()=>{navigator.clipboard?.writeText(location.href).then(()=>show('Enlace copiado para compartir')).catch(()=>show('No fue posible copiar el enlace'))}}><Share2 size={17}/></button></header><main className="article-content"><section className="article-intro kb-paper"><div className="article-chips"><span className={'kb-state '+(display.status==='Autorizado'?'ok':'draft')}>{display.status==='Autorizado'?<CheckCircle2 size={12}/>:<Edit3 size={12}/>} {display.status}</span><span className="kb-category-pill">{display.category}</span><span className="kb-category-pill"><Clock3 size={12}/> Uso interno para agentes</span></div>{editing?<><label className="edit-label" htmlFor="article-title">Título del artículo *</label><input id="article-title" className="edit-input" value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))} placeholder="Título del procedimiento"/><label className="edit-label" htmlFor="article-category">Categoría</label><select id="article-category" className="edit-input" value={draft.category} onChange={e=>setDraft(d=>({...d,category:e.target.value as KnowledgeCategory}))}><option value="">Selecciona una opción</option>{categories.map(c=><option key={c}>{c}</option>)}</select><label className="edit-label" htmlFor="article-subcategory">Subcategoría</label><input id="article-subcategory" className="edit-input" value={draft.subcategory} onChange={e=>setDraft(d=>({...d,subcategory:e.target.value}))}/></>:<h1>{display.title}</h1>}{!isNew&&<div className="article-byline"><BookOpen size={15}/> Creado por {display.author} · Última edición: {display.updated}</div>}</section><section className="article-version"><label htmlFor="article-version-select">Versión del documento</label><select id="article-version-select" value={editing?draft.versions[0].version:version} disabled={editing||isNew} onChange={e=>setVersion(e.target.value)}>{availableVersions.map(v=><option key={v.version} value={v.version}>{v.version}{v.version===article?.versions[0].version?' (Versión actual)':''}</option>)}</select>{historyLoading&&<p className="muted">Cargando historial...</p>}{historyError&&<p className="error-text" role="alert">{historyError}</p>}{!editing&&!isNew&&canAuthorize&&availableVersions.some(v=>v.version===version)&&version!==article?.versions[0].version&&<button type="button" className="add-row" disabled={changingStatus||saving||attachmentBusy} onClick={()=>void restoreSelected()}>{changingStatus?'Restaurando...':'Restaurar versión seleccionada'}</button>}<p><Info size={14}/> {display.status==='Borrador'?'Esta versión no está autorizada para consultas de IA.':'Solo la versión autorizada más reciente puede usarse en la IA.'}</p></section><section className="kb-paper article-section"><h2>1. Resumen ejecutivo y alcance</h2>{editing?<textarea aria-label="Resumen ejecutivo y alcance" className="edit-textarea" rows={6} value={text.summary} onChange={e=>updateVersion('summary',e.target.value)}/>:<p>{text.summary}</p>}</section><section className="kb-paper article-section"><h2>2. Requisitos previos</h2>{editing?<>{text.requirements.map((v,i)=><div className="edit-row" key={i}><textarea aria-label={`Requisito ${i+1}`} className="edit-textarea" rows={2} value={v} onChange={e=>updateList('requirements',i,e.target.value)}/><button aria-label="Quitar requisito" onClick={()=>updateVersion('requirements',text.requirements.filter((_,j)=>j!==i))}><X size={15}/></button></div>)}<button className="add-row" onClick={()=>addList('requirements')}><Plus size={15}/> Agregar requisito</button></>:<ul className="article-checks">{text.requirements.map((v,i)=><li key={i}><CheckCircle2 size={15}/>{v}</li>)}</ul>}</section><section className="kb-paper article-section"><h2>3. Procedimiento paso a paso</h2>{editing?<>{text.steps.map((v,i)=><div className="edit-row" key={i}><span className="step-number">{i+1}</span><textarea aria-label={`Paso ${i+1}`} className="edit-textarea" rows={3} value={v} onChange={e=>updateList('steps',i,e.target.value)}/><button aria-label="Quitar paso" onClick={()=>updateVersion('steps',text.steps.filter((_,j)=>j!==i))}><X size={15}/></button></div>)}<button className="add-row" onClick={()=>addList('steps')}><Plus size={15}/> Agregar paso</button></>:<ol className="article-steps">{text.steps.map((v,i)=><li key={i}><span className="step-number">{i+1}</span><p>{v}</p></li>)}</ol>}{(editing||text.command)&&<div className="article-command">{editing?<><label className="edit-label" htmlFor="article-command">Comando de referencia (opcional)</label><input id="article-command" className="edit-input" value={text.command||''} onChange={e=>updateVersion('command',e.target.value)}/></>:<><code>{text.command}</code><button aria-label="Copiar comando" title="Copiar comando" onClick={()=>navigator.clipboard?.writeText(text.command||'').then(()=>show('Comando copiado')).catch(()=>show('No fue posible copiar'))}><ClipboardCopy size={16}/></button></>}</div>}</section><section className="kb-paper article-section"><h2><FileText size={17}/> Archivos adjuntos y diagramas</h2>{display.attachments.map((a,i)=><div className="article-attachment" key={i}><FileText size={19}/><div><b>{a.name}</b><small>{a.size}</small></div><button type="button" disabled={attachmentBusy} aria-label={'Descargar '+a.name} onClick={()=>void downloadAttachment(display.id,a)}><Download size={17}/></button>{editing&&<button type="button" disabled={attachmentBusy} aria-label={'Eliminar '+a.name} onClick={()=>removeAttachment(a,i)}><X size={15}/></button>}</div>)}{display.attachments.length===0&&<p className="muted">Sin archivos adjuntos.</p>}{editing&&<AttachmentPicker onFiles={upload} currentCount={draft.attachments.length} disabled={attachmentBusy}/>}{attachmentError&&<p className="error-text" role="alert">{attachmentError}</p>}</section>{editing&&<section className="kb-paper article-section"><label className="edit-label" htmlFor="article-change-note">Nota del cambio</label><input id="article-change-note" className="edit-input" placeholder="Describe qué se modificó en esta versión" value={changeNote} onChange={e=>setChangeNote(e.target.value)}/><p className="muted">Se guardará en PostgreSQL como borrador. No estará disponible para consultas de IA hasta su autorización.</p></section>}{!editing&&!isNew&&canEdit&&display.status==='Borrador'&&<div className="article-approval"><ShieldAlert size={16}/><span>Enviar el borrador para revisión del supervisor.</span><button disabled={changingStatus||saving} onClick={()=>void changeDocumentStatus('submit')}>{changingStatus?'Procesando...':'Enviar a revisión'}</button></div>}{!editing&&!isNew&&canAuthorize&&display.status==='En revisión'&&<div className="article-approval"><ShieldAlert size={16}/><span>Solo el supervisor puede autorizar documentos.</span><button disabled={changingStatus||saving} onClick={()=>void changeDocumentStatus('authorize')}>{changingStatus?'Procesando...':'Autorizar'}</button></div>}{!editing&&!isNew&&canAuthorize&&display.status==='Autorizado'&&<div className="article-approval"><ShieldAlert size={16}/><span>Solo el supervisor puede revocar documentos.</span><button disabled={changingStatus||saving} onClick={()=>void changeDocumentStatus('revoke')}>{changingStatus?'Procesando...':'Revocar'}</button></div>}</main><footer className="article-footer"><button className="article-list-btn" disabled={attachmentBusy} onClick={()=>void cancelEdits()}><BookOpen size={15}/>{editing?'Cancelar':'Lista'}</button>{canEdit&&<button className="article-edit-btn" disabled={attachmentBusy||saving||changingStatus} onClick={()=>editing?void save():(pendingRemoved.current=[],setAttachmentError(''),setDraft(structuredClone(display)),setEditing(true))}>{editing?<><Save size={16}/> Guardar borrador</>:<><Edit3 size={16}/> Editar borrador</>}</button>}</footer>{toast&&<div className="toast" role="status"><Check size={16}/>{toast}<button onClick={()=>setToast('')} aria-label="Cerrar"><X size={14}/></button></div>}</div>}
