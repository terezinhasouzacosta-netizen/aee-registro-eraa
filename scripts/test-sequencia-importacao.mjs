import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import * as modelo from "../src/utils/salaRecursosAee.js";
import * as importar from "../src/services/entrevistaImportService.js";
function ambiente() {
  let cursor=0; const states=[], saves=[];
  const jsx=(type,props)=>({type,props});
  const deps={
    react:{useState(init){const i=cursor++;if(!(i in states))states[i]=typeof init==="function"?init():init;return [states[i],value=>{states[i]=typeof value==="function"?value(states[i]):value;}];}},
    "react/jsx-runtime":{jsx,jsxs:jsx}, "lucide-react":{},
    "../utils/salaRecursosAee":modelo, "../services/entrevistaImportService":importar,
    "../services/salaRecursosAeeService":{salvarSequenciaAee:async(id,form)=>{saves.push({id,form});return id||"sequencia-teste";}},
  };
  const ctx={module:{exports:{}},require(id){if(!(id in deps))throw Error(id);return deps[id];}};
  vm.runInNewContext(transformSync(readFileSync(new URL("../src/components/SequenciaDidaticaAee.jsx",import.meta.url),"utf8"),{loader:"jsx",jsx:"automatic",format:"cjs"}).code,ctx);
  return {analisar:ctx.module.exports.analisarTextoSequencia,saves,render(){cursor=0;return ctx.module.exports.default({sequencias:[],podeEditar:true,onSaved:async()=>{}});}};
}
function nodes(n){return !n||typeof n!=="object"?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];}
function text(n){return typeof n==="string"?n:Array.isArray(n)?n.map(text).join(""):n&&typeof n==="object"?text(n.props?.children):"";}
test("remove Copiar inicial nos oito campos e preserva o restante do conteúdo",()=>{
 const a=ambiente();const labels=["Título","Objetivo Geral","Objetivos específicos","Estratégias","Recursos","Avaliação","Observações","Encontros"];
 for(const separador of ["\n","\r\n  \r\n\t","   "]) {
   const result=a.analisar(labels.map(label=>label+":\nCopiar"+separador+"Conteúdo integral.\n  Segunda linha; copiar permanece.").join("\n"));
   assert.equal(result.secoes.length,8);
   for(const secao of result.secoes)assert.equal(secao.texto,"Conteúdo integral.\n  Segunda linha; copiar permanece.");
 }
 assert.equal(a.analisar("Título: Copiarmos juntos").secoes[0].texto,"Copiarmos juntos");
 assert.equal(a.analisar("Observações: Conteúdo com Copiar no meio.").secoes[0].texto,"Conteúdo com Copiar no meio.");
});
test("prévia e formulário salvam sem Copiar; segundo salvamento reutiliza ID e botão Atualizar",async()=>{
 const a=ambiente();let tree=a.render();
 nodes(tree).find(n=>n.type==="textarea"&&n.props.rows===8).props.onChange({target:{value:"Título: Copiar Teste\nEixo: Comunicação\nObjetivo Geral: Copiar\nObjetivo preservado.\nTurma: Turma A"}});
 tree=a.render();nodes(tree).find(n=>n.type==="button"&&text(n)==="Organizar sequência e visualizar prévia").props.onClick();
 tree=a.render();assert.ok(nodes(tree).some(n=>n.type==="pre"&&text(n)==="Objetivo preservado."));
 nodes(tree).find(n=>n.type==="button"&&text(n)==="Confirmar organização da sequência").props.onClick();
 tree=a.render();await nodes(tree).find(n=>n.type==="form").props.onSubmit({preventDefault(){}});
 tree=a.render();assert.ok(nodes(tree).some(n=>n.type==="button"&&text(n)==="Atualizar sequência"));assert.ok(nodes(tree).some(n=>n.props?.role==="status"&&text(n)==="Sequência salva."));
 assert.equal(a.saves[0].form.titulo,"Teste");assert.equal(a.saves[0].form.objetivoGeral,"Objetivo preservado.");assert.equal(a.saves[0].id,"");
 await nodes(tree).find(n=>n.type==="form").props.onSubmit({preventDefault(){}});
 assert.equal(a.saves[1].id,"sequencia-teste");
});
