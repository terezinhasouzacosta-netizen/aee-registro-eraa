import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {transformSync} from 'esbuild';
import * as modelo from '../src/utils/salaRecursosAee.js';
function harness(alunoIds = ["a", "b"]) {
 const states=[];let cursor=0;const saves=[];
 const jsx=(type,props)=>({type,props});
 const deps={react:{useState(init){const i=cursor++;if(!(i in states))states[i]=typeof init==='function'?init():init;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];}},'react/jsx-runtime':{jsx,jsxs:jsx},'lucide-react':new Proxy({},{get:(_,key)=>key}),'../utils/salaRecursosAee':modelo,'../services/atendimentoAeeService':{EIXOS_TEMATICOS_OPCOES:[]},'../services/salaRecursosAeeService':{salvarColetivoAee:async(...args)=>saves.push(args)}};
 const ctx={module:{exports:{}},crypto:{randomUUID:()=> 'sessao'},require:id=>{if(!(id in deps))throw Error(id);return deps[id];}};
 vm.runInNewContext(transformSync(readFileSync(new URL('../src/components/RegistroColetivoAee.jsx',import.meta.url),'utf8'),{loader:'jsx',jsx:'automatic',format:'cjs'}).code,ctx);
 const alunos=[{id:'a',nome:'Ana',turmaAee:'Turma A'},{id:'b',nome:'Bruno',turmaAee:'Turma A'}];
 const props={turma:'Turma A',alunos,sequencias:[],agenda:alunoIds === null ? undefined : {alunoIds, dataAtendimento:'2026-10-13',participantes:[]},podeEditar:true,onSaved:async()=>{}};
 return {saves,render(){cursor=0;return ctx.module.exports.default(props);}};
}
function nodes(node){return !node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...nodes(node.props?.children)];}
const text=n=>typeof n==='string'?n:Array.isArray(n)?n.map(text).join(''):n&&typeof n==='object'?text(n.props?.children):'';
const button=(tree,label)=>nodes(tree).find(n=>n.type==='button'&&text(n)===label);
test('chamada confirma apenas selecionados, oculta ausentes e preserva todos no salvamento existente',async()=>{
 const h=harness();let tree=h.render();assert.equal(button(tree,'Confirmar chamada').props.disabled,true);assert.equal(button(tree,'Salvar atendimento coletivo'),undefined);
 const selects=nodes(tree).filter(n=>n.type==='select');selects[0].props.onChange({target:{value:'Presente'}});selects[1].props.onChange({target:{value:'Ausente'}});
 tree=h.render();button(tree,'Confirmar chamada').props.onClick();tree=h.render();assert.deepEqual(nodes(tree).filter(n=>n.type==='h4').map(text),['Ana']);
 await nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});assert.equal(h.saves.length,1);assert.equal(h.saves[0][2].length,2);assert.equal(h.saves[0][1].individuais.b.statusPresenca,'Ausente');assert.equal(h.saves[0][1].dataAtendimento,'2026-10-13');
});
test('revisão preserva chamada e zero presentes não abre registro pedagógico',()=>{
 const h=harness();let tree=h.render();for(const n of nodes(tree).filter(n=>n.type==='select'))n.props.onChange({target:{value:'Falta justificada'}});
 tree=h.render();button(tree,'Confirmar chamada').props.onClick();tree=h.render();assert.equal(button(tree,'Salvar atendimento coletivo'),undefined);assert.equal(nodes(tree).filter(n=>n.type==='h4').length,0);button(tree,'Revisar chamada').props.onClick();tree=h.render();assert.equal(nodes(tree).filter(n=>n.type==='select').every(n=>n.props.value==='Falta justificada'),true);
});

test('lista preparada prevalece mesmo recebendo a turma completa',async()=>{const h=harness(['a']);let tree=h.render();assert.deepEqual(nodes(tree).filter(n=>n.type==='h4').map(text),['Ana']);nodes(tree).find(n=>n.type==='select').props.onChange({target:{value:'Presente'}});tree=h.render();button(tree,'Confirmar chamada').props.onClick();tree=h.render();await nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});assert.deepEqual(Array.from(h.saves[0][2],a=>a.id),['a']);assert.deepEqual(Object.keys(h.saves[0][1].individuais),['a']);});
test('lista preparada vazia nunca retorna turma completa',()=>{const tree=harness([]).render();assert.equal(nodes(tree).filter(n=>n.type==='h4').length,0);assert.equal(button(tree,'Confirmar chamada').props.disabled,true);});

test('abertura direta sem lista preparada conserva turma completa',()=>{const tree=harness(null).render();assert.deepEqual(nodes(tree).filter(n=>n.type==='h4').map(text),['Ana','Bruno']);assert.ok(button(tree,'Salvar atendimento coletivo'));});
