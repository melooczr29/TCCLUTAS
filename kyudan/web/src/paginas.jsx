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
  const perfis = { superadmin: ['admin', 'gestor', 'mestre', 'autonomo', 'aluno'], admin: ['gestor', 'mestre', 'autonomo', 'aluno'], gestor: ['mestre', 'aluno'] }[user.role];
  const [f, campo, limpar] = useForm({ name: '', email: '', password: '', role: perfis[0], academy_id: '' });
  const [erro, setErro] = useState('');

  // Mesma regra da API (rules/acessos.js). A API e quem decide de fato.
  const podeGerenciar = (u) =>
    u.role !== 'superadmin' && u.id !== user.id &&
    (user.role === 'superadmin' || (user.role === 'admin' && u.role !== 'admin') ||
      (user.role === 'gestor' && ['mestre', 'aluno'].includes(u.role)));

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
export function Alunos({ ctx }) {
  const [aberto, setAberto] = useState(null);
  const [lista, recarregar, erroLista] = useDados(() => api('/alunos', { query: { academy_id: ctx.academiaId } }));
  const [turmas] = useDados(() => api('/turmas', { query: { academy_id: ctx.academiaId } }));
  const [f, campo, limpar] = useForm({ name: '', birth_date: '', modality_id: 'judo', class_id: '', email: '', password: '' });
  const [erro, setErro] = useState('');
  const podeCriar = ['superadmin', 'admin', 'gestor', 'mestre'].includes(ctx.user.role);

  if (aberto) return <FichaAluno id={aberto} ctx={ctx} voltar={() => { setAberto(null); recarregar(); }} />;

  const criar = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
      await api('/alunos', { method: 'POST', body: { ...body, academy_id: ctx.academiaId } });
      limpar();
      await recarregar();
    } catch (err) { setErro(err.message); }
  };

  return (
    <>
      {podeCriar && (
        <div className="cartao">
          <h2>Novo aluno</h2>
          {!ctx.academiaId ? <PedeAcademia /> : (
            <form className="linha" onSubmit={criar}>
              <label>Nome<input {...campo('name')} required /></label>
              <label>Nascimento<input type="date" {...campo('birth_date')} /></label>
              <label>Modalidade
                <select {...campo('modality_id')}><option value="judo">Judô</option><option value="bjj">Jiu-Jitsu</option></select>
              </label>
              <label>Turma
                <select {...campo('class_id')}><option value="">Sem turma</option>{(turmas || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              </label>
              <label>E-mail de acesso (opcional)<input type="email" {...campo('email')} /></label>
              <label>Senha (opcional)<input type="password" minLength={8} {...campo('password')} /></label>
              <button className="btn">Cadastrar</button>
            </form>
          )}
          <Erro msg={erro} />
        </div>
      )}
      <div className="cartao rolagem">
        <Erro msg={erroLista} />
        <table>
          <thead><tr><th>Aluno</th><th>Modalidade</th><th>Faixa</th>{ctx.global && <th>Academia</th>}</tr></thead>
          <tbody>
            {(lista || []).map((s) => (
              <tr key={s.id} className="clicavel" onClick={() => setAberto(s.id)}>
                <td>{s.name}</td><td>{s.modality_id === 'bjj' ? 'Jiu-Jitsu' : 'Judô'}</td>
                <td><Faixa nome={s.belt_name} cor={s.belt_color} /></td>{ctx.global && <td>{s.academy_name}</td>}
              </tr>
            ))}
            {lista && !lista.length && <tr><td colSpan={4} className="suave">Nenhum aluno cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

const STATUS_TECNICA = { bloqueada: 'Bloqueada', apresentada: 'Apresentada', 'em-treino': 'Em treino', validada: 'Validada' };

// Ficha: trilha de graduacao, aptidao, habilidades e exame.
export function FichaAluno({ id, ctx, voltar }) {
  const [t, recarregarTrilha, erroT] = useDados(() => api(`/alunos/${id}/trilha`), [id]);
  const [hab, recarregarHab] = useDados(() => api(`/alunos/${id}/habilidades`), [id]);
  const [erro, setErro] = useState('');
  const professor = ['superadmin', 'admin', 'mestre', 'autonomo'].includes(ctx.user.role);
  if (!t) return <Erro msg={erroT} />;
  const a = t.aptidao;

  const mudarTecnica = async (tec, status) => {
    setErro('');
    try { await api(`/alunos/${id}/habilidades/${tec.id}`, { method: 'PUT', body: { status } }); await recarregarHab(); await recarregarTrilha(); } catch (e) { setErro(e.message); }
  };
  const exame = async (result) => {
    const aviso = result === 'aprovado' && !a.sugestao_apto ? '\n\nAtenção: o indicador de aptidão ainda não foi atingido. A decisão é sua.' : '';
    if (!window.confirm(`Lançar exame para a faixa ${a.proxima_faixa.name} como ${result}?${aviso}`)) return;
    setErro('');
    try { await api(`/alunos/${id}/graduacoes`, { method: 'POST', body: { result } }); await recarregarTrilha(); await recarregarHab(); } catch (e) { setErro(e.message); }
  };

  return (
    <>
      {voltar && <p><button className="btn claro pequeno" onClick={voltar}>Voltar à lista</button></p>}
      <div className="cartao">
        <h2>{t.aluno.name}</h2>
        <div className="trilha">
          {t.faixas.map((f) => <div key={f.id} className={`passo ${f.situacao}`}><Faixa nome={f.name} cor={f.color} /></div>)}
        </div>
        {a.proxima_faixa ? (
          <div className="duas">
            <div>
              <div className="suave">Frequência para a faixa {a.proxima_faixa.name}</div>
              <div className="barra"><div style={{ width: `${a.percentual_frequencia}%` }} /></div>
              <div>{a.presencas} de {a.presencas_exigidas} aulas{a.contagem_desde ? ` desde ${dataBR(a.contagem_desde)}` : ''}</div>
            </div>
            <div>
              <div className="suave">Técnicas validadas</div>
              <div className="barra"><div style={{ width: `${a.tecnicas_exigidas ? (a.tecnicas_validadas / a.tecnicas_exigidas) * 100 : 100}%` }} /></div>
              <div>{a.tecnicas_validadas} de {a.tecnicas_exigidas}</div>
            </div>
          </div>
        ) : <p>Última faixa da modalidade.</p>}
        {a.proxima_faixa && (
          <p style={{ marginTop: 14 }}>
            <span className="etiqueta">{a.sugestao_apto ? 'Indicador: apto ao exame' : 'Indicador: ainda em preparação'}</span>{' '}
            <span className="suave">{a.observacao}</span>
          </p>
        )}
        {professor && a.proxima_faixa && (
          <p>
            <button className="btn" onClick={() => exame('aprovado')}>Lançar exame: aprovado</button>{' '}
            <button className="btn claro" onClick={() => exame('reprovado')}>Lançar exame: reprovado</button>
          </p>
        )}
        <Erro msg={erro} />
      </div>

      <div className="cartao rolagem">
        <h2>Árvore de habilidades</h2>
        <table>
          <thead><tr><th>Técnica</th><th>Categoria</th><th>Exigida para</th><th>Situação</th></tr></thead>
          <tbody>
            {(hab || []).map((h) => (
              <tr key={h.id}>
                <td>{h.name}</td><td>{h.category}</td><td>{h.belt_name}</td>
                <td>
                  {professor ? (
                    <select value={h.status} onChange={(e) => mudarTecnica(h, e.target.value)}>
                      {Object.entries(STATUS_TECNICA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  ) : STATUS_TECNICA[h.status]}
                </td>
              </tr>
            ))}
            {hab && !hab.length && <tr><td colSpan={4} className="suave">Nenhuma técnica cadastrada para esta modalidade.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="cartao rolagem">
        <h2>Histórico de exames</h2>
        {t.historico.length ? (
          <table>
            <thead><tr><th>Data</th><th>Faixa</th><th>Resultado</th><th>Aulas no ciclo</th><th>Examinador</th></tr></thead>
            <tbody>
              {t.historico.map((g) => (
                <tr key={g.id}><td>{dataBR(g.exam_date)}</td><td>{g.to_belt_name}</td><td>{g.result}</td><td>{g.classes_attended} de {g.classes_required}</td><td>{g.examiner_name}</td></tr>
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
  return (
    <>
      <FichaAluno id={eu.id} ctx={ctx} />
      <div className="cartao">
        <h2>Código de presença</h2>
        <p className="suave">Informe este código ao mestre para registrar a presença.</p>
        <code>{eu.qr_token}</code>
      </div>
    </>
  );
}

// ---------- Turmas e chamada ----------
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export function Chamada({ ctx }) {
  const [turmas, recarregarTurmas, erroT] = useDados(() => api('/turmas', { query: { academy_id: ctx.academiaId } }));
  const [turmaId, setTurmaId] = useState('');
  const [data, setData] = useState(hojeISO());
  const [chamada, setChamada] = useState(null);
  const [erro, setErro] = useState('');
  const [f, campo, limpar] = useForm({ name: '', modality_id: 'judo', start_time: '', end_time: '' });
  const podeCriar = ['superadmin', 'admin', 'gestor'].includes(ctx.user.role);

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
    try {
      const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
      await api('/turmas', { method: 'POST', body: { ...body, academy_id: ctx.academiaId } });
      limpar();
      await recarregarTurmas();
    } catch (err) { setErro(err.message); }
  };
  const presentes = chamada ? chamada.alunos.filter((s) => s.presente).length : 0;

  return (
    <>
      <div className="cartao">
        <h2>Chamada</h2>
        <div className="linha" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label>Turma
            <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
              <option value="">Escolha a turma</option>
              {(turmas || []).map((t) => <option key={t.id} value={t.id}>{t.name}{ctx.global && !ctx.academiaId ? ` (${t.academy_name})` : ''}</option>)}
            </select>
          </label>
          <label>Data<input type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} /></label>
        </div>
        <Erro msg={erro || erroT} />
        {chamada && (
          <div className="rolagem" style={{ marginTop: 14 }}>
            <p className="suave">{presentes} de {chamada.alunos.length} presentes em {dataBR(chamada.data)}</p>
            <table>
              <thead><tr><th>Aluno</th><th>Faixa</th><th>Presença</th></tr></thead>
              <tbody>
                {chamada.alunos.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td><td><Faixa nome={s.belt_name} cor={s.belt_color} /></td>
                    <td><button className={`btn pequeno ${s.presente ? '' : 'claro'}`} onClick={() => marcar(s)}>{s.presente ? 'Presente' : 'Marcar presença'}</button></td>
                  </tr>
                ))}
                {!chamada.alunos.length && <tr><td colSpan={3} className="suave">Nenhum aluno matriculado nesta turma.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="cartao rolagem">
        <h2>Turmas</h2>
        <table>
          <thead><tr><th>Turma</th><th>Professor</th><th>Dias</th><th>Horário</th><th>Alunos</th></tr></thead>
          <tbody>
            {(turmas || []).map((t) => (
              <tr key={t.id}><td>{t.name}</td><td>{t.teacher_name}</td><td>{t.weekdays.map((d) => DIAS[d]).join(', ')}</td>
                <td>{t.start_time ? `${t.start_time.slice(0, 5)} às ${(t.end_time || '').slice(0, 5)}` : ''}</td><td>{t.enrolled}</td></tr>
            ))}
          </tbody>
        </table>
        {podeCriar && (
          <>
            <h2 style={{ marginTop: 18 }}>Nova turma</h2>
            {!ctx.academiaId ? <PedeAcademia /> : (
              <form className="linha" onSubmit={criar}>
                <label>Nome<input {...campo('name')} required /></label>
                <label>Modalidade<select {...campo('modality_id')}><option value="judo">Judô</option><option value="bjj">Jiu-Jitsu</option></select></label>
                <label>Início<input type="time" {...campo('start_time')} style={{ minWidth: 110 }} /></label>
                <label>Fim<input type="time" {...campo('end_time')} style={{ minWidth: 110 }} /></label>
                <button className="btn">Criar turma</button>
              </form>
            )}
          </>
        )}
      </div>
    </>
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
