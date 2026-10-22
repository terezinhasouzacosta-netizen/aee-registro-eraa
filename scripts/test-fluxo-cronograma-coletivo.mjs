import * as agendaModelo from '../src/utils/agendaAee.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {transformSync} from 'esbuild';
import * as modelo from '../src/utils/salaRecursosAee.js';
function harness(alunoIds = ["a", "b"], fornecidos) {
 const states=[];let cursor=0;const saves=[];
 const jsx=(type,props)=>({type,props});
 const deps={react:{useState(init){const i=cursor++;if(!(i in states))states[i]=typeof init==='function'?init():init;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];}},'react/jsx-runtime':{jsx,jsxs:jsx},'lucide-react':new Proxy({},{get:(_,key)=>key}),'../utils/agendaAee':agendaModelo,'../utils/salaRecursosAee':modelo,'../services/atendimentoAeeService':{EIXOS_TEMATICOS_OPCOES:[]},'../services/salaRecursosAeeService':{salvarColetivoAee:async(...args)=>saves.push(args)}};
 const ctx={module:{exports:{}},crypto:{randomUUID:()=> 'sessao'},require:id=>{if(!(id in deps))throw Error(id);return deps[id];}};
 vm.runInNewContext(transformSync(readFileSync(new URL('../src/components/RegistroColetivoAee.jsx',import.meta.url),'utf8'),{loader:'jsx',jsx:'automatic',format:'cjs'}).code,ctx);
 const alunos=fornecidos || [{id:'a',nome:'Ana',turmaAee:'Turma A'},{id:'b',nome:'Bruno',turmaAee:'Turma A'}];
 const props={turma:'Turma A',alunos,sequencias:[],agenda:alunoIds === null ? undefined : {alunoIds, dataAtendimento:'2026-10-13',participantes:[]},podeEditar:true,onSaved:async()=>{}};
 return {props,saves,render(){cursor=0;return ctx.module.exports.default(props);}};
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
test('lista preparada vazia nunca retorna turma completa',()=>{const tree=harness([]).render();assert.equal(nodes(tree).filter(n=>n.type==='h4').length,0);assert.equal(button(tree,'Confirmar chamada'),undefined);});

test('abertura direta sem preparação é bloqueada',()=>{const tree=harness(null).render();assert.equal(nodes(tree).filter(n=>n.type==='h4').length,0);assert.equal(button(tree,'Salvar atendimento coletivo'),undefined);});

function salaHarness(opcoes = {}) {
  const states=[]; let cursor=0; let serial=0;
  const jsx=(type,props)=>({type,props});
  const deps={
    react:{useEffect(){},useState(init){const i=cursor++;if(!(i in states))states[i]=init===true?false:typeof init==='function'?init():init;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];}},
    'react/jsx-runtime':{jsx,jsxs:jsx},
    'lucide-react':new Proxy({},{get:(_,key)=>key}),
    '../utils/agendaAee':agendaModelo,'../utils/salaRecursosAee':modelo,
    '../services/firebase':{db:{app:{options:{projectId:'aee-registro-eraa'}}}},
    '../services/salaRecursosAeeService':{},
    './CronogramaDiarioAee':{__esModule:true,default:'Cronograma'},
    './RegistroColetivoAee':{__esModule:true,default:'Coletivo'},
    './SequenciaDidaticaAee':{__esModule:true,default:'Sequencia'},
    './SalaRecursosAee.css':{},
  };
  const ctx={module:{exports:{}},crypto:{randomUUID:()=>String(++serial)},require:id=>{if(!(id in deps))throw Error(id);return deps[id];}};
  vm.runInNewContext(transformSync(readFileSync(new URL('../src/components/SalaRecursosAee.jsx',import.meta.url),'utf8'),{loader:'jsx',jsx:'automatic',format:'cjs'}).code,ctx);
  const alunos=Array.from({length:32},(_,i)=>({id:'a'+i,nome:'Aluno '+i,turmaAee:'Turma A',diasAee:['quarta'],turnoAee:'Tarde',horaInicioAee:'13:00',horaFimAee:'14:00'})).concat(Array.from({length:5},(_,i)=>({id:'b'+i,nome:'Outro '+i,turmaAee:'Turma B',diasAee:['quarta'],turnoAee:'Tarde',horaInicioAee:'14:00',horaFimAee:'15:00'})));
  const render=()=>{cursor=0;if(opcoes.registros)states[3]=opcoes.registros;return ctx.module.exports.default({alunos,podeEditar:opcoes.podeEditar ?? true,currentUser:{uid:'teste'},onSequenciasChange(){},onRegistroSalvo(){}});};
  const preparar=(turma,ids)=>agendaModelo.prepararParticipantesAee(alunos,turma,'quarta','2026-10-14',ids);
  const cron=turma=>nodes(render()).find(n=>n.type==='Cronograma'&&n.props.turma===turma);
  const abrir=turma=>{button(render(),'Abrir atendimento preparado — '+turma).props.onClick();return nodes(render()).find(n=>n.type==='Coletivo');};
  return {alunos,render,preparar,cron,abrir};
}
test('9 de 32 da A e 2 da B permanecem separados ao alternar e retornar',()=>{
 const h=salaHarness(),ids=h.alunos.slice(0,9).map(a=>a.id);
 h.cron('Turma A').props.onPreparar(h.preparar('Turma A',ids));
 h.cron('Turma B').props.onPreparar(h.preparar('Turma B',['b1','b3']));
 for(const turma of ['Turma A','Turma B','Turma A']) {
  const c=h.abrir(turma);assert.deepEqual(Array.from(c.props.alunos,a=>a.id),turma==='Turma A'?ids:['b1','b3']);
  assert.equal(nodes(h.render()).filter(n=>n.type==='Cronograma').length,2);
 }
});
test('sem preparação e seleção alterada exigem nova preparação',()=>{
 const h=salaHarness();assert.equal(h.abrir('Turma A'),undefined);
 h.cron('Turma A').props.onPreparar(h.preparar('Turma A',['a0']));assert.ok(h.abrir('Turma A'));
 h.cron('Turma A').props.onPreparar(null);assert.equal(h.abrir('Turma A'),undefined);
 h.cron('Turma A').props.onPreparar(h.preparar('Turma A',['a1']));assert.deepEqual(Array.from(h.abrir('Turma A').props.alunos,a=>a.id),['a1']);
});
test('dia, turma, IDs estrangeiros, vazios ou duplicados invalidam preparação',()=>{
 for(const patch of [{diaSemanaAee:'segunda'},{turmaAee:'Turma B'},{alunoIds:['a0','b1']},{alunoIds:[]},{alunoIds:['a0','a0']}]) {
  const h=salaHarness();h.cron('Turma A').props.onPreparar({...h.preparar('Turma A',['a0']),...patch});assert.equal(h.abrir('Turma A'),undefined);
 }
});
test('mudança da agenda cadastrada bloqueia inclusive sessão aberta',()=>{
 const h=salaHarness();h.cron('Turma A').props.onPreparar(h.preparar('Turma A',['a0']));assert.ok(h.abrir('Turma A'));
 h.alunos[0].diasAee=['segunda'];assert.equal(nodes(h.render()).find(n=>n.type==='Coletivo'),undefined);assert.equal(h.abrir('Turma A'),undefined);
});

test('sessão com 9 cartões salva apenas seus IDs, chamada e observações',async()=>{
 const sala=salaHarness(),ids=sala.alunos.slice(0,9).map(a=>a.id);
 sala.cron('Turma A').props.onPreparar(sala.preparar('Turma A',ids));
 const props=sala.abrir('Turma A').props,h=harness(props.agenda.alunoIds,props.alunos);
 let tree=h.render();assert.equal(nodes(tree).filter(n=>n.type==='h4').length,9);
 const estudantes=nodes(tree).find(n=>n.type==='div'&&nodes(n).some(v=>v.type==='dt'&&text(v)==='Estudantes')&&nodes(n).some(v=>v.type==='dd'&&v.props.children===9));assert.ok(estudantes);
 const selects=nodes(tree).filter(n=>n.type==='select');
 selects.forEach((n,i)=>n.props.onChange({target:{value:i===7?'Ausente':i===8?'Falta justificada':'Presente'}}));
 nodes(tree).filter(n=>n.type==='textarea').forEach((n,i)=>n.props.onChange({target:{value:'Observação fictícia '+i}}));
 tree=h.render();button(tree,'Confirmar chamada').props.onClick();tree=h.render();assert.equal(nodes(tree).filter(n=>n.type==='h4').length,7);
 await nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
 assert.deepEqual(Array.from(h.saves[0][2],a=>a.id),ids);assert.equal(Object.keys(h.saves[0][1].individuais).length,9);
 assert.equal(h.saves[0][1].individuais.a7.statusPresenca,'Ausente');assert.equal(h.saves[0][1].individuais.a8.statusPresenca,'Falta justificada');assert.equal(h.saves[0][1].individuais.a8.observacoes,'Observação fictícia 8');
});

test('consulta de existentes abre sem preparação e não cria novo atendimento',()=>{
 const h=salaHarness();button(h.render(),'Registro coletivo existente — Turma A').props.onClick();
 const tree=h.render();assert.ok(nodes(tree).some(n=>n.props?.['aria-label']==='Consulta de registros coletivos'));
 assert.equal(nodes(tree).find(n=>n.type==='Coletivo'),undefined);
});

test('consulta isola coletivo, turma e alunoId, sem permitir escrita',()=>{
 const registros=[
 {id:'c1_a0',coletivoId:'c1',alunoId:'a0',alunoNome:'Participante salvo',turmaAee:'Turma A',dataAtendimento:'2026-10-14',statusPresenca:'Presente',observacoes:'Relato preservado'},
 {id:'c2_a1',coletivoId:'c2',alunoId:'a1',alunoNome:'Outra sessão',turmaAee:'Turma A',dataAtendimento:'2026-10-13',statusPresenca:'Falta justificada'},
 {id:'c3_b0',coletivoId:'c3',alunoId:'b0',alunoNome:'Somente B',turmaAee:'Turma B',dataAtendimento:'2026-10-14'},
 {id:'c4_x',coletivoId:'c4',alunoId:'fora-do-acesso',alunoNome:'Não autorizado',turmaAee:'Turma A'},
 {id:'individual',alunoId:'a2',alunoNome:'Somente individual',turmaAee:'Turma A'}];
 const antes=JSON.stringify(registros),h=salaHarness({registros,podeEditar:false});
 const b=button(h.render(),'Registro coletivo existente — Turma A');assert.equal(b.props.disabled,false);b.props.onClick();
 const tree=h.render(),consulta=nodes(tree).find(n=>n.props?.['aria-label']==='Consulta de registros coletivos');
 assert.equal(nodes(consulta).filter(n=>n.type==='details').length,2);
 assert.match(text(consulta),/Participante salvo/);assert.match(text(consulta),/Relato preservado/);
 for(const nome of ['Somente B','Não autorizado','Somente individual','Aluno 31'])assert.equal(text(consulta).includes(nome),false);
 assert.equal(nodes(consulta).some(n=>['input','textarea','select','form'].includes(n.type)),false);
 assert.equal(JSON.stringify(registros),antes);
});
test('consulta e retorno preservam preparação e novo registro continua protegido',()=>{
 const h=salaHarness();h.cron('Turma A').props.onPreparar(h.preparar('Turma A',['a0','a1']));
 button(h.render(),'Registro coletivo existente — Turma B').props.onClick();
 const consulta=nodes(h.render()).find(n=>n.props?.['aria-label']==='Consulta de registros coletivos');assert.match(text(consulta),/Nenhum registro coletivo/);
 button(h.render(),'Voltar ao Cronograma').props.onClick();assert.equal(h.abrir('Turma A').props.alunos.length,2);
 assert.equal(h.abrir('Turma B'),undefined);
});


test('tela aprovada mantém seções e sete campos; troca preserva textos e encontro, com aviso', async()=>{
 const h=harness();h.props.sequencias=[{id:'s1',titulo:'Primeira',turma:'Turma A',numeroEncontros:3},{id:'s2',titulo:'Segunda',turma:'Turma A',numeroEncontros:1}];
 let t=h.render();nodes(t).filter(n=>n.type==='select').forEach(n=>n.props.onChange({target:{value:'Presente'}}));button(h.render(),'Confirmar chamada').props.onClick();t=h.render();
 assert.deepEqual(nodes(t).filter(n=>n.type==='h3').map(text).filter(v=>v.trim()!=='Turma A'),[' Estudantes presentes',' Planejamento',' Objetivos',' Desenvolvimento',' Avaliação']);
 const input=(tree,label,type)=>nodes(nodes(tree).find(n=>n.type==='label'&&text(n).startsWith(label))).find(n=>n.type===type);
 const campos=[['Eixo do atendimento','input'],['Objetivo','textarea'],['Estratégias','textarea'],['Recursos','textarea'],['Atividades','textarea'],['Avaliação geral','textarea'],['Encaminhamentos','textarea']];
 for(const [label,type] of campos)input(t,label,type).props.onChange({target:{value:'Texto próprio: '+label}});
 input(h.render(),'Sequência utilizada','select').props.onChange({target:{value:'s1'}});t=h.render();input(t,'Encontro da sequência','input').props.onChange({target:{value:'3'}});
 button(h.render(),'Usar planejamento nos campos vazios').props.onClick();t=h.render();for(const [label,type] of campos)assert.equal(input(t,label,type).props.value,'Texto próprio: '+label);
 input(t,'Sequência utilizada','select').props.onChange({target:{value:'s2'}});t=h.render();assert.equal(input(t,'Encontro da sequência','input').props.value,'3');assert.equal(input(t,'Encontro da sequência','input').props.max,1);assert.match(text(t),/podem pertencer ao planejamento anterior/);
 input(t,'Encontro da sequência','input').props.onChange({target:{value:'1'}});t=h.render();for(const [label,type] of campos)assert.equal(input(t,label,type).props.value,'Texto próprio: '+label);
 input(t,'Sequência utilizada','select').props.onChange({target:{value:''}});t=h.render();for(const [label,type] of campos)assert.equal(input(t,label,type).props.value,'Texto próprio: '+label);
 await nodes(t).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});assert.equal(h.saves[0][1].objetivo,'Texto próprio: Objetivo');
});
