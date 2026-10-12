// Browser-only fixture server. All Firebase imports are replaced before bundling.
// No real SDK, credentials, database, disk persistence or external connections.
import { build } from "esbuild";
import { createServer } from "node:http";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const firestore = `
const today = new Date(); const date = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
const data = new Map([
 ['alunos/a',{nome:'Estudante fictício Ana',turmaAee:'Turma A',professorAee:'Professora fictícia A',turno:'Manhã'}],
 ['alunos/b',{nome:'Estudante fictício Bruno',turmaAee:'Turma A',professorAee:'Professora fictícia A',turno:'Manhã'}],
 ['alunos/c',{nome:'Estudante fictício Clara',turmaAee:'Turma B',professorAee:'Professora fictícia B',turno:'Tarde'}],
 ['sequenciasDidaticasAEE/s1',{titulo:'Comunicação com cartões',turma:'Turma A',eixo:'Comunicação oral',objetivoGeral:'Comunicar escolhas',objetivosEspecificos:'Selecionar cartões',numeroEncontros:3,status:'Em andamento',estrategias:'Modelagem',recursos:'Cartões',encontros:'Encontro 1: apresentar cartões\\nEncontro 2: comunicar escolhas'}],
 ['sequenciasDidaticasAEE/s2',{titulo:'Jogos de autonomia',turma:'Turma B',eixo:'Autonomia',objetivoGeral:'Organizar materiais',numeroEncontros:2,status:'Planejada'}],
 ['cronogramasAEE/Turma A',{turma:'Turma A',dias:'Segunda e quarta',inicio:'08:00',fim:'09:00'}],
 ['atendimentosAEE/legado',{alunoId:'a',alunoNome:'Estudante fictício Ana',modoAtendimento:'AEE',dataAtendimento:date,statusPresenca:'Presente',habilidadesComplementares:'Reconhecer cartões'}],
 ['atendimentosAEE/grupo_a',{alunoId:'a',alunoNome:'Estudante fictício Ana',turmaAee:'Turma A',coletivoId:'grupo',modoAtendimento:'AEE',dataAtendimento:date,statusPresenca:'Ausente',sequenciaId:'s1',sequenciaTitulo:'Comunicação com cartões',encontroNumero:1,objetivo:'Reconhecer cartões',observacoes:'Ausência registrada'}],
 ['atendimentosAEE/grupo_b',{alunoId:'b',alunoNome:'Estudante fictício Bruno',turmaAee:'Turma A',coletivoId:'grupo',modoAtendimento:'AEE',dataAtendimento:date,statusPresenca:'Presente',sequenciaId:'s1',sequenciaTitulo:'Comunicação com cartões',encontroNumero:1,objetivo:'Reconhecer cartões',observacoes:'Participou'}],
]);
let n=0; const snap=(path)=>({id:path.split('/').at(-1),exists:()=>data.has(path),data:()=>structuredClone(data.get(path))});
export const collection=(_,path)=>({path});
export const doc=(parent,name,id)=>id?{path:name+'/'+id,id}:parent.path?{path:parent.path+'/fixture-'+(++n),id:'fixture-'+n}:{path:name,id:name.split('/').at(-1)};
export const documentId=()=> '__id'; export const where=(field,op,value)=>({field,op,value}); export const orderBy=(field)=>({sort:field}); export const query=(ref,...filters)=>({...ref,filters});
export const serverTimestamp=()=>new Date().toISOString();
export async function getDocs(ref){let entries=[...data].filter(([path])=>path.startsWith(ref.path+'/')); for(const f of ref.filters||[]){if(f.field) entries=entries.filter(([path,r])=>f.op==='in'?f.value.includes(f.field==='__id'?path.split('/').at(-1):r[f.field]):r[f.field]===f.value);if(f.sort) entries.sort((a,b)=>String(a[1][f.sort]||'').localeCompare(String(b[1][f.sort]||'')));}return {docs:entries.map(([p])=>snap(p))};}
export const getDoc=async(ref)=>snap(ref.path);
export const addDoc=async(ref,value)=>{const id='fixture-'+(++n);data.set(ref.path+'/'+id,structuredClone(value));return {id};};
export const setDoc=async(ref,value,options)=>data.set(ref.path,{...(options?.merge?data.get(ref.path):{}),...structuredClone(value)});
export const updateDoc=async(ref,value)=>{if(!data.has(ref.path))throw Error('Registro não encontrado');data.set(ref.path,{...data.get(ref.path),...structuredClone(value)});};
export const deleteDoc=async(ref)=>data.delete(ref.path);
export async function runTransaction(_,fn){const writes=[];const result=await fn({get:async(ref)=>snap(ref.path),set:(ref,value)=>writes.push([ref.path,structuredClone(value)]),update:(ref,value)=>writes.push([ref.path,{...data.get(ref.path),...structuredClone(value)}])});for(const [path,value]of writes)data.set(path,value);return result;}
`;
const modules = {
  firestore,
  firebase: `export const user={uid:'fixture-teacher',displayName:'Professora fictícia',email:'teste@example.test'}; export const db={app:{options:{projectId:'aee-registro-eraa'}}}; export const auth={currentUser:user};`,
  auth: `import {user} from 'fixture:firebase';export const useAuth=()=>({currentUser:user,perfil:'aee'});`,
};
const built = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import Atendimento from './src/pages/AtendimentoAEEPage.jsx';import './src/styles/global.css';createRoot(document.getElementById('root')).render(<><aside role="status" style={{padding:16,background:'#fff2b8'}}>TESTE ISOLADO — dados fictícios em memória. Sem conexão com Firebase. Recarregar descarta todas as alterações.</aside><Atendimento/></>);`, resolveDir: root, loader: "jsx" }, bundle: true, write: false, outdir: "out", jsx: "automatic", format: "esm", loader: { ".png": "dataurl", ".webp": "dataurl", ".jpg": "dataurl" }, define: { "process.env.NODE_ENV": '"development"' }, plugins: [{ name: "firebase-only-in-memory", setup(b) {
  b.onResolve({ filter: /^firebase\// }, (a) => { if (a.path !== "firebase/firestore") throw Error("Firebase inesperado: " + a.path); return { path: "firestore", namespace: "fixture" }; });
  b.onResolve({ filter: /(^|\/)firebase$/ }, () => ({ path: "firebase", namespace: "fixture" }));
  b.onResolve({ filter: /\/hooks\/useAuth$/ }, () => ({ path: "auth", namespace: "fixture" }));
  b.onResolve({ filter: /^fixture:firebase$/ }, () => ({ path: "firebase", namespace: "fixture" }));
  b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({ contents: modules[a.path], loader: "js" }));
} }] });
const js = built.outputFiles.find((f) => f.path.endsWith(".js")).contents, css = built.outputFiles.find((f) => f.path.endsWith(".css")).contents;
const server = createServer((req, res) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; connect-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'");
  if (req.url === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(js); }
  else if (req.url === "/bundle.css") { res.setHeader("Content-Type", "text/css"); res.end(css); }
  else if (req.url === "/") { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Teste isolado — Atendimento AEE</title><link rel="stylesheet" href="/bundle.css"><div id="root"></div><script type="module" src="/bundle.js"></script></html>'); }
  else { res.statusCode = 404; res.end(); }
});
server.listen(5184, "127.0.0.1", () => console.log("Teste em memória: http://127.0.0.1:5184 — Firebase substituído; conexões externas bloqueadas."));
