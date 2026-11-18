import { useEffect, useState } from 'react';
import { api } from './api.js';
import { NOMES_PERFIL } from './App.jsx';

// ---------- utilitarios ----------
function useDados(carregar, deps = []) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const recarregar = () => carregar().then((d) => { setDados(d); setErro(''); }).catch((e) => setErro(e.message));
  useEffect(() => { recarregar(); }, deps);
  return [dados, recarregar, erro];
}
const dataBR = (d) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('pt-BR') : '');
const hojeISO = () => new Date().toLocaleDateString('sv-SE');
const Faixa = ({ nome, cor }) => (nome ? <span className="faixa"><i style={{ background: cor }} />{nome}</span> : null);
const Erro = ({ msg }) => (msg ? <div className="erro">{msg}</div> : null);

function useForm(inicial) {
  const [v, setV] = useState(inicial);
  const campo = (nome) => ({ value: v[nome] ?? '', onChange: (e) => setV({ ...v, [nome]: e.target.value }) });
  return [v, campo, () => setV(inicial)];
}
const MODALIDADES = { judo: 'Judô', bjj: 'Jiu-Jitsu' };
const Selo = ({ m }) => <span className="etiqueta">{MODALIDADES[m] || m}</span>;
const PedeAcademia = () => (
  <p className="suave">Escolha uma academia no topo da página para cadastrar.</p>
);

// ---------- Painel ----------
export function Painel({ ctx }) {
  const [n, , erro] = useDados(() => api('/painel', { query: { academy_id: ctx.academiaId } }));
  if (!n) return <Erro msg={erro} />;
  const itens = [
    ctx.global && !ctx.academiaId && ['Academias', n.academias],
    ['Alunos ativos', n.alunos_ativos],
    ['Turmas', n.turmas],
    ['Usuários', n.usuarios],
    ['Presenças em 30 dias', n.presencas_30_dias],
  ].filter(Boolean);
  return (
    <>
      <div className="grade">
        {itens.map(([rotulo, valor]) => <div className="numero" key={rotulo}><b>{valor}</b><span>{rotulo}</span></div>)}
      </div>
      {ctx.user.role === 'superadmin' && (
        <div className="cartao">
          <h2>Você é o administrador supremo</h2>
          <p>Sua conta enxerga todas as academias e todos os usuários, e não pode ser revogada nem excluída por ninguém.</p>
          <p className="suave">Em Acessos você cria administradores, revoga e devolve o acesso de qualquer pessoa. Em Auditoria fica o registro de quem fez o quê.</p>
        </div>
      )}
    </>
  );
}

// ---------- Acessos ----------
export function Acessos({ ctx }) {
  const { user } = ctx;
  const [lista, recarregar, erroLista] = useDados(() => api('/usuarios', { query: { academy_id: ctx.academiaId } }));
  // Contas de aluno nascem no cadastro do aluno (RF-02), na tela Alunos.
  const perfis = { superadmin: ['admin', 'gestor', 'mestre', 'autonomo'], admin: ['gestor', 'mestre', 'autonomo'], gestor: ['mestre'] }[user.role];
  const [f, campo, limpar] = useForm({ name: '', email: '', password: '', role: perfis[0], academy_id: '' });
  const [erro, setErro] = useState('');

  // Mesma regra da API (rules/acessos.js). A API e quem decide de fato.
  const podeGerenciar = (u) =>
    u.role !== 'superadmin' && u.id !== user.id &&
    (user.role === 'superadmin' || (user.role === 'admin' && u.role !== 'admin') ||
      (user.role === 'gestor' && ['mestre', 'aluno'].includes(u.role) && u.academy_id === user.academy_id));

  async function acao(fn) {
    setErro('');
    try { await fn(); await recarregar(); } catch (e) { setErro(e.message); }
  }
  const criar = (e) => {
    e.preventDefault();
    acao(async () => {
      await api('/usuarios', { method: 'POST', body: { ...f, academy_id: f.academy_id || ctx.academiaId || undefined } });
      limpar();
    });
  };
  const alternar = (u) => {
    if (u.is_active && !window.confirm(`Revogar o acesso de ${u.name}? A pessoa é desconectada na hora.`)) return;
    acao(() => api(`/usuarios/${u.id}/acesso`, { method: 'PATCH', body: { is_active: !u.is_active } }));
  };
  const excluir = (u) => {
    if (!window.confirm(`Excluir ${u.name} em definitivo? Isso não pode ser desfeito.`)) return;
    acao(() => api(`/usuarios/${u.id}`, { method: 'DELETE' }));
  };

  return (
    <>
      <div className="cartao">
        <h2>Novo acesso</h2>
        <form className="linha" onSubmit={criar}>
          <label>Nome<input {...campo('name')} required /></label>
          <label>E-mail<input type="email" {...campo('email')} required /></label>
          <label>Senha inicial<input type="password" minLength={8} {...campo('password')} required /></label>
          <label>Perfil
            <select {...campo('role')}>{perfis.map((p) => <option key={p} value={p}>{NOMES_PERFIL[p]}</option>)}</select>
          </label>
          {ctx.global && f.role !== 'admin' && (
            <label>Academia
              <select {...campo('academy_id')} required={f.role !== 'autonomo' && !ctx.academiaId}>
                <option value="">{ctx.academiaId ? 'A selecionada no topo' : 'Escolha'}</option>
                {ctx.academias.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          )}
          <button className="btn">Criar acesso</button>
        </form>
        {f.role === 'admin' && <p className="suave" style={{ marginTop: 10 }}>Administradores veem todas as academias. Só você pode criar, revogar ou excluir um administrador.</p>}
        <Erro msg={erro || erroLista} />
      </div>
      <div className="cartao rolagem">
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Academia</th><th>Situação</th><th /></tr></thead>
          <tbody>
            {(lista || []).map((u) => (
              <tr key={u.id} className={u.is_active ? '' : 'inativo'}>
                <td>{u.name}{u.id === user.id && <span className="suave"> (você)</span>}</td>
                <td>{u.email}</td>
                <td><span className={`etiqueta ${u.role === 'superadmin' ? 'supremo' : ''}`}>{NOMES_PERFIL[u.role]}</span></td>
                <td>{u.academy_name || (['superadmin', 'admin'].includes(u.role) ? 'Todas' : '')}</td>
                <td>{u.is_active ? 'Ativo' : <span className="etiqueta revogado">Revogado em {dataBR(u.revoked_at)}</span>}</td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {podeGerenciar(u) && (
                    <button className={`btn pequeno ${u.is_active ? 'perigo' : 'claro'}`} onClick={() => alternar(u)}>
                      {u.is_active ? 'Revogar acesso' : 'Devolver acesso'}
                    </button>
                  )}
                  {user.role === 'superadmin' && podeGerenciar(u) && (
                    <> <button className="btn pequeno claro" onClick={() => excluir(u)}>Excluir</button></>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------- Academias ----------
export function Academias({ ctx }) {
  const [f, campo, limpar] = useForm({ name: '', city: '', state: '', owner_name: '' });
  const [erro, setErro] = useState('');
  const criar = async (e) => {
    e.preventDefault();
    setErro('');
    try { await api('/academias', { method: 'POST', body: f }); limpar(); await ctx.recarregarAcademias(); } catch (err) { setErro(err.message); }
  };
  return (
    <>
      <div className="cartao">
        <h2>Nova academia</h2>
        <form className="linha" onSubmit={criar}>
          <label>Nome<input {...campo('name')} required /></label>
          <label>Responsável<input {...campo('owner_name')} /></label>
          <label>Cidade<input {...campo('city')} /></label>
          <label>UF<input {...campo('state')} maxLength={2} style={{ minWidth: 60, width: 70 }} /></label>
          <button className="btn">Cadastrar</button>
        </form>
        <Erro msg={erro} />
      </div>
      <div className="cartao rolagem">
        <table>
          <thead><tr><th>Academia</th><th>Cidade</th><th>Alunos ativos</th><th>Turmas</th><th>Situação</th></tr></thead>
          <tbody>
            {ctx.academias.map((a) => (
              <tr key={a.id}><td>{a.name}</td><td>{[a.city, a.state].filter(Boolean).join(' / ')}</td><td>{a.active_students}</td><td>{a.active_classes}</td><td>{a.status}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------- Alunos ----------
const idade = (nasc) => {
  if (!nasc) return null;
  const n = new Date(`${nasc}T12:00:00`); const h = new Date();
  let a = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a -= 1;
  return a;
};
const GESTAO = ['superadmin', 'admin', 'gestor'];

export function Alunos({ ctx }) {
  const [aberto, setAberto] = useState(null);
  const [lista, recarregar, erroLista] = useDados(() => api('/alunos', { query: { academy_id: ctx.academiaId } }));
  const [turmas] = useDados(() => api('/turmas', { query: { academy_id: ctx.academiaId } }));
  const inicial = {
    name: '', birth_date: '', phone: '', emergency_contact: '', modality_id: 'judo', class_id: '',
    email: '', password: '', g_name: '', g_relation: '', g_phone: '', g_email: '', terms_accepted: false,
  };
  const [f, campo, limpar] = useForm(inicial);
  const [termo, setTermo] = useState(false);
  const [erro, setErro] = useState('');
  const podeCriar = GESTAO.includes(ctx.user.role);
  const anos = idade(f.birth_date);
  const menor = anos != null && anos < 18;
  const podeLogin = anos == null || anos >= 12;

  if (aberto) return <FichaAluno id={aberto} ctx={ctx} voltar={() => { setAberto(null); recarregar(); }} />;

  const criar = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      const body = {
        name: f.name, birth_date: f.birth_date, phone: f.phone || undefined,
        emergency_contact: f.emergency_contact || undefined, modality_id: f.modality_id,
        class_id: f.class_id || undefined, terms_accepted: termo, academy_id: ctx.academiaId,
      };
      if (podeLogin && f.email) Object.assign(body, { email: f.email, password: f.password });
      if (menor) body.guardian = { name: f.g_name, relation: f.g_relation || undefined, phone: f.g_phone || undefined, email: f.g_email || undefined };
      await api('/alunos', { method: 'POST', body });
      limpar(); setTermo(false);
      await recarregar();
    } catch (err) { setErro(err.message); }
  };
  const turmasDaModalidade = (turmas || []).filter((t) => t.modality_id === f.modality_id);

  return (
    <>
      {podeCriar && (
        <div className="cartao">
          <h2>Novo aluno</h2>
          {!ctx.academiaId ? <PedeAcademia /> : (
            <form onSubmit={criar}>
              <div className="linha" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <label>Nome<input {...campo('name')} required /></label>
                <label>Nascimento<input type="date" {...campo('birth_date')} required /></label>
                <label>Telefone<input {...campo('phone')} /></label>
                <label>Contato de emergência<input {...campo('emergency_contact')} /></label>
                <label>Modalidade
                  <select {...campo('modality_id')}>{Object.entries(MODALIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                </label>
                <label>Turma
                  <select {...campo('class_id')}><option value="">Sem turma</option>{turmasDaModalidade.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                </label>
              </div>
              {menor && (
                <>
                  <h2 style={{ marginTop: 16 }}>Responsável legal</h2>
                  <p className="suave">Obrigatório para menores de 18 anos (art. 14 da LGPD).</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <label>Nome<input {...campo('g_name')} required /></label>
                    <label>Parentesco<input {...campo('g_relation')} /></label>
                    <label>Telefone<input {...campo('g_phone')} /></label>
                    <label>E-mail<input type="email" {...campo('g_email')} /></label>
                  </div>
                </>
              )}
              {podeLogin ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                  <label>E-mail de acesso (opcional)<input type="email" {...campo('email')} /></label>
                  <label>Senha inicial<input type="password" minLength={8} {...campo('password')} required={!!f.email} /></label>
                </div>
              ) : <p className="suave" style={{ marginTop: 12 }}>Menor de 12 anos: não recebe acesso próprio.</p>}
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, color: 'var(--texto)' }}>
                <input type="checkbox" checked={termo} onChange={(e) => setTermo(e.target.checked)} style={{ minWidth: 0 }} />
                Termo de responsabilidade aceito
              </label>
              <p style={{ marginTop: 12 }}><button className="btn">Cadastrar</button></p>
            </form>
          )}
          <Erro msg={erro} />
        </div>
      )}
      <div className="cartao rolagem">
        <Erro msg={erroLista} />
        {ehProf(ctx.user) && <p className="suave">Você vê os alunos das turmas sob sua responsabilidade.</p>}
        <table>
          <thead><tr><th>Aluno</th><th>Modalidades e faixas</th>{ctx.global && <th>Academia</th>}</tr></thead>
          <tbody>
            {(lista || []).map((s) => (
              <tr key={s.id} className="clicavel" onClick={() => setAberto(s.id)}>
                <td>{s.name}</td>
                <td>{s.inscricoes.map((i) => (
                  <span key={i.modality_id} style={{ marginRight: 12 }}><Selo m={i.modality_id} /> <Faixa nome={i.belt_name} cor={i.belt_color} /></span>
                ))}</td>
                {ctx.global && <td>{s.academy_name}</td>}
              </tr>
            ))}
            {lista && !lista.length && <tr><td colSpan={3} className="suave">Nenhum aluno.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
const ehProf = (u) => ['mestre', 'autonomo'].includes(u.role);

const STATUS_TECNICA = { bloqueada: 'Bloqueada', apresentada: 'Apresentada', 'em-treino': 'Em treino', validada: 'Validada' };

function Barra({ titulo, atual, exigido, ok, unidade, extra }) {
  const pct = exigido ? Math.min(100, Math.round((atual / exigido) * 100)) : 100;
  return (
    <div>
      <div className="suave">{titulo}</div>
      <div className="barra"><div style={{ width: `${pct}%`, background: ok ? 'var(--ok)' : undefined }} /></div>
      <div>{atual}{unidade} de {exigido}{unidade}{extra ? ` ${extra}` : ''}</div>
    </div>
  );
}

// Ficha: uma trilha por modalidade (RF-20), com os 3 requisitos do RF-04.
export function FichaAluno({ id, ctx, voltar }) {
  const [ficha, recarregarFicha, erroF] = useDados(() => api(`/alunos/${id}`), [id]);
  const [mod, setMod] = useState('');
  const modalidade = mod || ficha?.inscricoes?.[0]?.modality_id || '';
  const [t, recarregarTrilha] = useDados(() => (modalidade ? api(`/alunos/${id}/trilha`, { query: { modalidade } }) : Promise.resolve(null)), [id, modalidade]);
  const [hab, recarregarHab] = useDados(() => (modalidade ? api(`/alunos/${id}/habilidades`, { query: { modalidade } }) : Promise.resolve([])), [id, modalidade]);
  const [erro, setErro] = useState('');
  const [novaMod, setNovaMod] = useState('');
  const professor = ['superadmin', 'admin', 'mestre', 'autonomo'].includes(ctx.user.role);
  const gestao = GESTAO.includes(ctx.user.role);
  if (!ficha) return <Erro msg={erroF} />;
  const recarregar = async () => { await recarregarTrilha(); await recarregarHab(); await recarregarFicha(); };

  const mudarTecnica = async (tec, status) => {
    setErro('');
    try { await api(`/alunos/${id}/habilidades/${tec.id}`, { method: 'PUT', body: { status } }); await recarregar(); } catch (e) { setErro(e.message); }
  };
  const exame = async (result) => {
    if (!window.confirm(`Lançar exame para a faixa ${t.aptidao.proxima_faixa.name} como ${result}?`)) return;
    setErro('');
    const body = { result, modality_id: modalidade };
    try {
      await api(`/alunos/${id}/graduacoes`, { method: 'POST', body });
    } catch (e) {
      if (!e.dados?.requer_confirmacao) return setErro(e.message);
      if (!window.confirm(`${e.message}\n\nA exceção ficará registrada na auditoria.`)) return;
      try { await api(`/alunos/${id}/graduacoes`, { method: 'POST', body: { ...body, confirmar_excecao: true } }); } catch (e2) { return setErro(e2.message); }
    }
    await recarregar();
  };
  const inscrever = async () => {
    setErro('');
    try { await api(`/alunos/${id}/inscricoes`, { method: 'POST', body: { modality_id: novaMod } }); setNovaMod(''); await recarregarFicha(); setMod(novaMod); } catch (e) { setErro(e.message); }
  };
  const a = t?.aptidao;
  const req = a?.requisitos;
  const faltantes = Object.keys(MODALIDADES).filter((m) => !ficha.inscricoes.some((i) => i.modality_id === m));
  const porCategoria = (hab || []).reduce((acc, h) => { (acc[h.category] ||= []).push(h); return acc; }, {});

  return (
    <>
      {voltar && <p><button className="btn claro pequeno" onClick={voltar}>Voltar à lista</button></p>}
      <div className="cartao">
        <div className="topo" style={{ marginBottom: 10 }}>
          <div>
            <h2 style={{ marginBottom: 2 }}>{ficha.name}</h2>
            <div className="suave">
              {ficha.birth_date ? `${idade(ficha.birth_date)} anos` : ''}
              {ficha.responsavel ? ` · Responsável: ${ficha.responsavel.name}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ficha.inscricoes.map((i) => (
              <button key={i.modality_id} className={`btn pequeno ${i.modality_id === modalidade ? '' : 'claro'}`} onClick={() => setMod(i.modality_id)}>
                {MODALIDADES[i.modality_id]}
              </button>
            ))}
            {gestao && faltantes.length > 0 && (
              <>
                <select value={novaMod} onChange={(e) => setNovaMod(e.target.value)} style={{ minWidth: 0 }}>
                  <option value="">Inscrever em...</option>
                  {faltantes.map((m) => <option key={m} value={m}>{MODALIDADES[m]}</option>)}
                </select>
                <button className="btn pequeno claro" disabled={!novaMod} onClick={inscrever}>Inscrever</button>
              </>
            )}
          </div>
        </div>
        {t && (
          <>
            <div className="trilha">
              {t.faixas.map((fx) => (
                <div key={fx.id} className={`passo ${fx.situacao}`} title={fx.data ? `Desde ${dataBR(fx.data)}` : ''}>
                  <Faixa nome={fx.name} cor={fx.color} />
                </div>
              ))}
            </div>
            <p className="suave">Faixa {a.faixa_atual.name} desde {dataBR(a.faixa_atual.desde)}
              {a.ciclo_reiniciado_por_exame ? `; ciclo reiniciado pelo exame de ${dataBR(a.inicio_ciclo)}` : ''}.</p>
            {req ? (
              <div className="grade3">
                <Barra titulo={`Presenças para a ${a.proxima_faixa.name}`} {...req.presencas} unidade="" />
                <Barra titulo="Tempo na faixa" {...req.meses} unidade=" meses" />
                <Barra titulo="Técnicas validadas" {...req.tecnicas} unidade="%" extra={`(${req.tecnicas.validadas} de ${req.tecnicas.total})`} />
              </div>
            ) : <p>Última faixa prevista para a modalidade.</p>}
            {a.alertas.map((al) => <p key={al} className="erro">{al}</p>)}
            {req && (
              <p style={{ marginTop: 14 }}>
                <span className="etiqueta">{a.sugestao_apto ? 'Sinalizado: apto ao exame' : 'Ainda em preparação'}</span>{' '}
                <span className="suave">{a.observacao}</span>
              </p>
            )}
            {professor && req && (
              <p>
                <button className="btn" onClick={() => exame('aprovado')}>Lançar exame: aprovado</button>{' '}
                <button className="btn claro" onClick={() => exame('reprovado')}>Lançar exame: reprovado</button>
              </p>
            )}
          </>
        )}
        <Erro msg={erro} />
      </div>

      <div className="cartao rolagem">
        <h2>Árvore de habilidades</h2>
        {Object.entries(porCategoria).map(([cat, itens]) => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div className="suave" style={{ fontWeight: 600, margin: '6px 0' }}>{cat}</div>
            <table>
              <tbody>
                {itens.map((h) => (
                  <tr key={h.id}>
                    <td>{h.name}{h.exigida_proxima && <span className="suave"> · exigida para a próxima faixa</span>}</td>
                    <td style={{ width: 120 }}>{h.belt_name}</td>
                    <td style={{ width: 170 }}>
                      {professor ? (
                        <select value={h.status} onChange={(e) => mudarTecnica(h, e.target.value)}>
                          {Object.entries(STATUS_TECNICA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      ) : STATUS_TECNICA[h.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {hab && !hab.length && <p className="suave">Esta modalidade ainda não tem técnicas cadastradas.</p>}
      </div>

      <div className="cartao rolagem">
        <h2>Histórico de exames</h2>
        {t?.historico.length ? (
          <table>
            <thead><tr><th>Data</th><th>Faixa</th><th>Resultado</th><th>Presenças</th><th>Meses</th><th>Técnicas</th><th>Sinalizado</th><th>Examinador</th></tr></thead>
            <tbody>
              {t.historico.map((g) => (
                <tr key={g.id}>
                  <td>{dataBR(g.exam_date)}</td><td>{g.to_belt_name}</td><td>{g.result}</td>
                  <td>{g.classes_attended} de {g.classes_required}</td><td>{g.months_in_belt} de {g.months_required}</td>
                  <td>{g.tech_pct}% de {g.tech_pct_required}%</td><td>{g.was_flagged_apt ? 'Sim' : 'Não (exceção)'}</td><td>{g.examiner_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="suave">Nenhum exame registrado.</p>}
      </div>
    </>
  );
}

// ---------- Minha trilha (aluno) ----------
export function MinhaTrilha({ ctx }) {
  const [eu, , erro] = useDados(() => api('/alunos/eu'));
  if (!eu) return <Erro msg={erro} />;
  return <FichaAluno id={eu.id} ctx={ctx} />;
}

// ---------- Turmas e chamada ----------
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export function Chamada({ ctx }) {
  const [turmas, recarregarTurmas, erroT] = useDados(() => api('/turmas', { query: { academy_id: ctx.academiaId } }));
  const [usuarios] = useDados(() => (GESTAO.includes(ctx.user.role) ? api('/usuarios', { query: { academy_id: ctx.academiaId } }) : Promise.resolve([])));
  const [alunos] = useDados(() => (GESTAO.includes(ctx.user.role) ? api('/alunos', { query: { academy_id: ctx.academiaId } }) : Promise.resolve([])));
  const [turmaId, setTurmaId] = useState('');
  const [data, setData] = useState(hojeISO());
  const [busca, setBusca] = useState('');
  const [chamada, setChamada] = useState(null);
  const [erro, setErro] = useState('');
  const [f, campo, limpar] = useForm({ name: '', modality_id: 'judo', teacher_id: '', start_time: '', end_time: '', capacity: '' });
  const [dias, setDias] = useState([]);
  const [matricular, setMatricular] = useState('');
  const gestao = GESTAO.includes(ctx.user.role);
  const marca = ['superadmin', 'admin', 'mestre', 'autonomo'].includes(ctx.user.role);

  const carregar = () => {
    if (!turmaId) return setChamada(null);
    api(`/turmas/${turmaId}/chamada`, { query: { data } }).then(setChamada).catch((e) => setErro(e.message));
  };
  useEffect(carregar, [turmaId, data]);

  const marcar = async (s) => {
    setErro('');
    try { await api(`/turmas/${turmaId}/presencas`, { method: 'POST', body: { student_id: s.id, data, presente: !s.presente } }); carregar(); } catch (e) { setErro(e.message); }
  };
  const criar = async (e) => {
    e.preventDefault();
    setErro('');
    const body = { ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')), weekdays: dias, academy_id: ctx.academiaId };
    try {
      try { await api('/turmas', { method: 'POST', body }); } catch (err) {
        if (!err.dados?.requer_confirmacao || !window.confirm(err.message)) throw err;
        await api('/turmas', { method: 'POST', body: { ...body, confirmar_conflito: true } });
      }
      limpar(); setDias([]);
      await recarregarTurmas();
    } catch (err) { setErro(err.message); }
  };
  const fazerMatricula = async () => {
    setErro('');
    try { await api(`/turmas/${turmaId}/matriculas`, { method: 'POST', body: { student_id: matricular } }); setMatricular(''); carregar(); await recarregarTurmas(); } catch (e) { setErro(e.message); }
  };
  const visiveis = chamada ? chamada.alunos.filter((s) => s.name.toLowerCase().includes(busca.toLowerCase())) : [];
  const presentes = chamada ? chamada.alunos.filter((s) => s.presente).length : 0;
  const mestres = (usuarios || []).filter((u) => ['mestre', 'autonomo'].includes(u.role) && u.is_active);
  const turmaAtual = (turmas || []).find((x) => x.id === turmaId);
  const naoMatriculados = (alunos || []).filter((s) => turmaAtual && s.inscricoes.some((i) => i.modality_id === turmaAtual.modality_id)
    && !(chamada?.alunos || []).some((c) => c.id === s.id));

  return (
    <>
      <div className="cartao">
        <h2>Chamada</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label>Turma
            <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
              <option value="">Escolha a turma</option>
              {(turmas || []).map((t) => <option key={t.id} value={t.id}>{t.name}{ctx.global && !ctx.academiaId ? ` (${t.academy_name})` : ''}</option>)}
            </select>
          </label>
          <label>Data<input type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} /></label>
          {chamada && <label>Buscar aluno<input value={busca} onChange={(e) => setBusca(e.target.value)} /></label>}
        </div>
        <Erro msg={erro || erroT} />
        {chamada && (
          <div className="rolagem" style={{ marginTop: 14 }}>
            <p className="suave"><Selo m={chamada.turma.modality_id} /> {presentes} de {chamada.alunos.length} presentes em {dataBR(chamada.data)}
              {!marca ? '. A marcação é feita pelo mestre da turma.' : ''}</p>
            <table>
              <thead><tr><th>Aluno</th><th>Faixa</th><th>Presença</th></tr></thead>
              <tbody>
                {visiveis.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td><td><Faixa nome={s.belt_name} cor={s.belt_color} /></td>
                    <td>
                      {marca
                        ? <button className={`btn pequeno ${s.presente ? '' : 'claro'}`} onClick={() => marcar(s)}>{s.presente ? 'Presente' : 'Marcar presença'}</button>
                        : (s.presente ? 'Presente' : '')}
                    </td>
                  </tr>
                ))}
                {!chamada.alunos.length && <tr><td colSpan={3} className="suave">Nenhum aluno matriculado nesta turma.</td></tr>}
              </tbody>
            </table>
            {gestao && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <label>Matricular aluno
                  <select value={matricular} onChange={(e) => setMatricular(e.target.value)}>
                    <option value="">Escolha</option>
                    {naoMatriculados.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <button className="btn claro" disabled={!matricular} onClick={fazerMatricula}>Matricular</button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="cartao rolagem">
        <h2>Turmas</h2>
        <table>
          <thead><tr><th>Turma</th><th>Modalidade</th><th>Mestre</th><th>Dias</th><th>Horário</th><th>Alunos</th></tr></thead>
          <tbody>
            {(turmas || []).map((t) => (
              <tr key={t.id}><td>{t.name}</td><td><Selo m={t.modality_id} /></td><td>{t.teacher_name}</td><td>{t.weekdays.map((d) => DIAS[d]).join(', ')}</td>
                <td>{t.start_time ? `${t.start_time.slice(0, 5)} às ${(t.end_time || '').slice(0, 5)}` : ''}</td>
                <td>{t.enrolled}{t.capacity ? ` de ${t.capacity}` : ''}</td></tr>
            ))}
            {turmas && !turmas.length && <tr><td colSpan={6} className="suave">Nenhuma turma.</td></tr>}
          </tbody>
        </table>
        {gestao && (
          <>
            <h2 style={{ marginTop: 18 }}>Nova turma</h2>
            {!ctx.academiaId ? <PedeAcademia /> : (
              <form onSubmit={criar}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <label>Nome<input {...campo('name')} required /></label>
                  <label>Modalidade<select {...campo('modality_id')}>{Object.entries(MODALIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                  <label>Mestre<select {...campo('teacher_id')}><option value="">Sem mestre</option>{mestres.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
                  <label>Início<input type="time" {...campo('start_time')} style={{ minWidth: 110 }} /></label>
                  <label>Fim<input type="time" {...campo('end_time')} style={{ minWidth: 110 }} /></label>
                  <label>Capacidade<input type="number" min={1} {...campo('capacity')} style={{ minWidth: 90, width: 100 }} /></label>
                </div>
                <div style={{ display: 'flex', gap: 12, margin: '12px 0', flexWrap: 'wrap' }}>
                  {DIAS.map((d, i) => (
                    <label key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, color: 'var(--texto)' }}>
                      <input type="checkbox" style={{ minWidth: 0 }} checked={dias.includes(i)}
                        onChange={(e) => setDias(e.target.checked ? [...dias, i].sort() : dias.filter((x) => x !== i))} />{d}
                    </label>
                  ))}
                </div>
                <button className="btn">Criar turma</button>
              </form>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ---------- Faixas e requisitos (RF-10) ----------
export function Faixas({ ctx }) {
  const [mod, setMod] = useState('judo');
  const [faixas, recarregar, erroL] = useDados(() => api('/faixas', { query: { modalidade: mod, academy_id: ctx.academiaId } }), [mod]);
  const [edit, setEdit] = useState({});
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const valor = (fx, k) => edit[fx.id]?.[k] ?? (fx[k] ?? '');
  const mudar = (fx, k, v) => setEdit({ ...edit, [fx.id]: { ...edit[fx.id], [k]: v } });
  const salvar = async (fx) => {
    setErro(''); setMsg('');
    try {
      await api(`/faixas/${fx.id}`, {
        method: 'PUT',
        body: {
          academy_id: ctx.academiaId,
          min_classes: valor(fx, 'min_classes'), min_months: valor(fx, 'min_months'),
          min_tech_pct: valor(fx, 'min_tech_pct'), min_age: valor(fx, 'min_age'),
        },
      });
      const { [fx.id]: _, ...resto } = edit; setEdit(resto);
      setMsg(`Requisitos da faixa ${fx.name} salvos. Valem para os ciclos em andamento; exames já lançados não mudam.`);
      await recarregar();
    } catch (e) { setErro(e.message); }
  };
  if (ctx.global && !ctx.academiaId) return <div className="cartao"><PedeAcademia /></div>;
  const num = (fx, k, w = 90) => (
    <input type="number" min={0} value={valor(fx, k)} onChange={(e) => mudar(fx, k, e.target.value)} style={{ minWidth: 0, width: w }} />
  );
  return (
    <div className="cartao rolagem">
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
        <label>Modalidade
          <select value={mod} onChange={(e) => { setMod(e.target.value); setEdit({}); }}>
            {Object.entries(MODALIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      <p className="suave">Requisitos para chegar a cada faixa. A idade mínima, se preenchida, só gera alerta.
        Os valores que vêm preenchidos são exemplos; ajuste para a sua academia.</p>
      <table>
        <thead><tr><th>Faixa</th><th>Presenças mín.</th><th>Meses na faixa anterior</th><th>Técnicas validadas (%)</th><th>Idade mín.</th><th /></tr></thead>
        <tbody>
          {(faixas || []).map((fx, i) => (
            <tr key={fx.id}>
              <td><Faixa nome={fx.name} cor={fx.color} />{fx.personalizada && <span className="suave"> · da academia</span>}</td>
              {i === 0 ? <td colSpan={5} className="suave">Faixa inicial</td> : (
                <>
                  <td>{num(fx, 'min_classes')}</td><td>{num(fx, 'min_months')}</td>
                  <td>{num(fx, 'min_tech_pct')}</td><td>{num(fx, 'min_age', 70)}</td>
                  <td><button className="btn pequeno" disabled={!edit[fx.id]} onClick={() => salvar(fx)}>Salvar</button></td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {msg && <div className="aviso-ok">{msg}</div>}
      <Erro msg={erro || erroL} />
    </div>
  );
}

// ---------- Avisos ----------
export function Avisos({ ctx }) {
  const [lista, recarregar, erroLista] = useDados(() => api('/avisos', { query: { academy_id: ctx.academiaId } }));
  const [f, campo, limpar] = useForm({ title: '', body: '' });
  const [erro, setErro] = useState('');
  const podeCriar = ['superadmin', 'admin', 'gestor', 'mestre'].includes(ctx.user.role);
  const criar = async (e) => {
    e.preventDefault();
    setErro('');
    try { await api('/avisos', { method: 'POST', body: { ...f, academy_id: ctx.academiaId } }); limpar(); await recarregar(); } catch (err) { setErro(err.message); }
  };
  return (
    <>
      {podeCriar && (
        <div className="cartao">
          <h2>Novo aviso</h2>
          {!ctx.academiaId ? <PedeAcademia /> : (
            <form className="linha" onSubmit={criar}>
              <label>Título<input {...campo('title')} required /></label>
              <label>Texto<textarea {...campo('body')} required /></label>
              <button className="btn">Publicar</button>
            </form>
          )}
          <Erro msg={erro} />
        </div>
      )}
      <Erro msg={erroLista} />
      {(lista || []).map((n) => (
        <div className="cartao" key={n.id}>
          <h2>{n.title}</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{n.body}</p>
          <div className="suave">{n.author_name} em {dataBR(n.created_at)}{n.class_name ? `, turma ${n.class_name}` : ''}{ctx.global ? `, ${n.academy_name}` : ''}</div>
        </div>
      ))}
      {lista && !lista.length && <p className="suave">Nenhum aviso.</p>}
    </>
  );
}

// ---------- Auditoria ----------
export function Auditoria() {
  const [log, , erro] = useDados(() => api('/auditoria'));
  return (
    <div className="cartao rolagem">
      <Erro msg={erro} />
      <table>
        <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Alvo</th></tr></thead>
        <tbody>
          {(log || []).map((l) => (
            <tr key={l.id}><td style={{ whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString('pt-BR')}</td><td>{l.actor_name}</td><td><code>{l.action}</code></td><td>{l.target}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
