import { useRef, useState } from 'react';
import { perfilService } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const PERFIL_LABELS = { admin: 'Administrador', professor: 'Professor', aluno: 'Aluno' };
const PERFIL_CORES  = { admin: '#00c9b1', professor: '#f59e0b', aluno: '#3b82f6' };

// Força validações de senha
function validarSenha(senha) {
  const erros = [];
  if (senha.length < 8)          erros.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(senha))      erros.push('Uma letra maiúscula');
  if (!/[0-9]/.test(senha))      erros.push('Um número');
  return erros;
}

export default function Perfil() {
  const { user, perfil, atualizarPerfil } = useAuth();
  const fileRef = useRef(null);

  const nomeAtual  = user?.user_metadata?.nome || user?.email?.split('@')[0] || '';
  const fotoAtual  = user?.user_metadata?.avatar_url || null;
  const emailAtual = user?.email || '';

  // ── estados ──
  const [nome, setNome]               = useState(nomeAtual);
  const [fotoPreview, setFotoPreview] = useState(fotoAtual);
  const [fotoFile, setFotoFile]       = useState(null);
  const [senhaAtual, setSenhaAtual]   = useState('');
  const [novaSenha, setNovaSenha]     = useState('');
  const [confirmSenha, setConfirm]    = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [salvandoDados, setSalvandoDados] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [removendoFoto, setRemovendoFoto] = useState(false);

  const [msgDados, setMsgDados]   = useState(null); // { tipo: 'ok'|'erro', texto }
  const [msgSenha, setMsgSenha]   = useState(null);
  const [msgFoto, setMsgFoto]     = useState(null);

  const inicial = (nome || nomeAtual)[0]?.toUpperCase() || '?';
  const corPerfil = PERFIL_CORES[perfil] || '#00c9b1';

  // ── foto ──
  const onSelecionarFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMsgFoto({ tipo: 'erro', texto: 'Imagem muito grande. Máximo: 2 MB.' });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMsgFoto({ tipo: 'erro', texto: 'Formato não suportado. Use JPG, PNG ou WebP.' });
      return;
    }
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
    setMsgFoto(null);
  };

  const salvarFoto = async () => {
    if (!fotoFile) return;
    setSalvandoDados(true); setMsgFoto(null);
    try {
      const url = await perfilService.uploadFoto(user.id, fotoFile);
      const updated = await perfilService.atualizarMetadata({ avatar_url: url });
      atualizarPerfil(updated);
      setFotoFile(null);
      setMsgFoto({ tipo: 'ok', texto: 'Foto atualizada com sucesso!' });
    } catch (e) {
      setMsgFoto({ tipo: 'erro', texto: e.message.includes('bucket') ? 'Bucket "avatars" não encontrado. Crie-o no Supabase Storage.' : e.message });
    } finally { setSalvandoDados(false); }
  };

  const removerFoto = async () => {
    if (!confirm('Remover foto de perfil?')) return;
    setRemovendoFoto(true); setMsgFoto(null);
    try {
      await perfilService.removerFoto(user.id);
      const updated = await perfilService.atualizarMetadata({ avatar_url: null });
      atualizarPerfil(updated);
      setFotoPreview(null);
      setFotoFile(null);
      setMsgFoto({ tipo: 'ok', texto: 'Foto removida.' });
    } catch (e) { setMsgFoto({ tipo: 'erro', texto: e.message }); }
    finally { setRemovendoFoto(false); }
  };

  // ── dados gerais ──
  const salvarDados = async () => {
    if (!nome.trim()) { setMsgDados({ tipo: 'erro', texto: 'O nome não pode ficar vazio.' }); return; }
    setSalvandoDados(true); setMsgDados(null);
    try {
      const updated = await perfilService.atualizarMetadata({ nome: nome.trim() });
      atualizarPerfil(updated);
      setMsgDados({ tipo: 'ok', texto: 'Dados atualizados com sucesso!' });
    } catch (e) { setMsgDados({ tipo: 'erro', texto: e.message }); }
    finally { setSalvandoDados(false); }
  };

  // ── senha ──
  const errosSenha = novaSenha ? validarSenha(novaSenha) : [];
  const senhaForte = novaSenha.length > 0 && errosSenha.length === 0;

  const salvarSenha = async () => {
    if (!novaSenha) { setMsgSenha({ tipo: 'erro', texto: 'Digite a nova senha.' }); return; }
    if (errosSenha.length) { setMsgSenha({ tipo: 'erro', texto: errosSenha.join(' · ') }); return; }
    if (novaSenha !== confirmSenha) { setMsgSenha({ tipo: 'erro', texto: 'As senhas não coincidem.' }); return; }
    setSalvandoSenha(true); setMsgSenha(null);
    try {
      await perfilService.alterarSenha(novaSenha);
      setSenhaAtual(''); setNovaSenha(''); setConfirm('');
      setMsgSenha({ tipo: 'ok', texto: 'Senha alterada com sucesso!' });
    } catch (e) { setMsgSenha({ tipo: 'erro', texto: e.message }); }
    finally { setSalvandoSenha(false); }
  };

  // Força da senha visual
  const forca = novaSenha.length === 0 ? 0
    : novaSenha.length < 6 ? 1
    : errosSenha.length === 2 ? 1
    : errosSenha.length === 1 ? 2
    : 3;
  const forcaLabel  = ['', 'Fraca', 'Média', 'Forte'];
  const forcaCor    = ['', '#f43f5e', '#f59e0b', '#10b981'];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Card: Identidade visual ── */}
      <div className="card">
        <div className="card-header">
          <h2>Foto de Perfil</h2>
        </div>
        <div className="card-body" style={{ display: 'flex', alignItems: 'flex-start', gap: 32, flexWrap: 'wrap' }}>

          {/* Avatar grande */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 110, height: 110, borderRadius: '50%',
              border: `3px solid ${corPerfil}`,
              overflow: 'hidden', background: corPerfil + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 42, fontWeight: 800, color: corPerfil,
              boxShadow: `0 0 0 6px ${corPerfil}18`
            }}>
              {fotoPreview
                ? <img src={fotoPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : inicial
              }
            </div>

            {/* Botão câmera */}
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                position: 'absolute', bottom: 4, right: 4,
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--navy)', border: '2px solid white',
                cursor: 'pointer', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
              }}
              title="Trocar foto"
            >📷</button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onSelecionarFoto} />
          </div>

          {/* Info + ações */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>
              {nomeAtual}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
              <span style={{
                padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                background: corPerfil + '22', color: corPerfil
              }}>
                {PERFIL_LABELS[perfil] || perfil}
              </span>
              <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>{emailAtual}</span>
            </div>

            {msgFoto && (
              <div className={`alert alert-${msgFoto.tipo === 'ok' ? 'success' : 'error'}`} style={{ marginBottom: 14, fontSize: 13 }}>
                {msgFoto.tipo === 'ok' ? '✓' : '⚠️'} {msgFoto.texto}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
                📷 Escolher foto
              </button>
              {fotoFile && (
                <button className="btn btn-primary btn-sm" onClick={salvarFoto} disabled={salvandoDados}>
                  {salvandoDados ? 'Enviando...' : '✓ Salvar foto'}
                </button>
              )}
              {fotoPreview && !fotoFile && (
                <button className="btn btn-ghost btn-sm" onClick={removerFoto} disabled={removendoFoto} style={{ color: '#f43f5e' }}>
                  {removendoFoto ? 'Removendo...' : '🗑️ Remover foto'}
                </button>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 8 }}>
              JPG, PNG ou WebP · máximo 2 MB
            </div>
          </div>
        </div>
      </div>

      {/* ── Card: Dados gerais ── */}
      <div className="card">
        <div className="card-header">
          <h2>Dados Pessoais</h2>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {msgDados && (
            <div className={`alert alert-${msgDados.tipo === 'ok' ? 'success' : 'error'}`} style={{ fontSize: 13 }}>
              {msgDados.tipo === 'ok' ? '✓' : '⚠️'} {msgDados.texto}
            </div>
          )}

          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label className="form-label">Nome completo</label>
              <input
                className="form-input"
                value={nome}
                onChange={e => { setNome(e.target.value); setMsgDados(null); }}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                className="form-input"
                value={emailAtual}
                disabled
                style={{ background: 'var(--gray-50)', color: 'var(--gray-400)', cursor: 'not-allowed' }}
              />
              <span style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 3 }}>
                O e-mail não pode ser alterado
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Perfil de acesso</label>
              <input
                className="form-input"
                value={PERFIL_LABELS[perfil] || perfil}
                disabled
                style={{ background: 'var(--gray-50)', color: 'var(--gray-400)', cursor: 'not-allowed' }}
              />
              <span style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 3 }}>
                Definido pelo administrador
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Membro desde</label>
              <input
                className="form-input"
                value={user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                disabled
                style={{ background: 'var(--gray-50)', color: 'var(--gray-400)', cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              onClick={salvarDados}
              disabled={salvandoDados || nome.trim() === nomeAtual}
            >
              {salvandoDados ? 'Salvando...' : '✓ Salvar dados'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Card: Senha ── */}
      <div className="card">
        <div className="card-header">
          <h2>Alterar Senha</h2>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {msgSenha && (
            <div className={`alert alert-${msgSenha.tipo === 'ok' ? 'success' : 'error'}`} style={{ fontSize: 13 }}>
              {msgSenha.tipo === 'ok' ? '✓' : '⚠️'} {msgSenha.texto}
            </div>
          )}

          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>

            <div className="form-group full" style={{ position: 'relative' }}>
              <label className="form-label">Nova senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={e => { setNovaSenha(e.target.value); setMsgSenha(null); }}
                  placeholder="Digite a nova senha"
                  style={{ paddingRight: 44 }}
                />
                <button
                  onClick={() => setMostrarSenha(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--gray-400)'
                  }}
                >
                  {mostrarSenha ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Força da senha */}
              {novaSenha.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3].map(n => (
                      <div key={n} style={{
                        height: 4, flex: 1, borderRadius: 99,
                        background: forca >= n ? forcaCor[forca] : 'var(--gray-200)',
                        transition: 'background 0.3s'
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: forcaCor[forca], fontWeight: 600 }}>
                    {forcaLabel[forca]}
                  </div>
                </div>
              )}
            </div>

            <div className="form-group full">
              <label className="form-label">Confirmar nova senha</label>
              <input
                className="form-input"
                type={mostrarSenha ? 'text' : 'password'}
                value={confirmSenha}
                onChange={e => { setConfirm(e.target.value); setMsgSenha(null); }}
                placeholder="Repita a nova senha"
                style={{
                  borderColor: confirmSenha && novaSenha && confirmSenha !== novaSenha
                    ? '#f43f5e' : confirmSenha && confirmSenha === novaSenha
                    ? '#10b981' : undefined
                }}
              />
              {confirmSenha && novaSenha && (
                <span style={{ fontSize: 12, marginTop: 3, color: confirmSenha === novaSenha ? '#10b981' : '#f43f5e', fontWeight: 600 }}>
                  {confirmSenha === novaSenha ? '✓ Senhas iguais' : '✗ Senhas diferentes'}
                </span>
              )}
            </div>
          </div>

          {/* Requisitos */}
          <div style={{
            padding: '12px 16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--gray-50)', border: '1px solid var(--gray-200)'
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Requisitos da senha
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { ok: novaSenha.length >= 8,       texto: 'Mínimo 8 caracteres' },
                { ok: /[A-Z]/.test(novaSenha),     texto: 'Uma letra maiúscula' },
                { ok: /[0-9]/.test(novaSenha),     texto: 'Um número' },
              ].map((req, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: novaSenha.length === 0 ? 'var(--gray-300)' : req.ok ? '#10b981' : '#f43f5e', fontSize: 14 }}>
                    {novaSenha.length === 0 ? '○' : req.ok ? '✓' : '✗'}
                  </span>
                  <span style={{ color: novaSenha.length === 0 ? 'var(--gray-400)' : req.ok ? 'var(--gray-600)' : 'var(--gray-400)' }}>
                    {req.texto}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              onClick={salvarSenha}
              disabled={salvandoSenha || !senhaForte || novaSenha !== confirmSenha}
            >
              {salvandoSenha ? 'Alterando...' : '🔒 Alterar senha'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Card: Sessão / Conta ── */}
      <div className="card" style={{ borderColor: 'var(--gray-100)' }}>
        <div className="card-header">
          <h2>Informações da Conta</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'ID do usuário', valor: user?.id?.slice(0, 18) + '…', mono: true },
              { label: 'Último login', valor: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('pt-BR') : '—' },
              { label: 'Provedor', valor: user?.app_metadata?.provider || 'email' },
              { label: 'Status', valor: '🟢 Ativo' },
            ].map(item => (
              <div key={item.label} style={{
                padding: '12px 16px', background: 'var(--gray-50)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-100)'
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 14, color: 'var(--gray-700)', fontFamily: item.mono ? 'monospace' : undefined }}>
                  {item.valor}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
