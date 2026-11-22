import {useEffect,useState} from 'react';
import {appConfig} from '../config.js';
import './review.css';
const emptyRating={likeness:'',bottle:'',quality:0,issues:[],notes:''};
const issueLabels={'face-shape':'Face shape',eyes:'Eyes',nose:'Nose',lips:'Lips',age:'Age',skin:'Skin texture',hair:'Hair','missing-person':'Missing person'};
async function api(path,token,options={}) {
  const response=await fetch(`${appConfig.apiUrl}/api/reviews${path}`,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers}});
  if(!response.ok) throw new Error((await response.json().catch(()=>({}))).message||'Request failed.');
  return response;
}
function ReviewImage({id,kind,token,label}) {
  const [url,setUrl]=useState(''),[error,setError]=useState('');
  useEffect(()=>{
    let cancelled=false,objectUrl;const controller=new AbortController();setUrl('');setError('');
    api(`/${id}/assets/${kind}`,token,{signal:controller.signal}).then(r=>r.blob()).then(blob=>{
      if(cancelled)return;objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
    }).catch(e=>{if(!cancelled)setError(e.message);});
    return ()=>{cancelled=true;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[id,kind,token]);
  return <figure className="review-image"><figcaption>{label}</figcaption>{url?<a href={url} target="_blank" rel="noreferrer"><img src={url} alt={label}/></a>:<p>{error||'Loading image…'}</p>}</figure>;
}
function ReviewDetail({record,token,onSaved}) {
  const [rating,setRating]=useState(record.rating||emptyRating),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
  const change=(key,value)=>{setRating(r=>({...r,[key]:value}));setMessage('Unsaved changes');};
  const save=async e=>{
    e.preventDefault();setSaving(true);setMessage('');
    try {const updated=await (await api(`/${record.id}/rating`,token,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(rating)})).json();onSaved(updated);setMessage('Rating saved.');}
    catch(e){setMessage(e.message);}finally{setSaving(false);}
  };
  return <article className="review-detail">
    <header><h2>{record.styleLabel||'Earlier generation'}</h2><p>{new Date(record.createdAt).toLocaleString()} · {record.status}{record.durationMs?` · ${(record.durationMs/1000).toFixed(1)}s`:''}</p></header>
    {record.legacy&&<p className="review-notice">Earlier generation: the image below is the saved booth source. The exact resized fal input, original prompt, and model settings were not recorded.</p>}
    <div className="review-pair">
      <ReviewImage id={record.id} kind="input" token={token} label={record.legacy?'Saved source — not exact fal input':'Exact image sent to fal.ai'}/>
      <ReviewImage id={record.id} kind="output" token={token} label="Generated portrait"/>
    </div>
    <form className="review-rating" onSubmit={save}>
      <h3>Rate this generation</h3><p>Judge likeness separately from how polished the portrait looks.</p>
      <div className="review-fields">
        <label>Likeness<select value={rating.likeness} onChange={e=>change('likeness',e.target.value)}><option value="">Not rated</option><option value="clearly-me">Clearly me</option><option value="mostly-me">Mostly me</option><option value="not-me">Someone else</option></select></label>
        <label>Campaign quality<select value={rating.quality} onChange={e=>change('quality',Number(e.target.value))}><option value={0}>Not rated</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label>
        <label>Bottle accuracy<select value={rating.bottle} onChange={e=>change('bottle',e.target.value)}><option value="">Not rated</option><option value="correct">Correct</option><option value="minor-issues">Minor issues</option><option value="wrong">Wrong</option></select></label>
      </div>
      <fieldset><legend>What changed too much?</legend>{Object.entries(issueLabels).map(([key,label])=><label key={key}><input type="checkbox" checked={rating.issues.includes(key)} onChange={e=>change('issues',e.target.checked?[...rating.issues,key]:rating.issues.filter(v=>v!==key))}/>{label}</label>)}</fieldset>
      <label>Notes<textarea rows={3} maxLength={4000} value={rating.notes} onChange={e=>change('notes',e.target.value)} placeholder="Good lighting, but my jaw is narrower and my eyes look different."/></label>
      <div><button disabled={saving}>{saving?'Saving…':'Save rating'}</button><span role="status">{message}</span></div>
    </form>
    <details className="review-prompt" open><summary>Exact prompt</summary><pre>{record.prompt||'Not recorded for this earlier generation.'}</pre></details>
    {!record.legacy&&<details className="review-prompt"><summary>Model settings and product reference</summary><pre>{JSON.stringify({model:record.model,...record.parameters,prompt:undefined,inputSha256:record.inputSha256,referenceSha256:record.referenceSha256},null,2)}</pre>{record.hasReference&&<ReviewImage id={record.id} kind="reference" token={token} label="Product reference sent to fal.ai"/>}</details>}
  </article>;
}
export default function ReviewGallery() {
  const [token,setToken]=useState(()=>sessionStorage.getItem('lunar-review-token')||''),[draft,setDraft]=useState('');
  const [records,setRecords]=useState([]),[selected,setSelected]=useState(''),[filter,setFilter]=useState('all'),[error,setError]=useState(''),[loading,setLoading]=useState(false),[loaded,setLoaded]=useState(false);
  const load=async value=>{
    setLoading(true);setError('');
    try {const {reviews}=await (await api('',value)).json();setRecords(reviews);setSelected(id=>reviews.some(r=>r.id===id)?id:reviews[0]?.id||'');setToken(value);sessionStorage.setItem('lunar-review-token',value);setLoaded(true);}
    catch(e){setError(e.message);}finally{setLoading(false);}
  };
  useEffect(()=>{if(token)void load(token);},[]);
  const visible=records.filter(r=>filter==='all'||(filter==='unrated'?!r.rating:r.rating?.likeness==='not-me'));
  const record=records.find(r=>r.id===selected);
  return <main className="review-page">
    <header className="review-header"><div><span>RiiFFS / LUNAR</span><h1>Portrait review</h1></div><a href={import.meta.env.BASE_URL}>Back to booth</a></header>
    {!loaded?<form className="review-login" onSubmit={e=>{e.preventDefault();void load(draft);}}><label>Review access code<input type="password" autoComplete="current-password" value={draft} onChange={e=>setDraft(e.target.value)} required/></label><button disabled={loading}>Open reviews</button><p role="alert">{error}</p></form>:<>
      <div className="review-toolbar"><label>Show <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All generations</option><option value="unrated">Not rated</option><option value="identity">Identity drift</option></select></label><span>{visible.length} generations</span><button onClick={()=>load(token)} disabled={loading}>Refresh</button><button onClick={()=>{sessionStorage.removeItem('lunar-review-token');setToken('');setDraft('');setRecords([]);setLoaded(false);}}>Lock</button></div>
      {error&&<p role="alert">{error}</p>}
      <div className="review-layout"><aside aria-label="Generations">{visible.map(r=><button key={r.id} aria-pressed={r.id===selected} onClick={()=>setSelected(r.id)}><strong>{r.styleLabel||'Earlier generation'}</strong><span>{new Date(r.createdAt).toLocaleString()}</span><small>{r.rating?.likeness||'Not rated'} · {r.status}</small></button>)}{!visible.length&&<p>No matching generations.</p>}</aside>
      {record?<ReviewDetail key={record.id} record={record} token={token} onSaved={updated=>setRecords(list=>list.map(r=>r.id===updated.id?updated:r))}/>:<p>No generations yet.</p>}</div>
    </>}
  </main>;
}
