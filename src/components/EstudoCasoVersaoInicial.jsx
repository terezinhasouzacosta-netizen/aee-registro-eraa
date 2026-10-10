import { useRef, useState, useEffect } from "react";
import { carregarFontesEstudoCaso } from "../services/estudoCasoVersaoInicialService";
import { gerarVersaoInicial } from "../utils/estudoCasoVersaoInicial";

export default function EstudoCasoVersaoInicial({ alunoId, familia }) {
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const pedido = useRef(0);
  useEffect(() => () => { pedido.current += 1; }, []);

  async function gerar() {
    const atual = ++pedido.current;
    setCarregando(true);
    setMensagem("");
    try {
      const fontes = await carregarFontesEstudoCaso(alunoId);
      if (atual !== pedido.current) return;
      setTexto(gerarVersaoInicial({ ...fontes, familia }));
      setMensagem("Versão inicial gerada para revisão. Nenhum dado foi salvo.");
    } catch {
      if (atual === pedido.current) setMensagem("Não foi possível consultar todas as fontes. Verifique a conexão e as permissões e tente novamente.");
    } finally {
      if (atual === pedido.current) setCarregando(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setMensagem("Texto copiado. Revise antes de utilizar no texto final do Estudo de Caso.");
    } catch {
      setMensagem("Não foi possível copiar automaticamente. Selecione e copie o texto abaixo.");
    }
  }

  return (
    <section className="panel estudo-caso-preview-panel">
      <h2>Versão inicial com dados da plataforma</h2>
      <p className="muted">Reúne Cadastro, Sondagem, Atendimento AEE, PAEE, PEI, evolução do Monitoramento e respostas da família. Informações ausentes serão sinalizadas para revisão.</p>
      <button type="button" onClick={gerar} disabled={!alunoId || carregando || Boolean(texto)}>
        {carregando ? "Consultando registros..." : "Gerar versão inicial"}
      </button>
      {!alunoId ? <p>Selecione um aluno cadastrado para gerar a versão inicial.</p> : null}
      {mensagem ? <p role="status">{mensagem}</p> : null}
      {texto ? <>
        <p>Prévia editável, ainda não salva. Copie a versão revisada para o campo “Texto final revisado” quando estiver pronta.</p>
        <textarea aria-label="Versão inicial para revisão" className="estudo-caso-preview-textarea" rows={24} value={texto} onChange={(event) => setTexto(event.target.value)} />
        <button type="button" className="btn-secondary" onClick={copiar}>Copiar versão inicial</button>
      </> : null}
    </section>
  );
}
