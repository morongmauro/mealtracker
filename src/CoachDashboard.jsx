import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LogOut, Search, ArrowLeft, Save, Users, Activity, AlertTriangle, TrendingUp,
  Calendar, Droplet, Edit2, Check, X, Link2, Link2Off, ChevronRight
} from 'lucide-react';

// ─── Paleta (sincronizada con MealTracker) ────────────────────────────────
const ACCENT = '#8A9558';
const ACCENT_DARK = '#5F6B3B';
const ACCENT_PASTEL = '#E8EBD7';
const TEXT = '#1F1F1F';
const TEXT_MUTED = '#6B6B6B';
const TEXT_LIGHT = '#9B9B9B';
const BG = '#F5F2E8';
const SURFACE = '#FFFFFF';
const SURFACE_2 = '#F1EEDF';
const BORDER = '#E2DECC';
const BORDER_SOFT = '#EDEADC';
const C_PROTEIN = '#D77A61';
const C_CARBS = '#D4B581';
const C_FAT = '#6B7A8F';
const SUCCESS = '#7A8450';
const WARN = '#D49C61';
const DANGER = '#C75A4A';
const FONT_UI = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";

const TOKEN_KEY = 'coachToken';
const TOKEN_EXP_KEY = 'coachTokenExp';

// ─── Helpers ──────────────────────────────────────────────────────────────
const fmt0 = (n) => Math.round(Number(n) || 0).toLocaleString('es');
const fmt1 = (n) => (Math.round((Number(n) || 0) * 10) / 10).toString();
const normalize = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const daysAgoStr = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const ms = Date.now() - d.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
  return `hace ${Math.floor(days / 30)} mes`;
};
const statusColor = (s) => s === 'active' ? SUCCESS : s === 'recent' ? ACCENT : s === 'at_risk' ? WARN : DANGER;
const statusLabel = (s) => s === 'active' ? 'Al día' : s === 'recent' ? 'Reciente' : s === 'at_risk' ? 'En riesgo' : 'Inactivo';

// Convierte "2025-05-28" → "Jueves, 28 de mayo"
const formatLongDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const s = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// ─── Componente raíz ──────────────────────────────────────────────────────
export default function CoachDashboard() {
  const [token, setToken] = useState(() => {
    try {
      const t = localStorage.getItem(TOKEN_KEY);
      const e = parseInt(localStorage.getItem(TOKEN_EXP_KEY) || '0', 10);
      if (t && e > Date.now()) return t;
    } catch (e) {}
    return null;
  });

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXP_KEY);
    } catch (e) {}
    setToken(null);
    // Limpia el path a /coach
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', '/coach');
    }
  }, []);

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: FONT_UI, color: TEXT }}>
      <style>{`
        body { background: ${BG}; margin: 0; }
        button { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
      `}</style>
      {!token ? <LoginView onLogin={setToken} /> : <Authenticated token={token} onLogout={logout} />}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────
function LoginView({ onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e?.preventDefault();
    if (!password) return;
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/coach-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await r.json();
      if (!r.ok) {
        setError(json.error === 'invalid password' ? 'Contraseña incorrecta.' : (json.error || 'Error inesperado.'));
        setLoading(false);
        return;
      }
      try {
        localStorage.setItem(TOKEN_KEY, json.token);
        localStorage.setItem(TOKEN_EXP_KEY, String(json.expiresAt));
      } catch (e) {}
      onLogin(json.token);
    } catch (e) {
      setError('No pudo conectar con el servidor.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm p-8 rounded-3xl"
        style={{ background: SURFACE, border: `1px solid ${BORDER}`, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <div className="text-[11px] tracking-[0.22em] uppercase font-semibold mb-2" style={{ color: ACCENT }}>Coach</div>
        <div className="text-[22px] font-bold mb-2" style={{ color: TEXT, letterSpacing: '-0.01em' }}>
          Panel privado
        </div>
        <div className="text-[13px] mb-6" style={{ color: TEXT_MUTED }}>
          Solo para Mauro. Ingresa tu contraseña.
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="w-full bg-white text-sm font-medium px-4 py-3 rounded-xl border outline-none mb-3"
          style={{ color: TEXT, borderColor: BORDER }}
        />
        {error && (
          <div className="text-[12px] mb-3 px-3 py-2 rounded-lg" style={{ background: '#FCE9E5', color: DANGER }}>
            {error}
          </div>
        )}
        <button type="submit" disabled={loading || !password}
          className="w-full py-3 rounded-full text-sm font-semibold transition active:scale-[0.98]"
          style={{ background: loading || !password ? SURFACE_2 : ACCENT, color: loading || !password ? TEXT_LIGHT : '#fff' }}>
          {loading ? 'Verificando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

// ─── AUTENTICADO: ruta entre lista y detalle ─────────────────────────────
function Authenticated({ token, onLogout }) {
  // Mantenemos en el state SOLO el pathname (sin query). La query (?siblings=...)
  // se lee directamente de window.location.search en el render. Antes guardaba
  // path con query y la regex de detalle no matcheaba, así que el click no
  // entraba al detalle si había siblings.
  const [path, setPath] = useState(() => (typeof window !== 'undefined' ? window.location.pathname : '/coach'));
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = useCallback((fullUrl) => {
    // fullUrl puede traer ?siblings=...; lo respetamos en el history para que
    // se pueda compartir el link, pero solo guardamos pathname en el state.
    window.history.pushState({}, '', fullUrl);
    const pathOnly = fullUrl.split('?')[0];
    setPath(pathOnly);
  }, []);

  // Manejo común de respuesta de API
  const apiFetch = useCallback(async (url, options = {}) => {
    const r = await fetch(url, {
      ...options,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    if (r.status === 401) {
      onLogout();
      throw new Error('unauthorized');
    }
    return r;
  }, [token, onLogout]);

  // Path es /coach/<primary_id>. Los siblings vienen aparte por window.location.search.
  const detailMatch = path.match(/^\/coach\/([0-9a-f-]+)$/i);
  if (detailMatch) {
    let siblings = [];
    try {
      const qs = new URLSearchParams(window.location.search);
      const raw = qs.get('siblings') || '';
      siblings = raw.split(',').map(s => s.trim()).filter(s => /^[0-9a-f-]+$/i.test(s));
    } catch (e) {}
    return <DetailView userId={detailMatch[1]} siblings={siblings} apiFetch={apiFetch} onBack={() => navigate('/coach')} onLogout={onLogout} />;
  }
  return <ListView apiFetch={apiFetch} onSelectClient={(primary, siblings) => {
    const path = `/coach/${primary}`;
    const url = siblings && siblings.length > 0 ? `${path}?siblings=${siblings.join(',')}` : path;
    navigate(url);
  }} onLogout={onLogout} />;
}

// ─── Agrupación de clientes por nombre normalizado ────────────────────────
// Cada cliente tiene un UUID por dispositivo/navegador. Cuando el mismo
// usuario abre la app en iPhone Safari + iPhone Chrome + PC, aparecen 3
// filas con el mismo nombre. Esta función las colapsa en una sola fila
// "merged" que el coach ve como una unidad. La data se fusiona en el
// DetailView leyendo todos los user_ids en paralelo.
function groupClientsByName(clients) {
  if (!Array.isArray(clients)) return [];
  const groups = new Map();
  for (const c of clients) {
    const key = normalize(c.name || '');
    if (!key) {
      // Cliente sin nombre — no agrupar (mantenerlo aparte)
      groups.set(`__nameless__${c.user_id}`, [c]);
      continue;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }

  const STATUS_PRIORITY = { active: 0, recent: 1, at_risk: 2, inactive: 3 };
  const result = [];
  for (const [, members] of groups) {
    // Orden: más recientemente activo primero (lo usaremos como "primario")
    members.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    const primary = members[0];
    const siblings = members.slice(1).map(m => m.user_id);
    if (members.length === 1) {
      result.push({ ...primary, user_ids: [primary.user_id], device_count: 1, siblings: [] });
      continue;
    }
    // Mejor status
    let bestStatus = members[0].status || 'inactive';
    for (const m of members) {
      if ((STATUS_PRIORITY[m.status] ?? 99) < (STATUS_PRIORITY[bestStatus] ?? 99)) bestStatus = m.status;
    }
    // last_active = el más reciente
    const lastActive = members.reduce((acc, m) => (m.last_active || '') > (acc || '') ? m.last_active : acc, null);
    // adherence_7d = máxima de los dispositivos (cota superior real)
    const adherence7 = members.reduce((acc, m) => Math.max(acc, m.adherence_7d || 0), 0);
    // today = suma de kcal/p/c/g/water entre dispositivos para hoy
    const today = members.reduce((acc, m) => {
      if (!m.today) return acc;
      if (!acc) acc = { kcal: 0, p: 0, c: 0, g: 0, water: 0 };
      acc.kcal += m.today.kcal || 0;
      acc.p += m.today.p || 0;
      acc.c += m.today.c || 0;
      acc.g += m.today.g || 0;
      acc.water += m.today.water || 0;
      return acc;
    }, null);
    // El nombre: preferimos la versión más larga (más tildes/mayúsculas)
    const bestName = members.reduce((acc, m) => ((m.name || '').length > (acc || '').length ? m.name : acc), '');
    result.push({
      user_id: primary.user_id,
      name: bestName || primary.name,
      updated_at: primary.updated_at,
      last_active: lastActive,
      status: bestStatus,
      adherence_7d: adherence7,
      today,
      goals: primary.goals,
      coach_notes: primary.coach_notes,
      user_ids: members.map(m => m.user_id),
      device_count: members.length,
      siblings,
    });
  }
  return result;
}

// ─── Fusión de filas de cliente (cuando un mismo nombre tiene N user_ids) ─
// Cada respuesta de coach-data?action=detail devuelve un objeto cliente
// con su `data` (history, historyDetail, wellbeing, favorites, goals, today).
// Para una fila merged tomamos el MÁS RECIENTE para cada campo, evitando que
// data vieja de otro dispositivo pise la actual.
function mergeClientRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  if (rows.length === 1) return rows[0];

  // Ordena por updated_at desc — el primero es el "primario" (más reciente)
  const sorted = [...rows].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  const primary = sorted[0];

  // Para cada fecha, nos quedamos con la entrada del row más reciente que
  // tenga datos para esa fecha. Iteramos en orden DESC, así el primer hit
  // por fecha gana.
  const mergedHistory = {};
  const mergedHistoryDetail = {};
  const mergedWellbeing = {};
  for (const r of sorted) {
    const d = r.data || {};
    const h = d.history || {};
    const hd = d.historyDetail || {};
    const wb = d.wellbeing || {};
    for (const date of Object.keys(h)) {
      if (!mergedHistory[date]) mergedHistory[date] = h[date];
    }
    for (const date of Object.keys(hd)) {
      if (!mergedHistoryDetail[date]) mergedHistoryDetail[date] = hd[date];
    }
    for (const date of Object.keys(wb)) {
      if (!mergedWellbeing[date]) mergedWellbeing[date] = wb[date];
    }
  }

  // Favoritos e ingredientes favoritos: unión por nombre (case-insensitive)
  const favMap = new Map();
  const favIngSet = new Set();
  for (const r of sorted) {
    const d = r.data || {};
    for (const f of (d.favorites || [])) {
      const k = normalize(f?.name || f?.id || JSON.stringify(f));
      if (k && !favMap.has(k)) favMap.set(k, f);
    }
    for (const ing of (d.favoriteIngredients || [])) {
      const k = normalize(typeof ing === 'string' ? ing : ing?.name || '');
      if (k) favIngSet.add(k);
    }
  }
  const mergedFavorites = Array.from(favMap.values());
  const mergedFavoriteIngredients = Array.from(favIngSet);

  // Goals + name: del row más reciente
  const primaryData = primary.data || {};

  return {
    ...primary,
    data: {
      ...primaryData,
      history: mergedHistory,
      historyDetail: mergedHistoryDetail,
      wellbeing: mergedWellbeing,
      favorites: mergedFavorites,
      favoriteIngredients: mergedFavoriteIngredients,
    },
    // Para que el coach sepa que está viendo data fusionada
    _merged_from: rows.length,
    _merged_user_ids: rows.map(r => r.user_id),
  };
}

// ─── LISTA DE CLIENTES ────────────────────────────────────────────────────
function ListView({ apiFetch, onSelectClient, onLogout }) {
  const [clients, setClients] = useState(null); // null = loading
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('last_active'); // 'name' | 'last_active' | 'adherence' | 'worst_adherence'
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'at_risk'

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await apiFetch('/api/coach-data?action=list');
      const json = await r.json();
      if (!r.ok) { setError(json.error || 'Error al cargar'); setClients([]); return; }
      setClients(json.clients || []);
    } catch (e) {
      setError(String(e));
      setClients([]);
    }
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  // Agrupamos por nombre normalizado antes de mostrar/filtrar. Las filas
  // duplicadas se colapsan en una "fila merged" con su lista de user_ids.
  const groupedClients = useMemo(() => groupClientsByName(clients), [clients]);

  const stats = useMemo(() => {
    const cs = groupedClients;
    return {
      total: cs.length,
      activeToday: cs.filter(c => c.status === 'active').length,
      atRisk: cs.filter(c => c.status === 'at_risk' || c.status === 'inactive').length,
      avgAdherence: cs.length === 0 ? 0 : Math.round(cs.reduce((s, c) => s + c.adherence_7d, 0) / cs.length * 10) / 10,
      duplicates: cs.filter(c => c.device_count > 1).length,
    };
  }, [groupedClients]);

  const filtered = useMemo(() => {
    if (!clients) return [];
    let arr = groupedClients;
    if (filter === 'active') arr = arr.filter(c => c.status === 'active');
    else if (filter === 'at_risk') arr = arr.filter(c => c.status === 'at_risk' || c.status === 'inactive');
    if (search.trim()) {
      const q = normalize(search.trim());
      arr = arr.filter(c => normalize(c.name).includes(q));
    }
    arr = [...arr];
    if (sortBy === 'name') arr.sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));
    else if (sortBy === 'last_active') arr.sort((a, b) => (b.last_active || '').localeCompare(a.last_active || ''));
    else if (sortBy === 'adherence') arr.sort((a, b) => b.adherence_7d - a.adherence_7d);
    else if (sortBy === 'worst_adherence') arr.sort((a, b) => a.adherence_7d - b.adherence_7d);
    return arr;
  }, [clients, groupedClients, filter, search, sortBy]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <Header title="Panel del coach" subtitle="Tus clientes en vivo" onLogout={onLogout} />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={<Users size={16} />} label="Total clientes" value={stats.total} color={ACCENT} />
        <KpiCard icon={<Activity size={16} />} label="Activos hoy" value={stats.activeToday} color={SUCCESS} />
        <KpiCard icon={<AlertTriangle size={16} />} label="En riesgo" value={stats.atRisk} color={WARN} />
        <KpiCard icon={<TrendingUp size={16} />} label="Adherencia 7d" value={`${stats.avgAdherence}/7`} color={ACCENT_DARK} />
      </div>

      {/* Filtros y búsqueda */}
      <div className="p-4 rounded-2xl mb-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="relative mb-3">
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_LIGHT }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre (ignora acentos)"
            className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border outline-none"
            style={{ background: SURFACE_2, borderColor: BORDER, color: TEXT }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <SegmentedChip active={filter === 'all'} onClick={() => setFilter('all')}>Todos</SegmentedChip>
          <SegmentedChip active={filter === 'active'} onClick={() => setFilter('active')}>Activos hoy</SegmentedChip>
          <SegmentedChip active={filter === 'at_risk'} onClick={() => setFilter('at_risk')}>En riesgo</SegmentedChip>
          <div style={{ flex: 1 }} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="text-[12px] px-3 py-1.5 rounded-full border outline-none"
            style={{ background: SURFACE_2, borderColor: BORDER, color: TEXT }}>
            <option value="last_active">Recientes primero</option>
            <option value="name">Nombre A→Z</option>
            <option value="adherence">Mejor adherencia</option>
            <option value="worst_adherence">Peor adherencia</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      {error && <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: '#FCE9E5', color: DANGER }}>{error}</div>}
      {clients === null ? (
        <div className="text-center py-12" style={{ color: TEXT_LIGHT }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: TEXT_LIGHT }}>
          {clients.length === 0 ? 'Aún no hay clientes registrados.' : 'Ningún cliente coincide con los filtros.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <ClientRow
              key={c.user_id}
              client={c}
              onClick={() => onSelectClient(c.user_id, c.siblings)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientRow({ client, onClick }) {
  const c = client;
  const kcalPct = c.today && c.goals?.kcal ? Math.round((c.today.kcal / c.goals.kcal) * 100) : null;
  const isMerged = c.device_count > 1;

  return (
    <button onClick={onClick}
      className="w-full text-left p-4 rounded-2xl flex items-center gap-4 transition hover:scale-[1.005] active:scale-[0.99]"
      style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      {/* Status dot */}
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: statusColor(c.status) }} />

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="text-[14px] font-semibold truncate" style={{ color: TEXT }}>{c.name}</div>
          {isMerged && (
            <span
              className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1"
              style={{ background: ACCENT_PASTEL, color: ACCENT_DARK }}
              title={`Datos fusionados de ${c.device_count} dispositivos / sesiones del mismo nombre`}>
              <Link2 size={9} strokeWidth={2.5} /> {c.device_count} sesiones
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]" style={{ color: TEXT_LIGHT }}>
          <span>{statusLabel(c.status)} · {daysAgoStr(c.last_active) || 'sin registros'}</span>
          <span>· {c.adherence_7d}/7 días registrados</span>
        </div>
      </div>

      {/* Today's kcal */}
      <div className="hidden sm:flex flex-col items-end mr-3" style={{ minWidth: 80 }}>
        {c.today && c.goals?.kcal ? (
          <>
            <div className="text-[13px] font-semibold num" style={{ color: TEXT }}>{fmt0(c.today.kcal)} / {fmt0(c.goals.kcal)}</div>
            <div className="w-20 h-1.5 rounded-full overflow-hidden mt-1" style={{ background: SURFACE_2 }}>
              <div style={{
                width: `${Math.min(100, kcalPct)}%`, height: '100%',
                background: kcalPct > 110 ? DANGER : kcalPct > 95 ? SUCCESS : kcalPct > 70 ? ACCENT : WARN
              }} />
            </div>
            <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: TEXT_LIGHT }}>kcal hoy</div>
          </>
        ) : (
          <div className="text-[11px]" style={{ color: TEXT_LIGHT }}>Sin registro hoy</div>
        )}
      </div>

      <ChevronRight size={16} style={{ color: TEXT_LIGHT, flexShrink: 0 }} />
    </button>
  );
}

// ─── DETALLE DE CLIENTE ───────────────────────────────────────────────────
function DetailView({ userId, siblings = [], apiFetch, onBack, onLogout }) {
  const [client, setClient] = useState(null); // null = loading
  const [mergedFrom, setMergedFrom] = useState(0); // cuántas sesiones se fusionaron
  const [error, setError] = useState('');
  const [tab, setTab] = useState('dia');
  const [editingGoals, setEditingGoals] = useState(false);
  const [drilldownDate, setDrilldownDate] = useState(null); // 'YYYY-MM-DD' o null

  const allIds = useMemo(() => [userId, ...(siblings || [])], [userId, siblings]);

  const load = useCallback(async () => {
    setError('');
    try {
      const responses = await Promise.all(
        allIds.map(id =>
          apiFetch(`/api/coach-data?action=detail&user_id=${encodeURIComponent(id)}`)
            .then(r => r.json().then(j => ({ ok: r.ok, json: j })))
            .catch(e => ({ ok: false, json: { error: String(e) } }))
        )
      );
      const successful = responses.filter(r => r.ok && r.json.client).map(r => r.json.client);
      if (successful.length === 0) {
        const firstErr = responses[0]?.json?.error || 'Error al cargar';
        setError(firstErr);
        return;
      }
      setMergedFrom(successful.length);
      setClient(mergeClientRows(successful));
    } catch (e) { setError(String(e)); }
  }, [apiFetch, allIds]);

  useEffect(() => { load(); }, [load]);

  if (client === null && !error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <Header title="…" onLogout={onLogout} onBack={onBack} />
        <div className="text-center py-12" style={{ color: TEXT_LIGHT }}>Cargando cliente…</div>
      </div>
    );
  }
  if (error || !client) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <Header title="Cliente" onLogout={onLogout} onBack={onBack} />
        <div className="px-3 py-2 rounded-lg" style={{ background: '#FCE9E5', color: DANGER }}>{error || 'Cliente no encontrado.'}</div>
      </div>
    );
  }

  const data = client.data || {};
  const goals = data.goals || { kcal: 0, p: 0, c: 0, g: 0 };
  const history = data.history || {};
  const historyDetail = data.historyDetail || {};
  const wellbeing = data.wellbeing || {};
  const favorites = data.favorites || [];
  // Usar la fecha REPORTADA POR EL CLIENTE si está disponible, para evitar
  // desfases por zona horaria entre coach y cliente.
  const today = data.today || todayLocal();
  const todaySummary = history[today] || null;
  const todayEntries = historyDetail[today] || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <Header
        title={client.name || '(sin nombre)'}
        subtitle={daysAgoStr(Object.keys(history).sort().reverse()[0]) || 'sin registros'}
        onLogout={onLogout}
        onBack={onBack}
      />

      {mergedFrom > 1 && (
        <div className="mb-4 p-3 rounded-2xl flex items-center gap-2 text-[12px]"
          style={{ background: ACCENT_PASTEL, color: ACCENT_DARK, border: `1px solid ${ACCENT}` }}>
          <Link2 size={14} strokeWidth={2.2} />
          <span>
            Mostrando data fusionada de <strong>{mergedFrom} sesiones</strong> con el mismo nombre.
            Si necesitas ver una sola sesión, ábrelas directamente por su user_id.
          </span>
        </div>
      )}

      {/* Meta + duplicado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <GoalsCard goals={goals} editing={editingGoals} setEditing={setEditingGoals}
          onSave={async (newGoals) => {
            try {
              const r = await apiFetch(`/api/coach-data?action=goals&user_id=${encodeURIComponent(userId)}`, {
                method: 'PATCH',
                body: JSON.stringify(newGoals),
              });
              if (r.ok) {
                await load();
                setEditingGoals(false);
              } else {
                const j = await r.json();
                alert('No pude guardar: ' + (j.error || ''));
              }
            } catch (e) { alert('Error: ' + e); }
          }} />
        <DuplicateCard client={client} apiFetch={apiFetch} onChange={load} />
      </div>

      {/* Tabs — orden de prioridad: alineación hoy → calendario → gráficas → resto */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
        {[
          ['dia', 'Día'],
          ['mes', 'Calendario'],
          ['semana', 'Semana'],
          ['tendencia', 'Tendencia'],
          ['micros', 'Micros'],
          ['bienestar', 'Bienestar'],
          ['historial', 'Historial'],
          ['favoritos', 'Favoritos'],
        ].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className="text-[12px] px-3 py-1.5 rounded-full flex-shrink-0 font-medium"
            style={{
              background: tab === k ? TEXT : SURFACE,
              color: tab === k ? '#fff' : TEXT_MUTED,
              border: `1px solid ${tab === k ? TEXT : BORDER}`
            }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'dia' && <TabDia goals={goals} todaySummary={todaySummary} todayEntries={todayEntries} wellbeingToday={wellbeing[today]} />}
      {tab === 'semana' && <TabSemana goals={goals} history={history} onSelectDay={setDrilldownDate} />}
      {tab === 'mes' && <TabMes goals={goals} history={history} onSelectDay={setDrilldownDate} />}
      {tab === 'tendencia' && <TabTendencia history={history} />}
      {tab === 'micros' && <TabMicros historyDetail={historyDetail} />}
      {tab === 'bienestar' && <TabBienestar wellbeing={wellbeing} />}
      {tab === 'historial' && <TabHistorial historyDetail={historyDetail} />}
      {tab === 'favoritos' && <TabFavoritos favorites={favorites} />}

      {drilldownDate && (
        <DayDetailModal
          date={drilldownDate}
          goals={goals}
          summary={history[drilldownDate] || null}
          entries={historyDetail[drilldownDate] || []}
          wellbeing={wellbeing[drilldownDate]}
          onClose={() => setDrilldownDate(null)} />
      )}
    </div>
  );
}

function DayDetailModal({ date, goals, summary, entries, wellbeing, onClose }) {
  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-6" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-6" style={{ background: BG, border: `1px solid ${BORDER}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-[11px] tracking-[0.2em] uppercase font-semibold" style={{ color: ACCENT }}>Detalle del día</div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition" aria-label="Cerrar">
            <X size={16} style={{ color: TEXT_MUTED }} />
          </button>
        </div>
        <DayDetail date={date} goals={goals} summary={summary} entries={entries} wellbeing={wellbeing} />
      </div>
    </div>
  );
}

// ─── Subcomponentes pequeños ──────────────────────────────────────────────
function Header({ title, subtitle, onBack, onLogout }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-full hover:bg-black/5 transition flex-shrink-0">
            <ArrowLeft size={18} style={{ color: TEXT }} />
          </button>
        )}
        <div className="min-w-0">
          <div className="text-[11px] tracking-[0.22em] uppercase font-semibold" style={{ color: ACCENT }}>Coach</div>
          <div className="text-[20px] font-bold truncate" style={{ color: TEXT, letterSpacing: '-0.01em' }}>{title}</div>
          {subtitle && <div className="text-[12px]" style={{ color: TEXT_LIGHT }}>{subtitle}</div>}
        </div>
      </div>
      <button onClick={onLogout} className="text-[12px] flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-black/5 transition"
        style={{ color: TEXT_MUTED }}>
        <LogOut size={13} />
        <span className="hidden sm:inline">Cerrar sesión</span>
      </button>
    </div>
  );
}

function KpiCard({ icon, label, value, color }) {
  return (
    <div className="p-3 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: color || ACCENT }}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className="text-[20px] font-bold num" style={{ color: TEXT }}>{value}</div>
    </div>
  );
}

function SegmentedChip({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className="text-[12px] px-3 py-1.5 rounded-full font-medium transition"
      style={{
        background: active ? TEXT : SURFACE_2,
        color: active ? '#fff' : TEXT_MUTED,
        border: `1px solid ${active ? TEXT : BORDER}`
      }}>
      {children}
    </button>
  );
}

function GoalsCard({ goals, editing, setEditing, onSave }) {
  const [k, setK] = useState(goals.kcal || 0);
  const [p, setP] = useState(goals.p || 0);
  const [c, setC] = useState(goals.c || 0);
  const [g, setG] = useState(goals.g || 0);
  useEffect(() => {
    setK(goals.kcal || 0); setP(goals.p || 0); setC(goals.c || 0); setG(goals.g || 0);
  }, [goals]);

  return (
    <div className="p-4 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: TEXT_MUTED }}>Meta diaria</div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{ background: ACCENT_PASTEL, color: ACCENT_DARK }}>
            <Edit2 size={11} /> Editar
          </button>
        ) : (
          <div className="flex gap-1">
            <button onClick={() => setEditing(false)} className="p-1.5 rounded-full" style={{ background: SURFACE_2 }}>
              <X size={12} style={{ color: TEXT_MUTED }} />
            </button>
            <button onClick={() => onSave({ kcal: Number(k), p: Number(p), c: Number(c), g: Number(g) })}
              className="p-1.5 rounded-full flex items-center gap-1 px-2.5" style={{ background: ACCENT, color: '#fff' }}>
              <Save size={12} />
              <span className="text-[11px] font-semibold">Guardar</span>
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        <GoalField label="kcal" color={ACCENT} value={k} setValue={setK} editing={editing} />
        <GoalField label="P (g)" color={C_PROTEIN} value={p} setValue={setP} editing={editing} />
        <GoalField label="C (g)" color={C_CARBS} value={c} setValue={setC} editing={editing} />
        <GoalField label="G (g)" color={C_FAT} value={g} setValue={setG} editing={editing} />
      </div>
      {editing && (
        <div className="text-[11px] mt-3" style={{ color: TEXT_LIGHT }}>
          Al guardar, la nueva meta aparece en la app del cliente la próxima vez que la abra.
        </div>
      )}
    </div>
  );
}

function GoalField({ label, color, value, setValue, editing }) {
  return (
    <div className="text-center">
      {editing ? (
        <input type="number" value={value} onChange={e => setValue(e.target.value)}
          className="w-full text-center text-[15px] font-bold num px-2 py-1.5 rounded-lg border outline-none"
          style={{ background: SURFACE_2, borderColor: BORDER, color }} />
      ) : (
        <div className="text-[18px] font-bold num" style={{ color }}>{fmt0(value)}</div>
      )}
      <div className="text-[10px] mt-0.5" style={{ color: TEXT_LIGHT }}>{label}</div>
    </div>
  );
}

function DuplicateCard({ client, apiFetch, onChange }) {
  const [editing, setEditing] = useState(false);
  const [targetId, setTargetId] = useState(client.coach_notes?.duplicate_of || '');
  const current = client.coach_notes?.duplicate_of;

  const save = async () => {
    try {
      const url = targetId
        ? `/api/coach-data?action=mark_duplicate&user_id=${encodeURIComponent(client.user_id)}&duplicate_of=${encodeURIComponent(targetId)}`
        : `/api/coach-data?action=mark_duplicate&user_id=${encodeURIComponent(client.user_id)}`;
      const r = await apiFetch(url, { method: 'PATCH' });
      if (r.ok) { setEditing(false); await onChange(); }
      else { const j = await r.json(); alert('No pude guardar: ' + (j.error || '')); }
    } catch (e) { alert('Error: ' + e); }
  };

  return (
    <div className="p-4 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: TEXT_MUTED }}>Marcar como duplicado</div>
        {current && !editing && (
          <button onClick={async () => { setTargetId(''); await save(); }}
            className="text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1"
            style={{ background: '#FCE9E5', color: DANGER }}>
            <Link2Off size={11} /> Desligar
          </button>
        )}
      </div>
      {current && !editing ? (
        <div className="text-[12px]" style={{ color: TEXT }}>
          Apuntado como duplicado de: <code className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: SURFACE_2, color: ACCENT_DARK }}>{current.slice(0, 8)}…</code>
        </div>
      ) : !editing ? (
        <div className="flex items-center justify-between">
          <div className="text-[12px]" style={{ color: TEXT_LIGHT }}>No marcado.</div>
          <button onClick={() => setEditing(true)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1"
            style={{ background: ACCENT_PASTEL, color: ACCENT_DARK }}>
            <Link2 size={11} /> Marcar
          </button>
        </div>
      ) : (
        <div>
          <div className="text-[11px] mb-2" style={{ color: TEXT_MUTED }}>Pega el UUID del cliente "original" al que apunta este duplicado:</div>
          <input value={targetId} onChange={e => setTargetId(e.target.value)} placeholder="UUID del cliente original"
            className="w-full text-[12px] px-3 py-2 rounded-xl border outline-none mb-2"
            style={{ background: SURFACE_2, borderColor: BORDER, color: TEXT }} />
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setTargetId(current || ''); }} className="flex-1 py-2 rounded-full text-[12px] font-medium"
              style={{ background: SURFACE_2, color: TEXT_MUTED }}>
              Cancelar
            </button>
            <button onClick={save} className="flex-1 py-2 rounded-full text-[12px] font-semibold"
              style={{ background: ACCENT, color: '#fff' }}>
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────
function TabDia({ goals, todaySummary, todayEntries, wellbeingToday }) {
  const today = todayLocal();
  return (
    <DayDetail
      date={today}
      goals={goals}
      summary={todaySummary}
      entries={todayEntries}
      wellbeing={wellbeingToday}
      labelOverride="Hoy"
    />
  );
}

// Reporte detallado de un día — formato del coach, idéntico al PDF.
// Usado por TabDia (hoy) y por el modal que se abre cuando clickeás un día
// en TabSemana o TabMes.
function DayDetail({ date, goals, summary, entries, wellbeing, labelOverride }) {
  const t = summary || { kcal: 0, p: 0, c: 0, g: 0, water: 0 };
  return (
    <div className="space-y-4">
      {/* Meta diaria */}
      <div className="p-4 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: TEXT_MUTED }}>Metas diarias</div>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="text-[22px] font-bold num" style={{ color: ACCENT }}>{fmt0(goals.kcal)}</div>
            <div className="text-[11px]" style={{ color: TEXT_LIGHT }}>Calorías</div>
          </div>
          <div>
            <div className="text-[22px] font-bold num" style={{ color: C_PROTEIN }}>{fmt0(goals.p)}g</div>
            <div className="text-[11px]" style={{ color: TEXT_LIGHT }}>Proteína</div>
          </div>
          <div>
            <div className="text-[22px] font-bold num" style={{ color: C_CARBS }}>{fmt0(goals.c)}g</div>
            <div className="text-[11px]" style={{ color: TEXT_LIGHT }}>Carbohidratos</div>
          </div>
          <div>
            <div className="text-[22px] font-bold num" style={{ color: C_FAT }}>{fmt0(goals.g)}g</div>
            <div className="text-[11px]" style={{ color: TEXT_LIGHT }}>Grasas</div>
          </div>
        </div>
      </div>

      {/* Header del día + totales */}
      <div className="px-1">
        <div className="text-[18px] font-bold mb-1" style={{ color: TEXT, letterSpacing: '-0.01em' }}>
          {labelOverride || formatLongDate(date)}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] num">
          <span><span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: ACCENT }}>kcal</span> <strong style={{ color: TEXT }}>{fmt0(t.kcal)}</strong><span style={{ color: TEXT_LIGHT }}>/{fmt0(goals.kcal)}</span></span>
          <span><span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: C_PROTEIN }}>P</span> <strong style={{ color: TEXT }}>{fmt1(t.p)}g</strong><span style={{ color: TEXT_LIGHT }}>/{fmt0(goals.p)}g</span></span>
          <span><span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: C_CARBS }}>C</span> <strong style={{ color: TEXT }}>{fmt1(t.c)}g</strong><span style={{ color: TEXT_LIGHT }}>/{fmt0(goals.c)}g</span></span>
          <span><span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: C_FAT }}>G</span> <strong style={{ color: TEXT }}>{fmt1(t.g)}g</strong><span style={{ color: TEXT_LIGHT }}>/{fmt0(goals.g)}g</span></span>
        </div>
        {t.water > 0 && (
          <div className="flex items-center gap-1.5 text-[12px] mt-1.5" style={{ color: TEXT_MUTED }}>
            <Droplet size={11} style={{ color: '#6B7A8F' }} />
            <span>Agua: <span className="num font-semibold" style={{ color: TEXT }}>{t.water} ml</span></span>
          </div>
        )}
      </div>

      {/* Comidas registradas — formato reporte */}
      {(!entries || entries.length === 0) ? (
        <div className="p-4 rounded-2xl text-center text-[12px]" style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT_LIGHT }}>
          Este día no tiene comidas registradas.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((e, i) => (
            <div key={i} className="p-4 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="flex justify-between items-baseline mb-2">
                <div className="text-[11px] uppercase tracking-[0.2em] font-bold" style={{ color: TEXT }}>
                  {(e.meal || 'comida').toUpperCase()}
                </div>
                <div className="text-[11px] num" style={{ color: TEXT_LIGHT }}>{e.time || ''}</div>
              </div>
              <div className="space-y-0.5">
                {(e.items || []).map((it, j) => (
                  <div key={j} className="flex justify-between text-[13px]">
                    <span style={{ color: TEXT }}>
                      {it.name}{it.amount ? <span style={{ color: TEXT_MUTED }}> · {it.amount}</span> : null}
                    </span>
                    <span className="num pl-3" style={{ color: TEXT_LIGHT, flexShrink: 0 }}>{fmt0(it.kcal)} kcal</span>
                  </div>
                ))}
              </div>
              <div className="text-[11px] num mt-2 pt-2 border-t" style={{ borderColor: BORDER_SOFT, color: TEXT_MUTED }}>
                Total: <strong style={{ color: TEXT }}>{fmt0(e.kcal)} kcal</strong>
                <span className="ml-2" style={{ color: C_PROTEIN }}>· P{fmt1(e.p)}g</span>
                <span className="ml-1" style={{ color: C_CARBS }}>· C{fmt1(e.c)}g</span>
                <span className="ml-1" style={{ color: C_FAT }}>· G{fmt1(e.g)}g</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bienestar del día (si hay) */}
      {wellbeing && (
        <div className="p-4 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: TEXT_MUTED }}>Bienestar</div>
          <div className="flex flex-wrap gap-4 text-[13px]" style={{ color: TEXT }}>
            <span>⚡ Energía: <strong>{wellbeing.energy}/5</strong></span>
            <span>🍴 Hambre: <strong>{wellbeing.hunger}/5</strong></span>
            <span>😊 Ánimo: <strong>{wellbeing.mood}/5</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}

function MacroProgress({ label, val, goal, color }) {
  const pct = goal ? Math.min(100, Math.round((val / goal) * 100)) : 0;
  return (
    <div className="text-center">
      <div className="text-[16px] font-bold num" style={{ color }}>{fmt0(val)}</div>
      <div className="text-[10px] mt-0.5" style={{ color: TEXT_LIGHT }}>/ {fmt0(goal)} {label}</div>
      <div className="w-full h-1 rounded-full mt-1 overflow-hidden" style={{ background: SURFACE_2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

// Gráfica de barras día-por-día vs meta (mismo lenguaje visual que el
// "desempeño" del cliente): línea de meta, verde en rango, ámbar si se pasa.
function MacroBars({ days, goal, color, statKey, unit = '', onSelectDay }) {
  if (!goal || goal <= 0) return null;
  const maxRecorded = Math.max(0, ...days.map(d => (d.data ? (d.data[statKey] || 0) : 0)));
  const maxScale = Math.max(goal * 1.4, maxRecorded * 1.1, goal * 1.1);
  const goalPct = (goal / maxScale) * 100;
  const dayShort = (d) => d.toLocaleDateString('es', { weekday: 'short' }).slice(0, 3);
  return (
    <div>
      <div className="relative w-full" style={{ height: '96px', background: SURFACE_2 + '80', borderRadius: '8px', padding: '8px 6px' }}>
        <div className="absolute left-0 right-0 flex items-center" style={{ bottom: `${goalPct}%`, height: '1px', zIndex: 1 }}>
          <div className="flex-1 border-t-[1.5px] border-dashed" style={{ borderColor: SUCCESS, opacity: 0.6 }} />
          <span className="px-1 text-[8px] font-semibold uppercase tracking-wider" style={{ color: SUCCESS, background: SURFACE_2 }}>meta {fmt0(goal)}{unit}</span>
        </div>
        <div className="absolute inset-0 flex items-end gap-[3px] px-2 pb-2 pt-2" style={{ zIndex: 2 }}>
          {days.map((d, i) => {
            const val = d.data ? (d.data[statKey] || 0) : 0;
            const pct = goal > 0 ? val / goal : 0;
            const heightPct = val > 0 ? Math.min((val / maxScale) * 100, 100) : 0;
            const inGoal = val > 0 && pct >= 0.9 && pct <= 1.1;
            const over = val > goal * 1.1;
            const fill = val === 0 ? '#D0CFC6' : inGoal ? SUCCESS : over ? WARN : color;
            const clickable = !!d.data && typeof onSelectDay === 'function';
            return (
              <button key={i} onClick={() => clickable && onSelectDay(d.key)} disabled={!clickable}
                className="flex-1 h-full flex flex-col justify-end items-center"
                style={{ minWidth: 0, background: 'transparent', border: 'none', padding: 0, cursor: clickable ? 'pointer' : 'default' }}
                title={`${d.key}: ${fmt0(val)}${unit} (${Math.round(pct * 100)}% de la meta)`}>
                {val > 0 && <div className="text-[9px] font-bold num mb-0.5" style={{ color: fill }}>{fmt0(val)}</div>}
                <div className="w-full" style={{
                  height: val > 0 ? `${heightPct}%` : '2px', background: fill, opacity: val === 0 ? 0.5 : 1,
                  borderRadius: '3px 3px 1px 1px', minHeight: val > 0 ? '4px' : '2px',
                  transition: 'height 0.4s cubic-bezier(0.2, 0, 0, 1)',
                }} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-[3px] w-full mt-1 px-2">
        {days.map((d, i) => (
          <div key={i} className="flex-1 text-center capitalize" style={{ fontSize: '9px', color: TEXT_LIGHT, minWidth: 0 }}>{dayShort(d.date)}</div>
        ))}
      </div>
    </div>
  );
}

function TabSemana({ goals, history, onSelectDay }) {
  const last7 = useMemo(() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({ key, date: d, data: history[key] });
    }
    return out;
  }, [history]);

  const totalsAvg = useMemo(() => {
    const valid = last7.filter(x => x.data);
    if (valid.length === 0) return { kcal: 0, p: 0, c: 0, g: 0 };
    return {
      kcal: valid.reduce((s, x) => s + (x.data.kcal || 0), 0) / valid.length,
      p: valid.reduce((s, x) => s + (x.data.p || 0), 0) / valid.length,
      c: valid.reduce((s, x) => s + (x.data.c || 0), 0) / valid.length,
      g: valid.reduce((s, x) => s + (x.data.g || 0), 0) / valid.length,
    };
  }, [last7]);
  const daysLogged = last7.filter(x => x.data).length;

  const dayShort = (d) => d.toLocaleDateString('es', { weekday: 'short' }).slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="p-4 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="text-[11px] uppercase tracking-wider font-semibold mb-3" style={{ color: TEXT_MUTED }}>Esta semana (últimos 7 días)</div>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <Stat label="kcal prom" val={totalsAvg.kcal} goal={goals.kcal} color={ACCENT} />
          <Stat label="P prom" val={totalsAvg.p} goal={goals.p} color={C_PROTEIN} unit="g" />
          <Stat label="C prom" val={totalsAvg.c} goal={goals.c} color={C_CARBS} unit="g" />
          <Stat label="G prom" val={totalsAvg.g} goal={goals.g} color={C_FAT} unit="g" />
        </div>
        <div className="text-[12px]" style={{ color: TEXT_MUTED }}>
          Adherencia: <strong style={{ color: TEXT }}>{daysLogged}/7 días</strong> registrados
        </div>
      </div>

      <div className="p-4 rounded-2xl space-y-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: TEXT_MUTED }}>Día por día vs meta</div>
          <div className="text-[10px]" style={{ color: ACCENT_DARK }}>Toca una barra para ver el día</div>
        </div>
        {[
          { key: 'kcal', label: 'Calorías', color: ACCENT, unit: '' },
          { key: 'p', label: 'Proteína', color: C_PROTEIN, unit: 'g' },
          { key: 'c', label: 'Carbohidratos', color: C_CARBS, unit: 'g' },
          { key: 'g', label: 'Grasas', color: C_FAT, unit: 'g' },
        ].map(m => (
          <div key={m.key}>
            <div className="text-[11px] font-semibold mb-1.5" style={{ color: m.color }}>
              {m.label} <span style={{ color: TEXT_LIGHT, fontWeight: 400 }}>· meta {fmt0(goals[m.key])}{m.unit}</span>
            </div>
            <MacroBars days={last7} goal={goals[m.key]} color={m.color} statKey={m.key} unit={m.unit} onSelectDay={onSelectDay} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, val, goal, color, unit = '' }) {
  return (
    <div className="text-center">
      <div className="text-[18px] font-bold num" style={{ color }}>{fmt0(val)}{unit}</div>
      <div className="text-[10px]" style={{ color: TEXT_LIGHT }}>{label}</div>
      {goal > 0 && <div className="text-[10px] num" style={{ color: TEXT_LIGHT }}>meta {fmt0(goal)}{unit}</div>}
    </div>
  );
}

function TabMes({ goals, history, onSelectDay }) {
  // Generar últimos 35 días en una grilla 7xN
  const days = useMemo(() => {
    const out = [];
    for (let i = 34; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({ key, date: d, data: history[key] });
    }
    return out;
  }, [history]);

  const colorFor = (data) => {
    if (!data) return SURFACE_2;
    if (!goals.kcal) return ACCENT;
    const pct = (data.kcal / goals.kcal) * 100;
    if (pct > 110) return DANGER;
    if (pct > 90) return SUCCESS;
    if (pct > 60) return ACCENT;
    return WARN;
  };

  const valid = days.filter(d => d.data);
  const avg = valid.length === 0 ? { kcal: 0, p: 0, c: 0, g: 0 } : {
    kcal: valid.reduce((s, x) => s + (x.data.kcal || 0), 0) / valid.length,
    p: valid.reduce((s, x) => s + (x.data.p || 0), 0) / valid.length,
    c: valid.reduce((s, x) => s + (x.data.c || 0), 0) / valid.length,
    g: valid.reduce((s, x) => s + (x.data.g || 0), 0) / valid.length,
  };

  return (
    <div className="space-y-3">
      <div className="p-4 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="text-[11px] uppercase tracking-wider font-semibold mb-3" style={{ color: TEXT_MUTED }}>Últimos 35 días</div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Stat label="kcal prom" val={avg.kcal} goal={goals.kcal} color={ACCENT} />
          <Stat label="P prom" val={avg.p} goal={goals.p} color={C_PROTEIN} unit="g" />
          <Stat label="C prom" val={avg.c} goal={goals.c} color={C_CARBS} unit="g" />
          <Stat label="G prom" val={avg.g} goal={goals.g} color={C_FAT} unit="g" />
        </div>
        <div className="text-[12px]" style={{ color: TEXT_MUTED }}>Adherencia: <strong style={{ color: TEXT }}>{valid.length}/35 días</strong></div>
      </div>

      <div className="p-4 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="text-[11px] uppercase tracking-wider font-semibold mb-3" style={{ color: TEXT_MUTED }}>Heatmap (cada cuadro = un día)</div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d, i) => {
            const clickable = !!d.data && typeof onSelectDay === 'function';
            return (
              <button key={i}
                onClick={() => clickable && onSelectDay(d.key)}
                disabled={!clickable}
                title={`${d.key}${d.data ? `: ${fmt0(d.data.kcal)} kcal` : ' — sin registro'}`}
                className="aspect-square rounded-md flex items-center justify-center text-[9px] num p-0"
                style={{
                  background: colorFor(d.data),
                  color: d.data ? '#fff' : TEXT_LIGHT,
                  cursor: clickable ? 'pointer' : 'default',
                  border: 'none'
                }}>
                {d.date.getDate()}
              </button>
            );
          })}
        </div>
        <div className="text-[10px] mt-2 italic" style={{ color: ACCENT_DARK }}>
          Toca un cuadro con color para ver el detalle de ese día
        </div>
        <div className="flex items-center gap-3 mt-3 text-[10px]" style={{ color: TEXT_MUTED }}>
          <Legend color={SURFACE_2} label="Sin registro" />
          <Legend color={WARN} label="Bajo meta" />
          <Legend color={ACCENT} label="Cerca" />
          <Legend color={SUCCESS} label="En meta" />
          <Legend color={DANGER} label="Excedido" />
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />{label}</div>;
}

function TabTendencia({ history }) {
  const last28 = useMemo(() => {
    const out = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({ key, data: history[key] });
    }
    return out;
  }, [history]);

  // Promedios semanales (4 semanas)
  const weeks = [0, 1, 2, 3].map(w => {
    const slice = last28.slice(w * 7, w * 7 + 7).filter(x => x.data);
    if (slice.length === 0) return null;
    return {
      kcal: slice.reduce((s, x) => s + x.data.kcal, 0) / slice.length,
      p: slice.reduce((s, x) => s + x.data.p, 0) / slice.length,
      logged: slice.length,
    };
  });

  return (
    <div className="space-y-3">
      <div className="p-4 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="text-[11px] uppercase tracking-wider font-semibold mb-3" style={{ color: TEXT_MUTED }}>Tendencia · 4 semanas</div>
        <div className="space-y-3">
          {weeks.map((w, i) => (
            <div key={i} className="p-3 rounded-xl" style={{ background: SURFACE_2 }}>
              <div className="text-[11px] mb-1" style={{ color: TEXT_MUTED }}>Semana {i === 0 ? 'más reciente' : `−${i}`}</div>
              {w ? (
                <div className="flex gap-4 text-[13px] num">
                  <span style={{ color: ACCENT, fontWeight: 600 }}>{fmt0(w.kcal)} kcal prom</span>
                  <span style={{ color: C_PROTEIN }}>P {fmt1(w.p)}g prom</span>
                  <span style={{ color: TEXT_LIGHT }}>· {w.logged}/7 días</span>
                </div>
              ) : (
                <div className="text-[12px]" style={{ color: TEXT_LIGHT }}>Sin registros esa semana</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabMicros({ historyDetail }) {
  // Aproximación simple — promedio de los últimos 7 días si están registrados
  // (la app real estima micros desde los items; replicamos el cálculo aproximado)
  const last7Items = useMemo(() => {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const entries = historyDetail[key] || [];
      entries.forEach(e => (e.items || []).forEach(it => out.push(it)));
    }
    return out;
  }, [historyDetail]);

  // Densidades USDA muy rough (g por 100g de alimento). Cruda aproximación.
  // Si tu cliente quiere micros más exactos, podemos consumir el módulo del MealTracker
  // que ya los calcula. Por ahora damos una estimación.
  const totals = { fiber: 0, calcium: 0, iron: 0, vitD: 0, omega3: 0 };
  last7Items.forEach(it => {
    const txt = (it.name || '').toLowerCase();
    const g = parseFloat(it.amount) || 100;
    if (/avena|frijol|legum|lenteja|garbanzo|frut|verdur|brocoli|espinaca|hojas|integral/.test(txt)) totals.fiber += g * 0.05;
    if (/leche|queso|yogur|sardina|brocoli|sesamo/.test(txt)) totals.calcium += g * 1.2;
    if (/carne|res|higado|espinaca|lenteja|frijol|huevo/.test(txt)) totals.iron += g * 0.025;
    if (/pescado|salmon|atun|huevo|leche fort/.test(txt)) totals.vitD += g * 0.05;
    if (/salmon|sardina|atun|chia|lin|nuez/.test(txt)) totals.omega3 += g * 0.01;
  });
  const microAvg = {
    fiber: totals.fiber / 7,
    calcium: totals.calcium / 7,
    iron: totals.iron / 7,
    vitD: totals.vitD / 7,
    omega3: totals.omega3 / 7,
  };
  const GOAL = { fiber: 28, calcium: 1000, iron: 15, vitD: 15, omega3: 1.6 };

  return (
    <div className="p-4 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="text-[11px] uppercase tracking-wider font-semibold mb-3" style={{ color: TEXT_MUTED }}>Micros — promedio últimos 7 días (aprox)</div>
      <div className="space-y-2.5">
        <MicroRow label="Fibra" value={microAvg.fiber} goal={GOAL.fiber} unit="g" />
        <MicroRow label="Calcio" value={microAvg.calcium} goal={GOAL.calcium} unit="mg" />
        <MicroRow label="Hierro" value={microAvg.iron} goal={GOAL.iron} unit="mg" />
        <MicroRow label="Vitamina D" value={microAvg.vitD} goal={GOAL.vitD} unit="μg" />
        <MicroRow label="Omega-3" value={microAvg.omega3} goal={GOAL.omega3} unit="g" />
      </div>
      <div className="text-[10px] mt-4 italic" style={{ color: TEXT_LIGHT }}>
        Estimación a partir de los items registrados. Es referencial — no reemplaza análisis clínico.
      </div>
    </div>
  );
}

function MicroRow({ label, value, goal, unit }) {
  const pct = goal ? Math.min(150, Math.round((value / goal) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-[12px] mb-1">
        <span style={{ color: TEXT }}>{label}</span>
        <span className="num" style={{ color: TEXT_LIGHT }}>{fmt1(value)} {unit} / {goal} {unit} · <strong>{pct}%</strong></span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: SURFACE_2 }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: pct >= 80 ? SUCCESS : pct >= 50 ? ACCENT : WARN }} />
      </div>
    </div>
  );
}

function TabBienestar({ wellbeing }) {
  const days = useMemo(() => {
    const keys = Object.keys(wellbeing || {}).sort().reverse().slice(0, 14);
    return keys.map(k => ({ date: k, w: wellbeing[k] }));
  }, [wellbeing]);

  if (days.length === 0) {
    return <div className="p-4 rounded-2xl text-center text-[12px]" style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT_LIGHT }}>
      Aún sin check-ins de bienestar.
    </div>;
  }

  return (
    <div className="p-4 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="text-[11px] uppercase tracking-wider font-semibold mb-3" style={{ color: TEXT_MUTED }}>Bienestar · últimos 14 check-ins</div>
      <div className="space-y-1.5">
        {days.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-[12px] py-1.5 px-2 rounded-lg" style={{ background: i % 2 === 0 ? SURFACE_2 : 'transparent' }}>
            <span className="num" style={{ color: TEXT_MUTED }}>{d.date}</span>
            <div className="flex gap-3" style={{ color: TEXT }}>
              <span>⚡ {d.w.energy}/5</span>
              <span>🍴 {d.w.hunger}/5</span>
              <span>😊 {d.w.mood}/5</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabHistorial({ historyDetail }) {
  const allEntries = useMemo(() => {
    const out = [];
    Object.keys(historyDetail || {}).sort().reverse().forEach(date => {
      (historyDetail[date] || []).forEach(e => out.push({ ...e, date }));
    });
    return out;
  }, [historyDetail]);

  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? allEntries : allEntries.filter(e => (e.meal || '').toLowerCase() === filter);

  return (
    <div className="p-4 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
        <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: TEXT_MUTED }}>Historial completo · {allEntries.length} entradas</div>
        <div className="flex gap-1.5">
          {['all', 'desayuno', 'almuerzo', 'snack', 'cena'].map(m => (
            <button key={m} onClick={() => setFilter(m)}
              className="text-[10px] px-2 py-1 rounded-full"
              style={{ background: filter === m ? TEXT : SURFACE_2, color: filter === m ? '#fff' : TEXT_MUTED }}>
              {m === 'all' ? 'Todos' : m}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="text-[12px] text-center py-6" style={{ color: TEXT_LIGHT }}>Sin entradas con ese filtro.</div>
      ) : (
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map((e, i) => (
            <div key={i} className="p-2.5 rounded-lg text-[12px]" style={{ background: SURFACE_2 }}>
              <div className="flex justify-between mb-1" style={{ color: TEXT_LIGHT }}>
                <span className="num">{e.date}</span>
                <span className="uppercase tracking-wider text-[10px] font-semibold" style={{ color: ACCENT_DARK }}>{e.meal} · {e.time}</span>
              </div>
              <div style={{ color: TEXT }}>{(e.items || []).map(i => i.name).join(', ')}</div>
              <div className="text-[10px] num mt-1 flex gap-2" style={{ color: TEXT_LIGHT }}>
                <span>{fmt0(e.kcal)} kcal</span>
                <span>P{fmt1(e.p)}</span>
                <span>C{fmt1(e.c)}</span>
                <span>G{fmt1(e.g)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabFavoritos({ favorites }) {
  if (!favorites || favorites.length === 0) {
    return <div className="p-4 rounded-2xl text-center text-[12px]" style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT_LIGHT }}>
      Sin favoritos guardados.
    </div>;
  }
  return (
    <div className="p-4 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="text-[11px] uppercase tracking-wider font-semibold mb-3" style={{ color: TEXT_MUTED }}>Favoritos · {favorites.length}</div>
      <div className="space-y-2">
        {favorites.map(f => (
          <div key={f.id} className="p-3 rounded-xl flex items-center gap-3" style={{ background: SURFACE_2 }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-[13px] font-semibold truncate" style={{ color: TEXT }}>{f.name}</div>
                {f.type === 'day' && (
                  <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: ACCENT_PASTEL, color: ACCENT_DARK }}>
                    día · {Array.isArray(f.days) ? f.days.length : 0} comidas
                  </span>
                )}
              </div>
              <div className="text-[10px] num mt-0.5" style={{ color: TEXT_LIGHT }}>
                {fmt0(f.kcal)} kcal · P{fmt1(f.p)} C{fmt1(f.c)} G{fmt1(f.g)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
