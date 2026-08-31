import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const demoRoot = join(projectRoot, "src", "demo");
const extensoesVerificadas = new Set([".js", ".jsx", ".json", ".css"]);

const regrasProibidas = [
  { nome: "Firebase", expressao: /(?:from\s*["'][^"']*firebase|firebase\/|services\/firebase)/i },
  { nome: "serviços institucionais", expressao: /(?:from\s*["'][^"']*services\/|\/services\/)/i },
  { nome: "AuthContext/useAuth", expressao: /(?:AuthContext|useAuth)/ },
  {
    nome: "páginas institucionais",
    expressao: /(?:from\s*["'](?:\.\.\/)+pages\/|from\s*["'][^"']*src\/pages\/)/i,
  },
  { nome: "API fetch", expressao: /\bfetch\s*\(/ },
  { nome: "XMLHttpRequest", expressao: /\bXMLHttpRequest\b/ },
  { nome: "WebSocket", expressao: /\bWebSocket\b/ },
  { nome: "sendBeacon", expressao: /\bsendBeacon\s*\(/ },
  { nome: "localStorage", expressao: /\blocalStorage\b/ },
  { nome: "sessionStorage", expressao: /\bsessionStorage\b/ },
  {
    nome: "operações Firestore",
    expressao: /\b(?:addDoc|setDoc|updateDoc|deleteDoc|getDoc|getDocs|onSnapshot)\s*\(/,
  },
  { nome: "URLs externas", expressao: /https?:\/\//i },
];

async function listarArquivos(diretorio) {
  const entradas = await readdir(diretorio, { withFileTypes: true });
  const arquivos = await Promise.all(
    entradas.map((entrada) => {
      const caminho = join(diretorio, entrada.name);
      return entrada.isDirectory() ? listarArquivos(caminho) : [caminho];
    })
  );
  return arquivos.flat();
}

const arquivos = (await listarArquivos(demoRoot)).filter((arquivo) =>
  extensoesVerificadas.has(extname(arquivo))
);
const violacoes = [];

for (const arquivo of arquivos) {
  const conteudo = await readFile(arquivo, "utf8");
  for (const regra of regrasProibidas) {
    if (regra.expressao.test(conteudo)) {
      violacoes.push(`${relative(projectRoot, arquivo)}: ${regra.nome}`);
    }
  }
}

if (violacoes.length > 0) {
  console.error("[demo-isolation] Falha: dependências ou APIs proibidas foram encontradas.");
  violacoes.forEach((violacao) => console.error(`- ${violacao}`));
  process.exit(1);
}

console.log(
  `[demo-isolation] OK: ${arquivos.length} arquivos verificados; nenhuma dependência institucional, chamada externa ou persistência encontrada.`
);
