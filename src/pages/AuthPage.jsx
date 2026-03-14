import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

function AnimatedLines() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const lines = [];
    const TEAL = '43,223,204', WHITE = '255,255,255';
    const spawn = () => {
      const W = canvas.width, H = canvas.height;
      const angle = Math.random() * Math.PI * 2;
      lines.push({
        x: Math.random() * W, y: Math.random() * H,
        dx: Math.cos(angle), dy: Math.sin(angle),
        len: 60 + Math.random() * 180, drawn: 0,
        speed: 0.8 + Math.random() * 1.4,
        color: Math.random() > 0.55 ? TEAL : WHITE,
        alpha: 0, fadeIn: true,
        maxAlpha: 0.12 + Math.random() * 0.22,
        width: 0.5 + Math.random() * 1.0, done: false,
      });
    };
    for (let i = 0; i < 18; i++) spawn();
    let frame = 0;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (frame % 28 === 0) spawn();
      frame++;
      for (let i = lines.length - 1; i >= 0; i--) {
        const l = lines[i];
        if (l.fadeIn) { l.alpha += 0.04; if (l.alpha >= l.maxAlpha) { l.alpha = l.maxAlpha; l.fadeIn = false; } }
        if (!l.done) { l.drawn = Math.min(l.drawn + l.speed, l.len); if (l.drawn >= l.len) l.done = true; }
        else { l.alpha -= 0.018; if (l.alpha <= 0) { lines.splice(i, 1); continue; } }
        ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + l.dx * l.drawn, l.y + l.dy * l.drawn);
        ctx.strokeStyle = `rgba(${l.color},${l.alpha})`; ctx.lineWidth = l.width; ctx.lineCap = 'round'; ctx.stroke();
        ctx.beginPath(); ctx.arc(l.x, l.y, l.width * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${l.color},${l.alpha * 0.7})`; ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }} />;
}

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [tick, setTick]       = useState(0);
  const { login }             = useAuth();
  const [form, setForm]       = useState({ email: '', password: '' });

  useEffect(() => { const t = setInterval(() => setTick(v => v+1), 1000); return () => clearInterval(t); }, []);
  const now  = new Date();
  const hora = now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
  const dia  = now.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' });

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    setErro('');
    if (!form.email || !form.password) { setErro('Preencha e-mail e senha.'); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (e) {
      const msgs = { 'Invalid login credentials': 'E-mail ou senha incorretos.' };
      setErro(msgs[e.message] || 'Erro ao entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        .ap-root { min-height:100vh; display:grid; grid-template-columns:1fr 1fr; font-family:'Outfit',sans-serif; }

        .ap-left {
          background:#0e1117; position:relative; overflow:hidden;
          display:flex; flex-direction:column; justify-content:space-between; padding:52px 56px;
        }
        .ap-left::before {
          content:''; position:absolute; inset:0;
          background-image: linear-gradient(rgba(255,255,255,0.028) 1px,transparent 1px), linear-gradient(90deg,rgba(255,255,255,0.028) 1px,transparent 1px);
          background-size:52px 52px; pointer-events:none;
        }

        .ap-logo-row { display:flex; align-items:center; gap:14px; position:relative; z-index:1; animation:fadeDown 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .ap-logo-box { width:46px; height:46px; border:1.5px solid #2bdfcc; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:22px; position:relative; }
        .ap-logo-box::after { content:''; position:absolute; top:-4px; right:-4px; width:8px; height:8px; background:#2bdfcc; border-radius:50%; box-shadow:0 0 8px #2bdfcc; }
        .ap-logo-name-small { font-size:15px; font-weight:600; color:rgba(255,255,255,0.7); letter-spacing:0.3px; }
        .ap-logo-sub { font-size:10px; color:rgba(255,255,255,0.22); text-transform:uppercase; letter-spacing:2px; margin-top:2px; }

        .ap-center { position:relative; z-index:1; animation:fadeUp 0.8s 0.1s cubic-bezier(0.16,1,0.3,1) both; }
        .ap-eyebrow { font-size:10px; color:#2bdfcc; text-transform:uppercase; letter-spacing:3px; font-weight:600; display:flex; align-items:center; gap:10px; margin-bottom:24px; }
        .ap-eyebrow::before { content:''; display:block; width:24px; height:1px; background:#2bdfcc; }

        .ap-big-logo { font-family:'DM Serif Display',serif; font-size:clamp(80px,10vw,120px); line-height:1; color:#f0ede6; letter-spacing:-4px; margin-bottom:8px; }
        .ap-big-logo span { color:#2bdfcc; font-style:italic; }

        .ap-slogan { font-size:18px; color:rgba(255,255,255,0.38); font-weight:300; letter-spacing:0.3px; line-height:1.6; margin-top:22px; border-left:2px solid rgba(43,223,204,0.35); padding-left:16px; }

        .ap-clock { position:relative; z-index:1; animation:fadeUp 0.6s 0.2s cubic-bezier(0.16,1,0.3,1) both; }
        .ap-clock-time { font-family:'DM Serif Display',serif; font-size:13px; color:rgba(255,255,255,0.2); letter-spacing:1px; }
        .ap-clock-date { font-size:11px; color:rgba(255,255,255,0.12); text-transform:capitalize; margin-top:3px; }

        .ap-right {
          background:#fff; display:flex; align-items:center; justify-content:center;
          padding:52px 72px; position:relative; animation:fadeLeft 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both;
        }
        .ap-right::before { content:''; position:absolute; top:0; left:10%; right:10%; height:3px; background:linear-gradient(90deg,transparent,#2bdfcc,transparent); border-radius:0 0 4px 4px; }

        .ap-form-wrap { width:100%; max-width:440px; }

        .ap-form-title { font-family:'DM Serif Display',serif; font-size:38px; color:#0e1117; letter-spacing:-0.5px; margin-bottom:8px; }
        .ap-form-sub { font-size:16px; color:#9ca3af; font-weight:300; margin-bottom:40px; }

        .ap-field { margin-bottom:20px; }
        .ap-field-label { display:block; font-size:11px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:8px; }

        .ap-input { width:100%; padding:14px 16px; background:#f9fafb; border:1.5px solid #e5e7eb; border-radius:10px; font-size:16px; font-family:'Outfit',sans-serif; color:#111; outline:none; transition:all 0.2s; }
        .ap-input::placeholder { color:#c9cdd4; }
        .ap-input:focus { background:#fff; border-color:#2bdfcc; box-shadow:0 0 0 3px rgba(43,223,204,0.1); }

        .ap-pw-wrap { position:relative; }
        .ap-pw-wrap .ap-input { padding-right:48px; }
        .ap-pw-toggle { position:absolute; right:14px; top:50%; transform:translateY(-50%); background:none; border:none; color:#c0c0c0; cursor:pointer; font-size:16px; padding:4px; transition:color 0.15s; }
        .ap-pw-toggle:hover { color:#555; }

        .ap-err { padding:12px 16px; background:#fff5f5; border:1.5px solid #fecaca; border-left:3px solid #ef4444; border-radius:10px; font-size:14px; color:#dc2626; margin-bottom:20px; }

        .ap-submit { width:100%; margin-top:8px; padding:16px 20px; background:#0e1117; border:none; border-radius:10px; font-family:'Outfit',sans-serif; font-size:16px; font-weight:600; color:#fff; cursor:pointer; transition:all 0.2s cubic-bezier(0.16,1,0.3,1); display:flex; align-items:center; justify-content:center; gap:8px; }
        .ap-submit:hover:not(:disabled) { background:#1e2635; transform:translateY(-1px); box-shadow:0 6px 20px rgba(14,17,23,0.18); }
        .ap-submit:disabled { opacity:0.5; cursor:not-allowed; }
        .ap-submit-arrow { transition:transform 0.2s; }
        .ap-submit:hover .ap-submit-arrow { transform:translateX(3px); }

        .ap-spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.25); border-top-color:#fff; border-radius:50%; animation:spin 0.6s linear infinite; }

        .ap-info { margin-top:28px; padding:14px 16px; background:#f0fdfb; border:1px solid #99f0e8; border-radius:10px; font-size:13px; color:#0f766e; line-height:1.6; }
        .ap-info strong { font-weight:600; display:block; margin-bottom:2px; }

        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeDown { from { opacity:0; transform:translateY(-14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(20px);  } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeLeft { from { opacity:0; transform:translateX(20px);  } to { opacity:1; transform:translateX(0); } }

        @media (max-width:768px) {
          .ap-root { grid-template-columns:1fr; }
          .ap-left { min-height:220px; padding:36px 28px; }
          .ap-big-logo { font-size:56px; }
          .ap-right { padding:40px 28px; }
        }
      `}</style>

      <div className="ap-root">
        <div className="ap-left">
          <AnimatedLines />
          <div className="ap-logo-row">
            <div className="ap-logo-box">🎓</div>
            <div>
              <div className="ap-logo-name-small">EduGest</div>
              <div className="ap-logo-sub">Sistema de Gestão Escolar</div>
            </div>
          </div>
          <div className="ap-center">
            <div className="ap-eyebrow">Plataforma educacional</div>
            <div className="ap-big-logo">Edu<span>Gest</span></div>
            <div className="ap-slogan">Onde o conhecimento<br />encontra gestão inteligente.</div>
          </div>
          <div className="ap-clock">
            <div className="ap-clock-time">{hora}</div>
            <div className="ap-clock-date">{dia}</div>
          </div>
        </div>

        <div className="ap-right">
          <div className="ap-form-wrap">
            <div className="ap-form-title">Bem-vindo de volta.</div>
            <div className="ap-form-sub">Entre com suas credenciais para acessar o sistema.</div>

            {erro && <div className="ap-err">⚠ {erro}</div>}

            <div className="ap-field">
              <label className="ap-field-label">E-mail</label>
              <input className="ap-input" name="email" type="email"
                value={form.email} onChange={handleChange}
                placeholder="seu@email.com" autoComplete="email"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>

            <div className="ap-field">
              <label className="ap-field-label">Senha</label>
              <div className="ap-pw-wrap">
                <input className="ap-input" name="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password} onChange={handleChange}
                  placeholder="••••••••" autoComplete="current-password"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                <button className="ap-pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button className="ap-submit" onClick={handleSubmit} disabled={loading}>
              {loading
                ? <><span className="ap-spinner" /> Aguarde...</>
                : <>Acessar sistema <span className="ap-submit-arrow">→</span></>
              }
            </button>

            <div className="ap-info">
              <strong>Acesso restrito</strong>
              Apenas usuários cadastrados pelo administrador podem acessar o sistema.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
