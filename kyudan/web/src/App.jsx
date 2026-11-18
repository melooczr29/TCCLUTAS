import { useEffect, useState } from 'react';
import { api, definirToken, definirAoExpirar, temToken } from './api.js';
import { Painel, Acessos, Academias, Alunos, Chamada, Avisos, MinhaTrilha, Auditoria, Faixas } from './paginas.jsx';

export const NOMES_PERFIL = {
  superadmin: 'Administrador supremo',
  admin: 'Administrador',
  gestor: 'Gestor',
  mestre: 'Mestre',
  autonomo: 'Professor autônomo',
  aluno: 'Aluno',
};

// Menu de cada perfil.
const MENU = [
  { id: 'painel', nome: 'Painel', perfis: ['superadmin', 'admin', 'gestor', 'mestre', 'autonomo'], Tela: Painel },
  { id: 'trilha', nome: 'Minha trilha', perfis: ['aluno'], Tela: MinhaTrilha },
  { id: 'academias', nome: 'Academias', perfis: ['superadmin', 'admin'], Tela: Academias },
  { id: 'alunos', nome: 'Alunos', perfis: ['superadmin', 'admin', 'gestor', 'mestre', 'autonomo'], Tela: Alunos },
  { id: 'chamada', nome: 'Turmas e chamada', perfis: ['superadmin', 'admin', 'gestor', 'mestre', 'autonomo'], Tela: Chamada },
  { id: 'faixas', nome: 'Faixas e requisitos', perfis: ['superadmin', 'admin', 'gestor'], Tela: Faixas },
  { id: 'avisos', nome: 'Avisos', perfis: ['superadmin', 'admin', 'gestor', 'mestre', 'autonomo', 'aluno'], Tela: Avisos },
  { id: 'acessos', nome: 'Acessos', perfis: ['superadmin', 'admin', 'gestor'], Tela: Acessos },
  { id: 'auditoria', nome: 'Auditoria', perfis: ['superadmin'], Tela: Auditoria },
];

function Login({ aoEntrar, mensagem }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState(mensagem || '');
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const r = await api('/auth/login', { method: 'POST', body: { email, password } });
      definirToken(r.token);
      aoEntrar(r.user);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <form onSubmit={entrar}>
        <div>
          <div className="marca">Kyu <span>Dan</span></div>
          <div className="suave">Conexão e gestão para artes marciais</div>
        </div>
        <label>E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
        </label>
        <label>Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {erro && <div className="erro">{erro}</div>}
        <button className="btn" disabled={enviando}>{enviando ? 'Entrando...' : 'Entrar'}</button>
      </form>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [carregando, setCarregando] = useState(temToken());
  const [mensagem, setMensagem] = useState('');
  const [tela, setTela] = useState(null);
  const [academias, setAcademias] = useState([]);
  const [academiaId, setAcademiaId] = useState('');

  function sair(msg = '') {
    definirToken(null);
    setUser(null);
    setTela(null);
    setAcademiaId('');
    setMensagem(typeof msg === 'string' ? msg : '');
  }

  useEffect(() => {
    definirAoExpirar((msg) => sair(msg));
    if (!temToken()) return;
    api('/auth/me').then(setUser).catch(() => {}).finally(() => setCarregando(false));
  }, []);

  const global = user && ['superadmin', 'admin'].includes(user.role);
  const recarregarAcademias = () => api('/academias').then(setAcademias).catch(() => {});
  useEffect(() => { if (user) recarregarAcademias(); }, [user]);

  if (carregando) return null;
  if (!user) return <Login aoEntrar={(u) => { setMensagem(''); setUser(u); }} mensagem={mensagem} />;

  const itens = MENU.filter((m) => m.perfis.includes(user.role));
  const atual = itens.find((m) => m.id === tela) || itens[0];
  const Tela = atual.Tela;
  // Perfis globais escolhem a academia no topo; os demais ja tem a sua.
  const contexto = {
    user,
    global,
    academias,
    academiaId: global ? academiaId : user.academy_id,
    recarregarAcademias,
  };

  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca">Kyu <span>Dan</span></div>
        <div className="perfil">{NOMES_PERFIL[user.role]}</div>
        {itens.map((m) => (
          <button key={m.id} className={`nav ${m.id === atual.id ? 'ativo' : ''}`} onClick={() => setTela(m.id)}>
            {m.nome}
          </button>
        ))}
        <div className="rodape">
          <div>{user.name}</div>
          <button onClick={() => sair()}>Sair</button>
        </div>
      </aside>
      <main className="conteudo">
        <div className="topo">
          <div>
            <h1>{atual.nome}</h1>
            <div className="suave">
              {global ? 'Visão de toda a plataforma' : academias[0]?.name || ''}
            </div>
          </div>
          {global && (
            <label>Academia
              <select value={academiaId} onChange={(e) => setAcademiaId(e.target.value)}>
                <option value="">Todas as academias</option>
                {academias.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          )}
        </div>
        <Tela key={`${atual.id}-${contexto.academiaId || ''}`} ctx={contexto} />
      </main>
    </div>
  );
}
