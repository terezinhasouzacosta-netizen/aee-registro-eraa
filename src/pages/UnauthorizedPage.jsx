import { Link } from "react-router-dom";

function UnauthorizedPage() {
  return (
    <main className="center-page">
      <section className="panel">
        <h1>Sem permissão</h1>
        <p>Seu perfil não possui acesso a esta área.</p>
        <Link to="/alunos">Voltar para início</Link>
      </section>
    </main>
  );
}

export default UnauthorizedPage;

