import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowUp, RotateCcw, Calendar, Sparkles, Loader2, Check, BarChart3, Settings, X, Mic,
  Star, Trash2, FileText, ChevronLeft, ChevronRight, Trophy, Info, ChevronDown, ChevronUp,
  SlidersHorizontal as Sliders, PieChart, Utensils, Download, Droplet, CheckCircle2, Pencil, LineChart, ChefHat
} from 'lucide-react';

// Palette
const ACCENT = '#7A8450';
const ACCENT_DARK = '#5C6438';
const ACCENT_PASTEL = '#C8D0AE';
const ACCENT_LIGHT = '#EFF1E6';

const C_PROTEIN = '#E07856';
const C_PROTEIN_PASTEL = '#F5C9B8';
const C_CARBS = '#C9A66B';
const C_CARBS_PASTEL = '#EBDDC0';
const C_FAT = '#5A6478';
const C_FAT_PASTEL = '#C5C9D2';
const C_WATER = '#5BA3C7';

const BG = '#F2F3F5';
const SURFACE = '#FFFFFF';
const SURFACE_2 = '#EDEAE0';
const BORDER = '#E5E2D5';
const BORDER_SOFT = '#EFEDE3';
const TEXT = '#1A1A1A';
const TEXT_MUTED = '#6B6B6B';
const TEXT_LIGHT = '#9A9A9A';
const SUCCESS = '#7A9579';
const WARN = '#B8732B';

// Glass tokens — Apple-style
const GLASS_BG = 'rgba(255, 255, 255, 0.45)';
const GLASS_BG_STRONG = 'rgba(255, 255, 255, 0.65)';
const GLASS_BORDER = 'rgba(255, 255, 255, 0.85)';
const GLASS_BORDER_INNER = 'rgba(255, 255, 255, 0.6)';
const GLASS_SHADOW = '0 1px 0 rgba(255,255,255,0.7) inset, 0 -1px 0 rgba(255,255,255,0.2) inset, 0 8px 32px rgba(60, 70, 50, 0.08), 0 2px 8px rgba(60, 70, 50, 0.04)';

const FONT_UI = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Bebas Neue', 'Inter', sans-serif";

const AUTHORIZED_CLIENTS = [
  'Mauro Morón', 'Alejandro Aguirre', 'Amauri Barbosa', 'Andrea Angulo',
  'Andres Yepes', 'Carlos Martinez', 'Carlos Pirela', 'David Forero',
  'Diana Tovar', 'Julio Dieguez', 'Laura Lorena Cardenas', 'Mar Alzate',
  'Mateo Bermudez', 'Sergio Cuellar', 'Amalia Rodriguez',
];

const normalizeName = (str) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
const isAuthorized = (name) => {
  const normalized = normalizeName(name);
  return AUTHORIZED_CLIENTS.some(client => normalizeName(client) === normalized);
};

const haptic = (pattern = 10) => {
  if (typeof window !== 'undefined' && window.navigator?.vibrate) {
    window.navigator.vibrate(pattern);
  }
};

// Returns YYYY-MM-DD in user's LOCAL timezone (not UTC)
const getLocalDate = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

if (typeof window !== 'undefined' && !window.storage) {
  const PREFIX = 'mt:';
  window.storage = {
    get: async (key) => { try { const v = localStorage.getItem(PREFIX + key); return v !== null ? { value: v } : null; } catch (e) { return null; } },
    set: async (key, value) => { try { localStorage.setItem(PREFIX + key, value); return { value }; } catch (e) { return null; } },
    delete: async (key) => { try { localStorage.removeItem(PREFIX + key); return { deleted: true }; } catch (e) { return null; } },
    list: async (prefix = '') => { try { const keys = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX + prefix)) keys.push(k.slice(PREFIX.length)); } return { keys }; } catch (e) { return null; } },
  };
}


export default function MealTracker() {
  const [view, setView] = useState('loading');
  const [goals, setGoals] = useState(null);
  const [entries, setEntries] = useState([]);
  const [water, setWater] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState({});
  const [historyDetail, setHistoryDetail] = useState({});
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState('');
  const [name, setName] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [perfectDayShown, setPerfectDayShown] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [recording, setRecording] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [actionsExpanded, setActionsExpanded] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  const today = getLocalDate();

  useEffect(() => {
    (async () => {
      try {
        const [goalsRes, nameRes, lastDayRes, histRes, histDetailRes, favRes, msgsRes, perfectRes] = await Promise.all([
          window.storage.get('goals').catch(() => null),
          window.storage.get('name').catch(() => null),
          window.storage.get('lastDay').catch(() => null),
          window.storage.get('history').catch(() => null),
          window.storage.get('historyDetail').catch(() => null),
          window.storage.get('favorites').catch(() => null),
          window.storage.get('messages').catch(() => null),
          window.storage.get('perfectDays').catch(() => null),
        ]);

        let storedHistory = histRes?.value ? JSON.parse(histRes.value) : {};
        let storedHistoryDetail = histDetailRes?.value ? JSON.parse(histDetailRes.value) : {};
        const storedName = nameRes?.value ? JSON.parse(nameRes.value) : '';
        const storedFav = favRes?.value ? JSON.parse(favRes.value) : [];
        let storedMsgs = msgsRes?.value ? JSON.parse(msgsRes.value) : [];
        const storedPerfect = perfectRes?.value ? JSON.parse(perfectRes.value) : [];
        const lastDay = lastDayRes?.value ? JSON.parse(lastDayRes.value) : null;

        // MIGRATION: collect all entry IDs from today + all historical days, drop orphan messages
        const todayRawRes = await window.storage.get(`day:${today}`).catch(() => null);
        const todayRawEntries = todayRawRes?.value ? JSON.parse(todayRawRes.value) : [];
        const allEntryIds = new Set(todayRawEntries.map(e => e.id));
        Object.values(storedHistoryDetail).forEach(arr => {
          (arr || []).forEach(e => allEntryIds.add(e.id));
        });
        const beforeCount = storedMsgs.length;
        storedMsgs = storedMsgs.filter(m => !m.isLogged || !m.entryId || allEntryIds.has(m.entryId));
        if (storedMsgs.length !== beforeCount) {
          await window.storage.set('messages', JSON.stringify(storedMsgs)).catch(() => {});
        }

        if (lastDay && lastDay !== today) {
          const prevDayRes = await window.storage.get(`day:${lastDay}`).catch(() => null);
          const prevWaterRes = await window.storage.get(`water:${lastDay}`).catch(() => null);
          let yesterdayTotals = null;
          if (prevDayRes?.value) {
            const prevEntries = JSON.parse(prevDayRes.value);
            const totals = prevEntries.reduce((acc, e) => ({
              kcal: acc.kcal + (e.kcal || 0),
              p: acc.p + (e.p || 0),
              c: acc.c + (e.c || 0),
              g: acc.g + (e.g || 0),
            }), { kcal: 0, p: 0, c: 0, g: 0 });
            totals.water = prevWaterRes?.value ? JSON.parse(prevWaterRes.value) : 0;
            storedHistory[lastDay] = totals;
            storedHistoryDetail[lastDay] = prevEntries;
            yesterdayTotals = totals;
            await window.storage.set('history', JSON.stringify(storedHistory));
            await window.storage.set('historyDetail', JSON.stringify(storedHistoryDetail));
          }
          setEntries([]);
          setWater(0);

          const separator = { role: 'system', isDaySeparator: true, date: today, ts: Date.now() };
          const goalsRef = goalsRes?.value ? JSON.parse(goalsRes.value) : null;
          const greeting = {
            role: 'assistant',
            content: composeDayOpening(storedName, yesterdayTotals, goalsRef),
            isWelcomeHints: !storedMsgs.length
          };
          setMessages([...storedMsgs, separator, greeting]);
        } else {
          const todayRes = await window.storage.get(`day:${today}`).catch(() => null);
          const todayWaterRes = await window.storage.get(`water:${today}`).catch(() => null);
          if (todayRes?.value) setEntries(JSON.parse(todayRes.value));
          if (todayWaterRes?.value) setWater(JSON.parse(todayWaterRes.value));
          if (storedMsgs.length > 0) setMessages(storedMsgs);
        }

        await window.storage.set('lastDay', JSON.stringify(today));
        setHistory(storedHistory);
        setHistoryDetail(storedHistoryDetail);
        setFavorites(storedFav);
        if (storedName) setName(storedName);
        if (storedPerfect.includes(today)) setPerfectDayShown(true);

        if (goalsRes?.value) {
          setGoals(JSON.parse(goalsRes.value));
          setView('main');
          if (storedMsgs.length === 0 && (!lastDay || lastDay === today)) {
            setMessages([{
              role: 'assistant',
              content: storedName
                ? `${storedName.split(' ')[0]}, todo en orden. Listo cuando quieras registrar.`
                : 'Todo en orden. Listo cuando quieras registrar.',
              isWelcomeHints: true,
              ts: Date.now()
            }]);
          }
        } else {
          setView('welcome');
        }
      } catch (e) {
        setView('welcome');
      }
    })();
  }, []);

  // Weekly report auto-send: when client opens app, if 7+ days since last send, send report
  useEffect(() => {
    if (view !== 'main' || !name) return;
    const checkAndSend = async () => {
      try {
        const lastSentRes = await window.storage.get('weeklyReportLastSent').catch(() => null);
        const lastSent = lastSentRes?.value ? JSON.parse(lastSentRes.value) : null;
        const now = Date.now();
        const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
        if (lastSent && (now - lastSent) < ONE_WEEK) return; // Already sent this week

        // Build summary from history of last 7 days
        const last7Days = [];
        const todayDate = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(todayDate);
          d.setDate(d.getDate() - i);
          last7Days.push(getLocalDate(d));
        }
        const daysData = last7Days.map(date => {
          if (date === today) {
            const t = entries.reduce((acc, e) => ({
              kcal: acc.kcal + (e.kcal || 0), p: acc.p + (e.p || 0),
              c: acc.c + (e.c || 0), g: acc.g + (e.g || 0),
            }), { kcal: 0, p: 0, c: 0, g: 0 });
            return { date, ...t, entries: entries.length };
          }
          const h = history[date];
          const det = historyDetail[date] || [];
          return h ? { date, ...h, entries: det.length } : { date, kcal: 0, p: 0, c: 0, g: 0, entries: 0 };
        });
        const daysRegistered = daysData.filter(d => d.entries > 0).length;
        if (daysRegistered === 0) return; // No data, skip

        const avgKcal = Math.round(daysData.reduce((s, d) => s + d.kcal, 0) / 7);
        const avgP = Math.round(daysData.reduce((s, d) => s + d.p, 0) / 7);
        const avgC = Math.round(daysData.reduce((s, d) => s + d.c, 0) / 7);
        const avgG = Math.round(daysData.reduce((s, d) => s + d.g, 0) / 7);
        const perfectDays = daysData.filter(d =>
          d.entries > 0 &&
          Math.abs(d.kcal - goals.kcal) <= goals.kcal * 0.1 &&
          Math.abs(d.p - goals.p) <= goals.p * 0.1
        ).length;

        const fmtDay = (date) => {
          const [y, m, dd] = date.split('-').map(Number);
          return new Date(y, m - 1, dd).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
        };

        const summary = `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; color: #1A1A1A;">
  <div style="background: #0E0E0E; color: #fff; padding: 24px; border-radius: 12px 12px 0 0;">
    <div style="font-size: 24px; font-weight: 700; letter-spacing: 0.01em;">REPORTE SEMANAL</div>
    <div style="height: 2px; width: 40px; background: #C8D0AE; margin: 8px 0;"></div>
    <div style="font-size: 14px; opacity: 0.85;">Entrena con Método</div>
  </div>
  <div style="background: #F9F7F1; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #E5E2D5;">
    <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">${name}</div>
    <div style="font-size: 12px; color: #6B6B6B; margin-bottom: 20px;">Últimos 7 días · enviado automáticamente</div>

    <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 12px; background: #fff; border-radius: 8px; text-align: center; width: 25%;">
          <div style="font-size: 10px; color: #9A9A9A; text-transform: uppercase; letter-spacing: 0.1em;">Promedio kcal</div>
          <div style="font-size: 20px; font-weight: 700; color: #7A8450; margin-top: 4px;">${avgKcal}</div>
          <div style="font-size: 10px; color: #9A9A9A;">meta ${goals.kcal}</div>
        </td>
        <td style="padding: 12px; background: #fff; border-radius: 8px; text-align: center; width: 25%;">
          <div style="font-size: 10px; color: #9A9A9A; text-transform: uppercase; letter-spacing: 0.1em;">Proteína</div>
          <div style="font-size: 20px; font-weight: 700; color: #E07856; margin-top: 4px;">${avgP}g</div>
          <div style="font-size: 10px; color: #9A9A9A;">meta ${goals.p}g</div>
        </td>
        <td style="padding: 12px; background: #fff; border-radius: 8px; text-align: center; width: 25%;">
          <div style="font-size: 10px; color: #9A9A9A; text-transform: uppercase; letter-spacing: 0.1em;">Carbos</div>
          <div style="font-size: 20px; font-weight: 700; color: #C9A66B; margin-top: 4px;">${avgC}g</div>
          <div style="font-size: 10px; color: #9A9A9A;">meta ${goals.c}g</div>
        </td>
        <td style="padding: 12px; background: #fff; border-radius: 8px; text-align: center; width: 25%;">
          <div style="font-size: 10px; color: #9A9A9A; text-transform: uppercase; letter-spacing: 0.1em;">Grasas</div>
          <div style="font-size: 20px; font-weight: 700; color: #5A6478; margin-top: 4px;">${avgG}g</div>
          <div style="font-size: 10px; color: #9A9A9A;">meta ${goals.g}g</div>
        </td>
      </tr>
    </table>

    <div style="background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
      <div style="font-size: 11px; color: #6B6B6B; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; margin-bottom: 12px;">Resumen de adherencia</div>
      <div style="display: flex; gap: 16px;">
        <div>
          <div style="font-size: 24px; font-weight: 700; color: #1A1A1A;">${daysRegistered}/7</div>
          <div style="font-size: 11px; color: #6B6B6B;">Días con registro</div>
        </div>
        <div style="border-left: 1px solid #E5E2D5; padding-left: 16px;">
          <div style="font-size: 24px; font-weight: 700; color: #7A8450;">${perfectDays}</div>
          <div style="font-size: 11px; color: #6B6B6B;">Días en rango ±10%</div>
        </div>
      </div>
    </div>

    <div style="background: #fff; padding: 16px; border-radius: 8px;">
      <div style="font-size: 11px; color: #6B6B6B; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; margin-bottom: 12px;">Detalle diario</div>
      ${daysData.map(d => `
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F2F2F2; font-size: 13px;">
          <span style="color: ${d.entries === 0 ? '#C5C5C5' : '#1A1A1A'}; text-transform: capitalize;">${fmtDay(d.date)}</span>
          <span style="color: ${d.entries === 0 ? '#C5C5C5' : '#6B6B6B'}; font-variant-numeric: tabular-nums;">
            ${d.entries === 0 ? 'Sin registro' : `${d.kcal} kcal · P ${d.p}g · C ${d.c}g · G ${d.g}g`}
          </span>
        </div>
      `).join('')}
    </div>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E5E2D5; font-size: 11px; color: #9A9A9A; text-align: center;">
      Reporte generado automáticamente por Meal Tracker<br>
      Mauro Morón · ISSA Certified Fitness and Nutrition Coach
    </div>
  </div>
</div>
        `;

        // Generate PDF using existing logic
        let pdfBase64 = null;
        try {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          await new Promise((resolve, reject) => {
            if (window.jspdf) { resolve(); return; }
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF({ unit: 'mm', format: 'a4' });
          doc.setFillColor(14, 14, 14);
          doc.rect(0, 0, 210, 30, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(20);
          doc.setFont('helvetica', 'bold');
          doc.text('REPORTE SEMANAL', 15, 18);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text('Entrena con Método', 15, 25);
          doc.setTextColor(30, 30, 30);
          let y = 45;
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(name, 15, y);
          y += 6;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(120, 120, 120);
          doc.text('Últimos 7 días · enviado automáticamente', 15, y);
          y += 12;
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 30, 30);
          doc.text('Promedios semanales', 15, y);
          y += 6;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Calorías: ${avgKcal} / ${goals.kcal} kcal`, 15, y); y += 5;
          doc.text(`Proteína: ${avgP}g / ${goals.p}g`, 15, y); y += 5;
          doc.text(`Carbohidratos: ${avgC}g / ${goals.c}g`, 15, y); y += 5;
          doc.text(`Grasas: ${avgG}g / ${goals.g}g`, 15, y); y += 10;
          doc.setFont('helvetica', 'bold');
          doc.text(`Adherencia: ${daysRegistered}/7 días con registro · ${perfectDays} días en rango ±10%`, 15, y);
          y += 12;
          doc.setFont('helvetica', 'bold');
          doc.text('Detalle diario', 15, y);
          y += 6;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          daysData.forEach(d => {
            const line = d.entries === 0
              ? `${fmtDay(d.date)}: Sin registro`
              : `${fmtDay(d.date)}: ${d.kcal} kcal · P ${d.p}g · C ${d.c}g · G ${d.g}g`;
            doc.text(line, 15, y);
            y += 5;
          });
          const pdfDataUri = doc.output('datauristring');
          pdfBase64 = pdfDataUri.split(',')[1];
        } catch (e) {
          // PDF generation failed, send without attachment
          pdfBase64 = null;
        }

        // Send to backend
        const weekLabel = today;
        const sendRes = await fetch('/api/send-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientName: name, summary, pdfBase64, weekLabel }),
        });
        if (sendRes.ok) {
          await window.storage.set('weeklyReportLastSent', JSON.stringify(now)).catch(() => {});
          // Silent success - or show a subtle message
          setMessages(m => [...m, {
            role: 'system',
            isInfo: true,
            content: 'Reporte semanal enviado a tu coach.',
            ts: Date.now(),
          }]);
        }
      } catch (e) {
        console.error('Weekly report error:', e);
      }
    };
    // Run after a short delay so app finishes loading first
    const timer = setTimeout(checkAndSend, 5000);
    return () => clearTimeout(timer);
  }, [view, name, today]);

  // Midnight watcher: detects day change while app is open, archives entries, resets rings
  useEffect(() => {
    if (view !== 'main') return;
    const checkDayChange = () => {
      const now = getLocalDate();
      if (now !== today) {
        // Archive current day's entries to history
        if (entries.length > 0) {
          const dayTotals = entries.reduce((acc, e) => ({
            kcal: acc.kcal + (e.kcal || 0),
            p: acc.p + (e.p || 0),
            c: acc.c + (e.c || 0),
            g: acc.g + (e.g || 0),
          }), { kcal: 0, p: 0, c: 0, g: 0 });
          setHistory(h => ({ ...h, [today]: { ...dayTotals, water } }));
          setHistoryDetail(hd => ({ ...hd, [today]: entries }));
        }
        // Reset for new day
        setEntries([]);
        setWater(0);
        setPerfectDayShown(false);
        setMessages(m => [
          ...m,
          { role: 'system', isDaySeparator: true, date: now, ts: Date.now() }
        ]);
        window.storage.set('lastDay', JSON.stringify(now)).catch(() => {});
        // Force re-render with new `today` by reloading; simpler: just leave anillos at 0 (totals recompute from entries)
      }
    };
    const interval = setInterval(checkDayChange, 30000); // every 30s
    return () => clearInterval(interval);
  }, [view, today, entries, water]);

  // Keyboard detection (mobile)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const handleResize = () => {
      const heightDiff = window.innerHeight - window.visualViewport.height;
      setKeyboardOpen(heightDiff > 100);
    };
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (view === 'main') {
      window.storage.set(`day:${today}`, JSON.stringify(entries)).catch(() => {});
    }
  }, [entries, today, view]);

  useEffect(() => {
    if (view === 'main') {
      window.storage.set(`water:${today}`, JSON.stringify(water)).catch(() => {});
    }
  }, [water, today, view]);

  useEffect(() => {
    window.storage.set('favorites', JSON.stringify(favorites)).catch(() => {});
  }, [favorites]);

  useEffect(() => {
    if (view === 'main') {
      const toStore = messages.slice(-200);
      window.storage.set('messages', JSON.stringify(toStore)).catch(() => {});
    }
  }, [messages, view]);

  const totals = entries.reduce((acc, e) => ({
    kcal: acc.kcal + (e.kcal || 0),
    p: acc.p + (e.p || 0),
    c: acc.c + (e.c || 0),
    g: acc.g + (e.g || 0),
  }), { kcal: 0, p: 0, c: 0, g: 0 });

  useEffect(() => {
    if (!goals || perfectDayShown || entries.length === 0) return;
    const tolerance = 0.05;
    const isInRange = (val, goal) => val >= goal * (1 - tolerance) && val <= goal * (1 + tolerance);
    if (isInRange(totals.kcal, goals.kcal) && isInRange(totals.p, goals.p) &&
        isInRange(totals.c, goals.c) && isInRange(totals.g, goals.g)) {
      haptic([30, 50, 30, 50, 60]);
      setActiveModal('perfect');
      setPerfectDayShown(true);
      window.storage.get('perfectDays').then(res => {
        const arr = res?.value ? JSON.parse(res.value) : [];
        if (!arr.includes(today)) {
          arr.push(today);
          window.storage.set('perfectDays', JSON.stringify(arr));
        }
      }).catch(() => {});
    }
  }, [totals, goals, entries.length, perfectDayShown, today]);

  const callClaude = async (prompt, systemPrompt, retries = 2) => {
    let lastError = null;
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1500,
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }],
          })
        });
        if (!response.ok) {
          if (response.status === 429 || response.status === 529 || response.status >= 500) {
            throw new Error(`overloaded:${response.status}`);
          }
          throw new Error(`http:${response.status}`);
        }
        const data = await response.json();
        return data.content.map(c => c.text || '').join('');
      } catch (e) {
        lastError = e;
        if (i < retries) {
          const wait = 300 * Math.pow(2, i);
          await new Promise(r => setTimeout(r, wait));
        }
      }
    }
    throw lastError;
  };

  const isFirstMealOfDay = entries.length === 0;

  const predictMealType = () => {
    if (isFirstMealOfDay) return 'desayuno';
    const hour = new Date().getHours();
    if (hour < 11) return 'desayuno';
    if (hour < 16) return 'almuerzo';
    if (hour < 21) return 'cena';
    return 'snack';
  };

  const parseFoodEntry = async (text) => {
    const sys = `Eres un parser nutricional experto. Devuelves SOLO JSON válido, sin markdown.

CRÍTICO: Usa SOLO valores nutricionales REALES y verificables (USDA, etiquetas comerciales estándar). PROHIBIDO inventar valores absurdos.

VALIDACIÓN: 1g P=4 kcal, 1g C=4 kcal, 1g G=9 kcal. Suma macros entre 85-115% del kcal total.
Sanity: huevo grande ~75 kcal, 100g pollo cocido ~165 kcal, 100g arroz cocido ~130 kcal, 100g avena cruda ~380 kcal, 1 manzana ~95 kcal, 1 plátano ~105 kcal.

DETECCIÓN DE CANTIDAD:
- Si NO especifica cantidad: needs_quantity:true, usa cantidad estimada estándar, devuelve "quantity_warning".
- Si SÍ especifica: needs_quantity:false.

OBSERVACIÓN TÉCNICA: technical_note debe ser SIEMPRE null. No generes observaciones.

{
  "type": "food" | "direct" | "command" | "proportion" | "question" | "water" | "macro_query",
  "meal": "desayuno" | "almuerzo" | "cena" | "snack" | null,
  "items": [{"name": "...", "amount": "...", "kcal": N, "p": N, "c": N, "g": N, "needs_quantity": true|false}],
  "command": "reset_day" | "change_goals" | "summary" | "summary_detailed" | "weekly" | "calendar" | "favorites" | "export" | null,
  "name_detected": "..." | null,
  "off_topic_response": "..." | null,
  "water_ml": N | null,
  "preview": "ej: '2 huevos, avena, plátano'",
  "quantity_warning": "string | null",
  "technical_note": null,
  "macro_query_response": {"food": "...", "amount": "...", "kcal": N, "p": N, "c": N, "g": N, "technical_note": null} | null
}

Reglas:
- "macro_query": consulta sin registrar.
- "direct" (ej: "250 kcal 22p 30c 5g"): un item.
- "water": "1 vaso"=250ml, "1 termo"=500ml, "1 botella"=500ml, "1 litro"=1000ml.
- Si no se especifica meal y es la primera del día (${isFirstMealOfDay}): "desayuno".
- Si pregunta sobre dieta/qué comer: type="question", off_topic_response="Calculo y registro. No recomiendo qué comer — eso es trabajo del Coach. Para criterio personalizado consulta directamente con Mauro Morón."
- Si SOLO saluda ("hola", "buenas", "qué tal", etc., sin comida): type="question", off_topic_response="Hola. Cuéntame qué comiste y lo registro."
- Comandos: "reiniciar día"=reset_day, "cambiar metas"=change_goals, "ver resumen"=summary, "resumen detallado"=summary_detailed, "detalle del día"=summary_detailed, "alimentos del día"=summary_detailed, "semanal"=weekly, "calendario"=calendar, "favoritos"=favorites, "exportar"=export
- Si menciona su nombre: name_detected="X"
- Si pide proporciones: type="proportion"
- Números enteros realistas. SIEMPRE incluir "preview".`;

    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await callClaude(text, sys);
        const clean = result.replace(/```json|```/g, '').trim();
        const jsonMatch = clean.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : clean);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  };

  const validateEntry = (items) => {
    for (const it of items) {
      const macroKcal = (it.p || 0) * 4 + (it.c || 0) * 4 + (it.g || 0) * 9;
      if (it.kcal > 0 && (macroKcal < it.kcal * 0.7 || macroKcal > it.kcal * 1.3)) return false;
      if (it.kcal > 3000 || it.p > 300 || it.c > 500 || it.g > 200) return false;
    }
    return true;
  };

  const calculateProportions = async (text) => {
    const remaining = {
      kcal: Math.max(0, goals.kcal - totals.kcal),
      p: Math.max(0, goals.p - totals.p),
      c: Math.max(0, goals.c - totals.c),
      g: Math.max(0, goals.g - totals.g),
    };
    const sys = `Calculadora matemática de proporciones nutricionales. Devuelves SOLO JSON válido.

Macros faltantes: ${remaining.kcal} kcal, ${remaining.p}g P, ${remaining.c}g C, ${remaining.g}g G.

Dada una lista de alimentos, calcula cantidades exactas. Usa valores REALES (USDA). NO sugieras alimentos adicionales. NO recetas.

{
  "proportions": [{"name": "...", "amount": "Xg" o "X unidades", "kcal": N, "p": N, "c": N, "g": N}],
  "totals": {"kcal": N, "p": N, "c": N, "g": N},
  "note": "nota técnica breve, máximo 12 palabras"
}`;
    const result = await callClaude(text, sys);
    const clean = result.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  };

  const handleSend = async (textOverride) => {
    const userMsg = (textOverride || input).trim();
    if (!userMsg || loading) return;
    if (!textOverride) setInput('');
    haptic(8);
    setMessages(m => [...m, { role: 'user', content: userMsg, ts: Date.now() }]);
    setLoading(true);
    setLoadingPreview('Interpretando…');

    try {
      const parsed = await parseFoodEntry(userMsg);
      if (parsed.preview) setLoadingPreview(`Calculando: ${parsed.preview}`);

      if (parsed.name_detected) {
        setName(parsed.name_detected);
        await window.storage.set('name', JSON.stringify(parsed.name_detected));
      }

      if (parsed.type === 'macro_query' && parsed.macro_query_response) {
        setMessages(m => [...m, { role: 'assistant', content: 'macro_query', isMacroQuery: true, data: parsed.macro_query_response, ts: Date.now() }]);
        setLoading(false); setLoadingPreview('');
        return;
      }

      if (parsed.type === 'water' && parsed.water_ml) {
        setWater(w => w + parsed.water_ml);
        haptic(15);
        setMessages(m => [...m, { role: 'assistant', content: 'water', isWater: true, ml: parsed.water_ml, ts: Date.now() }]);
        setLoading(false); setLoadingPreview('');
        return;
      }

      if (parsed.type === 'question' && parsed.off_topic_response) {
        setMessages(m => [...m, { role: 'assistant', content: parsed.off_topic_response, ts: Date.now() }]);
        setLoading(false); setLoadingPreview('');
        return;
      }

      if (parsed.type === 'command') {
        if (parsed.command === 'reset_day') setActiveModal('reset');
        else if (parsed.command === 'change_goals') setView('onboarding');
        else if (parsed.command === 'summary') {
          setMessages(m => [...m, { role: 'assistant', content: 'summary', isSummary: true, totals: { ...totals }, ts: Date.now() }]);
        } else if (parsed.command === 'summary_detailed') {
          setMessages(m => [...m, { role: 'assistant', content: 'summary_detailed', isSummaryDetailed: true, entries: [...entries], totals: { ...totals }, ts: Date.now() }]);
        } else if (parsed.command === 'weekly') setActiveModal('weekly');
        else if (parsed.command === 'calendar') setActiveModal('calendar');
        else if (parsed.command === 'favorites') setActiveModal('favorites');
        else if (parsed.command === 'export') setActiveModal('export');
        setLoading(false); setLoadingPreview('');
        return;
      }

      if (parsed.type === 'proportion') {
        if (parsed.items && parsed.items.length > 0) {
          const propResult = await calculateProportions(userMsg);
          setMessages(m => [...m, { role: 'assistant', content: 'proportion', isProportion: true, data: propResult, ts: Date.now() }]);
        } else {
          setMessages(m => [...m, {
            role: 'assistant',
            content: 'Indícame qué alimentos tienes disponibles. Calculo proporciones para cuadrar tus macros faltantes.\n\nEjemplo: "tengo pollo, arroz integral, brócoli y aceite de oliva"',
            ts: Date.now()
          }]);
        }
        setLoading(false); setLoadingPreview('');
        return;
      }

      if ((parsed.type === 'food' || parsed.type === 'direct') && parsed.items?.length > 0) {
        const valid = validateEntry(parsed.items);
        if (!valid) {
          setMessages(m => [...m, {
            role: 'assistant',
            content: 'Los valores no cuadran. Describe la cantidad con más precisión. Ejemplo: "150g de pollo a la plancha".',
            ts: Date.now()
          }]);
          setLoading(false); setLoadingPreview('');
          return;
        }

        const hasMissingQuantity = parsed.items.some(i => i.needs_quantity);
        haptic(12);

        const newEntry = {
          id: Date.now(),
          meal: parsed.meal || predictMealType(),
          items: parsed.items,
          kcal: parsed.items.reduce((s, i) => s + (i.kcal || 0), 0),
          p: parsed.items.reduce((s, i) => s + (i.p || 0), 0),
          c: parsed.items.reduce((s, i) => s + (i.c || 0), 0),
          g: parsed.items.reduce((s, i) => s + (i.g || 0), 0),
          time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
          rawInput: userMsg,
          hasMissingQuantity
        };
        setEntries(e => [...e, newEntry]);
        setMessages(m => [...m, {
          role: 'assistant', content: 'logged', isLogged: true,
          entryId: newEntry.id, quantityWarning: parsed.quantity_warning, ts: Date.now()
        }]);
      } else {
        setMessages(m => [...m, {
          role: 'assistant',
          content: 'No interpreté la descripción. Necesito más detalle. Ejemplo: "almuerzo: 150g de pollo, 100g de arroz, ensalada".',
          ts: Date.now()
        }]);
      }
    } catch (e) {
      const isOverload = String(e?.message || '').includes('overloaded') || String(e?.message || '').includes('http:5');
      const msg = isOverload
        ? 'El servicio está saturado en este momento. Espera unos segundos y vuelve a intentar.'
        : 'No pude interpretar tu mensaje. Intenta describirlo con más detalle, por ejemplo: "almuerzo: 150g de pollo y 100g de arroz".';
      setMessages(m => [...m, { role: 'assistant', content: msg, ts: Date.now() }]);
    }

    setLoading(false); setLoadingPreview('');
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta dictado por voz. Usa Chrome o Safari.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CO';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => { setRecording(true); haptic(15); };
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => setRecording(false);
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      setInput((finalTranscript + interimTranscript).trim());
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) { setRecording(false); }
  };

  const stopVoice = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setRecording(false);
    haptic(10);
  };

  const deleteEntry = (id) => {
    haptic(10);
    setEntries(e => e.filter(x => x.id !== id));
    setEditingEntry(null);
  };

  const addToFavorites = (entry) => {
    haptic(15);
    const fav = {
      id: Date.now(),
      name: entry.items.map(i => i.name).join(', ').slice(0, 60),
      items: entry.items,
      kcal: entry.kcal, p: entry.p, c: entry.c, g: entry.g,
      meal: entry.meal
    };
    setFavorites(f => [...f, fav]);
  };

  const useFavorite = (fav) => {
    haptic(12);
    const newEntry = {
      id: Date.now(),
      meal: predictMealType(),
      items: fav.items,
      kcal: fav.kcal, p: fav.p, c: fav.c, g: fav.g,
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      rawInput: fav.name
    };
    setEntries(e => [...e, newEntry]);
    setMessages(m => [...m, { role: 'assistant', content: 'logged', isLogged: true, entryId: newEntry.id, ts: Date.now() }]);
    setActiveModal(null);
  };

  if (view === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG, fontFamily: FONT_UI }}>
        <Loader2 className="animate-spin" style={{ color: ACCENT }} size={28} />
      </div>
    );
  }

  if (view === 'welcome') {
    return <Welcome
      onContinue={() => setView('onboarding')}
      onTutorial={() => setShowTutorial(true)}
      tutorialOpen={showTutorial}
      onCloseTutorial={() => setShowTutorial(false)} />;
  }

  if (view === 'onboarding') {
    return <Onboarding onComplete={async (g, n) => {
      setGoals(g);
      if (n) setName(n);
      await window.storage.set('goals', JSON.stringify(g));
      if (n) await window.storage.set('name', JSON.stringify(n));
      setView('main');
      setMessages([{
        role: 'assistant',
        content: n ? `${n.split(' ')[0]}. Metas registradas. Empezamos.` : 'Metas registradas. Empezamos.',
        isWelcomeHints: true,
        ts: Date.now()
      }]);
    }} existingGoals={goals} existingName={name} />;
  }

  const predictedMeal = predictMealType();

  return (
    <div className="min-h-screen relative" style={{ background: '#F9F7F1', color: TEXT, fontFamily: FONT_UI }}>
      {/* Organic cream blobs — only on main screen */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="main-blob-1 absolute" style={{
          top: '-10%', left: '-15%', width: '70%', height: '55%',
          background: 'radial-gradient(circle, rgba(245,240,225,0.95), transparent 65%)',
          filter: 'blur(60px)'
        }} />
        <div className="main-blob-2 absolute" style={{
          top: '30%', right: '-20%', width: '65%', height: '60%',
          background: 'radial-gradient(circle, rgba(220,225,230,0.4), transparent 65%)',
          filter: 'blur(70px)'
        }} />
        <div className="main-blob-3 absolute" style={{
          bottom: '-10%', left: '20%', width: '75%', height: '55%',
          background: 'radial-gradient(circle, rgba(250,247,240,0.95), transparent 60%)',
          filter: 'blur(65px)'
        }} />
        <div className="main-blob-4 absolute" style={{
          top: '50%', left: '10%', width: '55%', height: '45%',
          background: 'radial-gradient(circle, rgba(200,208,174,0.18), transparent 70%)',
          filter: 'blur(80px)'
        }} />
      </div>
      <FontStyles />

      <style>{`
        .num { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 3px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseRing { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes float1 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(30px, -20px) scale(1.05); } }
        @keyframes float2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-25px, 30px) scale(1.08); } }
        @keyframes float3 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(20px, 25px) scale(1.04); } }
        @keyframes mainBlob1 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(50px, -30px) scale(1.1); } }
        @keyframes mainBlob2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-40px, 40px) scale(1.08); } }
        @keyframes mainBlob3 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(30px, 20px) scale(1.12); } }
        @keyframes mainBlob4 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-25px, -35px) scale(1.06); } }
        .main-blob-1 { animation: mainBlob1 22s ease-in-out infinite; }
        .main-blob-2 { animation: mainBlob2 26s ease-in-out infinite; }
        .main-blob-3 { animation: mainBlob3 20s ease-in-out infinite; }
        .main-blob-4 { animation: mainBlob4 24s ease-in-out infinite; }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .sheet-up { animation: sheetUp 0.32s cubic-bezier(0.2, 0, 0, 1); }
        .fade-up { animation: fadeUp 0.45s cubic-bezier(0.2, 0, 0, 1); }
        .pulse-ring { animation: pulseRing 1.5s ease-in-out infinite; }
        .shimmer-text {
          background: linear-gradient(90deg, ${TEXT_MUTED} 0%, ${ACCENT} 50%, ${TEXT_MUTED} 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          animation: shimmer 2s linear infinite;
        }
        .blob-1 { animation: float1 18s ease-in-out infinite; }
        .blob-2 { animation: float2 22s ease-in-out infinite; }
        .blob-3 { animation: float3 25s ease-in-out infinite; }
        .glass-card {
          background: ${GLASS_BG};
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          border: 1px solid ${GLASS_BORDER};
          box-shadow: ${GLASS_SHADOW};
        }
        .glass-card-strong {
          background: ${GLASS_BG_STRONG};
          backdrop-filter: blur(32px) saturate(200%);
          -webkit-backdrop-filter: blur(32px) saturate(200%);
          border: 1px solid ${GLASS_BORDER};
          box-shadow: ${GLASS_SHADOW};
        }
        input, textarea, select {
          font-size: 16px !important;
          -webkit-text-size-adjust: 100%;
          -webkit-appearance: none;
          appearance: none;
          touch-action: manipulation;
        }
        html, body {
          -webkit-text-size-adjust: 100%;
          touch-action: manipulation;
          overscroll-behavior: none;
        }
      `}</style>

      {/* Background blobs removed for cleaner look */}

      <div className="relative max-w-2xl mx-auto px-5 pt-5 pb-32" style={{ zIndex: 1 }}>

        {/* Header — slim app-style bar */}
        <div className="rounded-2xl px-4 py-3 mb-3 relative overflow-hidden" style={{
          background: '#0E0E0E',
          color: '#FFF',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)'
        }}>
          <div className="absolute inset-0 pointer-events-none opacity-40" style={{
            background: `radial-gradient(circle at 90% 30%, ${ACCENT}40, transparent 55%)`
          }} />
          <div className="relative">
            <div className="display font-normal" style={{
              color: '#FFF',
              fontSize: '24px',
              lineHeight: 1,
              letterSpacing: '0.03em',
              textTransform: 'uppercase'
            }}>
              Meal Tracker
            </div>
            <div className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.01em', lineHeight: 1.4 }}>
              <span style={{ color: ACCENT_PASTEL, fontWeight: 600 }}>Entrena con Método</span>
              {' · '}
              <span>Mauro Morón · ISSA Certified Fitness and Nutrition Coach</span>
            </div>
          </div>
        </div>

        {/* Goals card — sticky white glass with organic touch */}
        <div className="sticky top-0 z-30 -mx-5 px-5 pt-2 pb-3" style={{
          background: 'linear-gradient(180deg, #F9F7F1 0%, rgba(249,247,241,0.92) 80%, rgba(249,247,241,0.6) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
        <div className="px-4 py-4 rounded-3xl relative" style={{
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset, 0 8px 28px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}>
          {/* Subtle organic blob inside the card */}
          <div className="absolute pointer-events-none" style={{
            top: '-30%', right: '-20%', width: '60%', height: '120%',
            background: `radial-gradient(circle, ${ACCENT_PASTEL}30, transparent 65%)`,
            filter: 'blur(40px)'
          }} />
          <div className="relative">
          <button
            onClick={() => { haptic(8); setView('onboarding'); }}
            className="absolute top-0 right-0 flex items-center gap-1 px-2.5 py-1 rounded-full transition active:scale-95"
            style={{
              color: TEXT_MUTED,
              background: 'rgba(255,255,255,0.85)',
              border: `1px solid rgba(0,0,0,0.06)`
            }}
            title="Cambiar meta nutricional">
            <Sliders size={10} />
            <span className="text-[9px] font-semibold">Cambiar meta</span>
          </button>

          <div className="text-center mb-3">
            <div className="text-[11px] tracking-[0.22em] uppercase font-semibold" style={{ color: TEXT_LIGHT }}>
              Hoy · <span className="capitalize" style={{ color: TEXT_MUTED }}>{formatDate(today)}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1">
            <GlassRing val={totals.kcal} goal={goals.kcal} color={ACCENT} label="Calorías" unit="" />
            <GlassRing val={totals.p} goal={goals.p} color={C_PROTEIN} label="Proteína" unit="g" />
            <GlassRing val={totals.c} goal={goals.c} color={C_CARBS} label="Carbos" unit="g" />
            <GlassRing val={totals.g} goal={goals.g} color={C_FAT} label="Grasas" unit="g" />
          </div>
          </div>
        </div>
        </div>

        {/* Action chips — collapsible glass */}
        {/* Ver acciones — fixed button that opens bottom sheet */}
        <div className="flex justify-center mb-3 mt-1">
          <button
            onClick={() => { haptic(8); setActionsExpanded(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl transition active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: `1px solid rgba(0,0,0,0.06)`,
              color: TEXT,
              boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset, 0 4px 14px rgba(0,0,0,0.06)'
            }}>
            <Sparkles size={14} strokeWidth={1.8} style={{ color: ACCENT }} />
            <span className="text-[13px] font-semibold">Ver acciones</span>
            <ChevronUp size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Bottom sheet — actions */}
        {actionsExpanded && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={() => { haptic(6); setActionsExpanded(false); }}>
            <div
              className="w-full max-w-md rounded-t-3xl px-5 pt-3 sheet-up"
              style={{
                background: '#F9F7F1',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
                paddingBottom: '40px'
              }}
              onClick={(e) => e.stopPropagation()}>
              {/* Grabber */}
              <div className="flex justify-center mb-4">
                <div className="h-1 w-10 rounded-full" style={{ background: BORDER }} />
              </div>
              <div className="flex items-center justify-between mb-4 px-1">
                <div>
                  <div className="text-[11px] tracking-[0.22em] uppercase font-semibold" style={{ color: ACCENT }}>Acciones</div>
                  <div className="text-[17px] font-bold" style={{ color: TEXT, letterSpacing: '-0.01em' }}>¿Qué quieres hacer?</div>
                </div>
                <button onClick={() => { haptic(6); setActionsExpanded(false); }}
                  className="p-2 rounded-full transition active:scale-90" style={{ background: SURFACE_2 }}>
                  <X size={16} style={{ color: TEXT_MUTED }} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <ActionChipMini icon={<PieChart size={19} strokeWidth={1.75} />} label="Ayuda con proporciones" pastel={C_PROTEIN_PASTEL} color={C_PROTEIN}
                  onClick={() => { haptic(8); setInput('Ayúdame con proporciones, tengo: '); setActionsExpanded(false); }} />
                <ActionChipMini icon={<Star size={19} strokeWidth={1.75} />} label="Menús favoritos" pastel={C_CARBS_PASTEL} color={C_CARBS}
                  onClick={() => { haptic(8); setActiveModal('favorites'); setActionsExpanded(false); }} />
                <ActionChipMini icon={<Calendar size={19} strokeWidth={1.75} />} label="Calendario" pastel={ACCENT_PASTEL} color={ACCENT}
                  onClick={() => { haptic(8); setActiveModal('calendar'); setActionsExpanded(false); }} />
                <ActionChipMini icon={<LineChart size={19} strokeWidth={1.75} />} label="Resumen del día" pastel={C_FAT_PASTEL} color={C_FAT}
                  onClick={() => { haptic(8); handleSend('ver resumen diario'); setActionsExpanded(false); }} />
                <ActionChipMini icon={<FileText size={19} strokeWidth={1.75} />} label="Descargar reporte al coach" pastel={ACCENT_PASTEL} color={ACCENT_DARK}
                  onClick={() => { haptic(8); setActiveModal('export'); setActionsExpanded(false); }} />
                <ActionChipMini icon={<RotateCcw size={19} strokeWidth={1.75} />} label="Reiniciar día" pastel="#E5E2D5" color={TEXT_MUTED}
                  onClick={() => { haptic(8); setActiveModal('reset'); setActionsExpanded(false); }} />
              </div>
            </div>
          </div>
        )}

        {/* Chat — sin wrapper, flota sobre el fondo general crema con blobs */}
        <div ref={scrollRef} className="space-y-3 mb-6 relative" style={{ paddingBottom: keyboardOpen ? '120px' : '20px' }}>
          {/* Editorial hand-drawn food silhouettes — thin organic lines */}
          <div className="absolute inset-0 pointer-events-none select-none" style={{
            backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='280' height='280' viewBox='0 0 280 280'>
              <g fill='none' stroke='%237A8450' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' stroke-opacity='0.28'>
                <!-- Aguacate (rotated 12deg) -->
                <g transform='translate(28,30) rotate(12)'>
                  <path d='M0,18 C0,7 8,0 16,0 C24,0 32,7 32,18 C32,32 24,42 16,42 C8,42 0,32 0,18 Z'/>
                  <ellipse cx='16' cy='22' rx='8' ry='9'/>
                </g>
                <!-- Connector curve -->
                <path d='M75,38 Q92,30 105,42' stroke-opacity='0.18'/>
                <!-- Plátano (rotated -18deg) -->
                <g transform='translate(108,22) rotate(-18)'>
                  <path d='M2,6 C12,0 28,2 38,12 C42,16 44,22 40,26 C36,22 28,18 20,18 C12,18 6,22 0,22 C-2,18 -2,10 2,6 Z'/>
                  <path d='M2,6 L0,2'/>
                </g>
                <!-- Zanahoria (rotated 35deg) -->
                <g transform='translate(195,30) rotate(35)'>
                  <path d='M16,12 L24,12 L14,50 L4,50 L0,16 L4,14 Z'/>
                  <path d='M10,12 L7,2 M14,12 L15,0 M18,12 L22,3'/>
                </g>
                <!-- Big connector curve between rows -->
                <path d='M40,90 Q90,75 140,95 T240,88' stroke-opacity='0.14'/>
                <!-- Pescado (rotated -8deg) -->
                <g transform='translate(22,105) rotate(-8)'>
                  <path d='M0,16 C5,4 22,2 34,10 C40,14 40,22 34,26 C22,32 5,30 0,16 Z'/>
                  <path d='M34,10 L44,2 L44,26 L34,26'/>
                  <circle cx='26' cy='14' r='1.5'/>
                </g>
                <!-- Manzana (rotated 8deg) -->
                <g transform='translate(105,108) rotate(8)'>
                  <path d='M6,12 C2,18 0,30 6,38 C10,44 16,46 22,42 C28,46 34,44 38,38 C44,30 42,18 38,12 C32,6 24,8 22,12 C20,8 12,6 6,12 Z'/>
                  <path d='M22,12 C22,6 26,2 30,4'/>
                  <path d='M28,2 L30,0'/>
                </g>
                <!-- Brócoli (rotated 22deg) -->
                <g transform='translate(195,108) rotate(22)'>
                  <circle cx='10' cy='10' r='8'/>
                  <circle cx='24' cy='8' r='8'/>
                  <circle cx='17' cy='20' r='8'/>
                  <path d='M17,28 L17,42 M14,38 L20,38'/>
                </g>
                <!-- Curved swirl between groups -->
                <path d='M50,180 C70,170 80,195 100,185' stroke-opacity='0.18'/>
                <path d='M180,180 Q200,170 220,185' stroke-opacity='0.18'/>
                <!-- Tenedor + Cuchara (rotated -12deg) -->
                <g transform='translate(28,195) rotate(-12)'>
                  <path d='M0,0 L0,14 M4,0 L4,14 M8,0 L8,14 M12,0 L12,14 M0,14 L12,14 L8,42 L4,42 Z'/>
                  <path d='M24,4 C18,8 18,18 24,22 L24,42 L30,42 L30,22 C36,18 36,8 30,4 C28,2 26,2 24,4 Z'/>
                </g>
                <!-- Huevo (rotated 5deg) -->
                <g transform='translate(115,200) rotate(5)'>
                  <ellipse cx='14' cy='20' rx='12' ry='18'/>
                </g>
                <!-- Pollo / muslo (rotated -25deg) -->
                <g transform='translate(195,200) rotate(-25)'>
                  <path d='M10,4 C2,6 -2,16 4,22 C10,28 22,28 28,22 L40,34 L34,40 L22,28 C28,24 30,14 24,8 C20,4 14,2 10,4 Z'/>
                  <circle cx='14' cy='14' r='1' fill='%237A8450' fill-opacity='0.4' stroke='none'/>
                </g>
                <!-- Final loose squiggles for organic feel -->
                <path d='M60,260 Q80,250 100,262' stroke-opacity='0.16'/>
                <path d='M170,255 C185,250 200,265 215,258' stroke-opacity='0.16'/>
              </g>
            </svg>`)}")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '280px 280px'
          }} />
          <div className="relative">
            {messages.map((m, i) => (
              <div key={i} className="mb-3">
                <MessageBubble message={m} goals={goals} totals={totals}
                  entries={entries}
                  historyDetail={historyDetail}
                  onEdit={(id) => { haptic(8); setEditingEntry(id); }}
                  onDelete={deleteEntry}
                  onFavorite={addToFavorites} />
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm px-4 py-3">
                <Loader2 size={14} className="animate-spin" style={{ color: ACCENT }} />
                <span className="shimmer-text font-medium">{loadingPreview || 'Procesando…'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-5 pt-6 z-40" style={{
        background: `linear-gradient(180deg, transparent, ${BG}E6 30%, ${BG} 100%)`,
        display: actionsExpanded ? 'none' : 'block'
      }}>
        <div className="max-w-2xl mx-auto">
          {input.trim() && !input.toLowerCase().match(/desayuno|almuerzo|cena|snack|reiniciar|cambiar|resumen|semanal|calendario|exportar|favoritos|proporciones|agua|cuántas|cuanto|cuánto/) && (
            <div className="text-[10px] text-center mb-2 px-3 py-1 rounded-full inline-block" style={{
              background: ACCENT_PASTEL + '60', color: ACCENT_DARK, fontWeight: 500
            }}>
              → se registrará como {predictedMeal}
            </div>
          )}
          <div className="flex items-center gap-2 p-2 rounded-2xl" style={{
            background: SURFACE,
            border: `1px solid ${recording ? C_PROTEIN : BORDER}`,
            boxShadow: recording ? `0 0 0 3px ${C_PROTEIN}25, 0 8px 32px rgba(0,0,0,0.08)` : '0 8px 32px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
            transition: 'border 0.2s, box-shadow 0.2s'
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onFocus={() => setActionsExpanded(false)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), e.target.blur(), handleSend())}
              placeholder={recording ? 'Escuchando…' : 'Escribe o dicta lo que comiste…'}
              className="flex-1 bg-transparent px-3 py-3 outline-none"
              style={{ color: TEXT, fontSize: '16px' }}
              readOnly={recording}
            />
            <button
              onClick={recording ? stopVoice : startVoice}
              className="p-3 rounded-xl transition active:scale-[0.95]"
              style={{
                background: recording ? C_PROTEIN : SURFACE_2,
                color: recording ? '#fff' : TEXT_MUTED,
                transition: 'background 0.2s'
              }}
              title={recording ? 'Detener dictado' : 'Dictar por voz'}>
              <Mic size={16} strokeWidth={2} className={recording ? 'pulse-ring' : ''} />
            </button>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading || recording}
              className="p-3 rounded-xl transition disabled:opacity-30 active:scale-[0.95]"
              style={{ background: '#0E0E0E', color: '#fff' }}>
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {activeModal === 'reset' && (
        <ConfirmModal
          title="Reiniciar el día"
          body="Se borra el registro de hoy. La acción es definitiva."
          confirmLabel="Sí, reiniciar"
          onConfirm={() => {
            haptic([15, 30, 15]);
            setEntries([]); setWater(0); setPerfectDayShown(false);
            setActiveModal(null);
            setMessages(m => [...m, { role: 'assistant', content: 'Limpio. Empezamos de nuevo.', ts: Date.now() }]);
          }}
          onCancel={() => setActiveModal(null)} />
      )}

      {activeModal === 'weekly' && (
        <WeeklyModal history={history} goals={goals} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'calendar' && (
        <CalendarModal
          history={history} historyDetail={historyDetail} goals={goals}
          today={today} todayEntries={entries} todayWater={water}
          onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'favorites' && (
        <FavoritesModal
          favorites={favorites}
          onUse={useFavorite}
          onDelete={(id) => { haptic(10); setFavorites(f => f.filter(x => x.id !== id)); }}
          onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'export' && (
        <ExportModal
          name={name} goals={goals} history={history} historyDetail={historyDetail}
          today={today} todayEntries={entries} todayWater={water}
          onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'perfect' && (
        <PerfectDayModal
          name={name} totals={totals} goals={goals}
          onClose={() => setActiveModal(null)} />
      )}

      {editingEntry !== null && (
        <EditEntryModal
          entry={entries.find(e => e.id === editingEntry)}
          onSave={(updated) => {
            haptic(12);
            setEntries(es => es.map(e => e.id === editingEntry ? updated : e));
            setEditingEntry(null);
          }}
          onDelete={() => deleteEntry(editingEntry)}
          onClose={() => setEditingEntry(null)} />
      )}
    </div>
  );
}

function composeDayOpening(name, yesterday, goals) {
  const firstName = name ? name.split(' ')[0] : '';
  const intro = firstName ? `${firstName}. ` : '';
  if (!yesterday || !goals) return `${intro}Día nuevo. La primera comida la marco como desayuno.`;

  const tolerance = 0.05;
  const inRange = (val, goal) => val >= goal * (1 - tolerance) && val <= goal * (1 + tolerance);
  const pDiff = goals.p - yesterday.p;
  const cDiff = goals.c - yesterday.c;
  const gDiff = goals.g - yesterday.g;

  if (inRange(yesterday.kcal, goals.kcal) && inRange(yesterday.p, goals.p) &&
      inRange(yesterday.c, goals.c) && inRange(yesterday.g, goals.g)) {
    return `${intro}Ayer cerraste con precisión en las cuatro metas. Hoy seguimos.`;
  }

  const offBy = [
    { name: 'proteína', diff: pDiff, abs: Math.abs(pDiff), unit: 'g' },
    { name: 'carbohidratos', diff: cDiff, abs: Math.abs(cDiff), unit: 'g' },
    { name: 'grasas', diff: gDiff, abs: Math.abs(gDiff), unit: 'g' },
  ].sort((a, b) => b.abs - a.abs)[0];

  if (yesterday.kcal === 0) return `${intro}Ayer no hubo registro. Empezamos.`;
  if (offBy.abs < 10) return `${intro}Ayer cerraste cerca de las metas. Hoy ajustamos los detalles.`;

  if (offBy.diff > 0) return `${intro}Ayer cerraste con ${offBy.name} bajo por ${offBy.abs}${offBy.unit}. Hoy podemos compensar desde el desayuno.`;
  return `${intro}Ayer cerraste con ${offBy.name} ${offBy.abs}${offBy.unit} por encima. Hoy moderamos.`;
}

function FontStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Bebas+Neue&display=swap');
      body, * { font-family: ${FONT_UI}; -webkit-font-smoothing: antialiased; }
      .display { font-family: ${FONT_DISPLAY}; letter-spacing: 0.01em; }
    `}</style>
  );
}

function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatDateShort(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

// True Apple-style glass ring — the chart is the focal element
function GlassRing({ val, goal, color, label, unit = 'g' }) {
  const size = 76;
  const stroke = 8;
  const center = size / 2;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(1, val / goal);
  const dash = circ * pct;
  const isComplete = val >= goal * 0.95 && val <= goal * 1.05;
  const ringId = `ring-${label}-${color.replace('#', '')}`;
  const [popped, setPopped] = useState(false);
  const prevVal = useRef(val);

  useEffect(() => {
    if (prevVal.current !== val) {
      setPopped(true);
      const t = setTimeout(() => setPopped(false), 360);
      prevVal.current = val;
      return () => clearTimeout(t);
    }
  }, [val]);

  // Darker shade for gradient start (Apple Activity style)
  const darkenColor = (hex, amount = 30) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - amount);
    const g = Math.max(0, ((num >> 8) & 0xff) - amount);
    const b = Math.max(0, (num & 0xff) - amount);
    return `rgb(${r},${g},${b})`;
  };
  const colorDark = darkenColor(color, 35);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size}>
          <defs>
            <linearGradient id={ringId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorDark} />
              <stop offset="50%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity="0.85" />
            </linearGradient>
            <filter id={`${ringId}-glow`}>
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Track (background) */}
          <circle cx={center} cy={center} r={radius}
            fill="none"
            stroke={color}
            strokeOpacity="0.12"
            strokeWidth={stroke} />
          {/* Progress with gradient */}
          <g transform={`rotate(-90 ${center} ${center})`}>
            <circle cx={center} cy={center} r={radius}
              fill="none"
              stroke={`url(#${ringId})`}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              filter={isComplete ? `url(#${ringId}-glow)` : undefined}
              style={{
                transition: 'stroke-dasharray 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }} />
          </g>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[16px] font-bold num" style={{
            color: TEXT, lineHeight: 1, letterSpacing: '-0.02em',
            transform: popped ? 'scale(1.18)' : 'scale(1)',
            transition: 'transform 0.36s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {Math.round(val)}
          </div>
          <div className="text-[9px] num mt-0.5 font-semibold" style={{ color: TEXT_LIGHT }}>
            /{goal}{unit}
          </div>
        </div>
      </div>
      <div className="text-[11px] uppercase tracking-wider mt-2 font-bold" style={{ color: TEXT_MUTED, letterSpacing: '0.08em' }}>
        {label}
      </div>
    </div>
  );
}


function ActionChipMini({ icon, label, color, pastel, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 px-3.5 py-3.5 rounded-2xl transition active:scale-[0.97]"
      style={{
        background: 'rgba(255,255,255,0.7)',
        border: `1px solid rgba(0,0,0,0.05)`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        transitionDuration: '0.18s'
      }}>
      <div className="shrink-0" style={{ color: TEXT }}>
        {icon}
      </div>
      <div className="text-[12.5px] font-medium leading-tight text-left" style={{ color: TEXT }}>{label}</div>
    </button>
  );
}

function DaySeparator({ date }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px" style={{ background: BORDER }} />
      <div className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold uppercase tracking-wider capitalize" style={{
        background: ACCENT_PASTEL + '60', color: ACCENT_DARK, letterSpacing: '0.05em'
      }}>
        {formatDate(date)}
      </div>
      <div className="flex-1 h-px" style={{ background: BORDER }} />
    </div>
  );
}

function MessageBubble({ message, goals, totals, entries, historyDetail, onEdit, onDelete, onFavorite }) {
  if (message.isDaySeparator) return <DaySeparator date={message.date} />;

  if (message.isInfo) {
    return (
      <div className="flex justify-center fade-up">
        <div className="px-4 py-2 rounded-full text-[12px] font-medium flex items-center gap-2" style={{
          background: ACCENT_PASTEL + '50', color: ACCENT_DARK, letterSpacing: '0.01em',
        }}>
          <CheckCircle2 size={12} strokeWidth={2.2} />
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end fade-up">
        <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-md text-[15px]" style={{
          background: ACCENT_PASTEL, color: TEXT, fontWeight: 500, lineHeight: 1.4,
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)'
        }}>
          {message.content}
        </div>
      </div>
    );
  }

  if (message.isWelcomeHints) {
    return (
      <div className="flex justify-start fade-up">
        <div className="max-w-[90%] p-4 rounded-2xl rounded-bl-md text-sm" style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.7) inset'
        }}>
          <div className="mb-3" style={{ color: TEXT }}>{message.content}</div>
          <div className="space-y-2 text-xs" style={{ color: TEXT_MUTED }}>
            <div className="flex items-start gap-2">
              <Star size={11} style={{ color: C_CARBS, marginTop: 2, flexShrink: 0 }} />
              <span>Las comidas que repites guárdalas en <strong style={{ color: TEXT }}>menús favoritos</strong>.</span>
            </div>
            <div className="flex items-start gap-2">
              <Info size={11} style={{ color: ACCENT, marginTop: 2, flexShrink: 0 }} />
              <span>Pregunta macros sin registrar: <em>"¿calorías de una manzana?"</em></span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t text-[11px]" style={{ borderColor: BORDER_SOFT, color: ACCENT_DARK }}>
            👇 Escribe abajo lo que comiste, en lenguaje natural.
          </div>
        </div>
      </div>
    );
  }

  if (message.isWater) {
    return (
      <div className="flex justify-start fade-up">
        <div className="px-4 py-2.5 rounded-2xl rounded-bl-md text-sm flex items-center gap-2" style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.7) inset'
        }}>
          <Droplet size={14} style={{ color: C_WATER }} />
          <span style={{ color: TEXT }}>+{message.ml} ml registrados</span>
        </div>
      </div>
    );
  }

  if (message.isMacroQuery && message.data) {
    const d = message.data;
    return (
      <div className="flex justify-start fade-up">
        <div className="max-w-[85%] p-4 rounded-2xl rounded-bl-md text-sm" style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.7) inset'
        }}>
          <div className="flex items-center gap-2 mb-2">
            <Info size={12} style={{ color: ACCENT }} />
            <span className="text-[11px] uppercase tracking-[0.15em] font-semibold" style={{ color: ACCENT }}>Consulta nutricional</span>
          </div>
          <div className="text-base font-semibold mb-1" style={{ color: TEXT }}>{d.food}</div>
          <div className="text-xs num mb-2" style={{ color: TEXT_LIGHT }}>{d.amount}</div>
          <div className="flex gap-3 text-xs num">
            <span style={{ color: ACCENT, fontWeight: 600 }}>{d.kcal} kcal</span>
            <span style={{ color: C_PROTEIN }}>P {d.p}g</span>
            <span style={{ color: C_CARBS }}>C {d.c}g</span>
            <span style={{ color: C_FAT }}>G {d.g}g</span>
          </div>
          <div className="mt-2 text-[10px] italic" style={{ color: TEXT_LIGHT }}>
            Consulta informativa — no se registra.
          </div>
        </div>
      </div>
    );
  }

  if (message.isLogged && message.entryId) {
    let e = entries.find(x => x.id === message.entryId);
    let isHistorical = false;
    if (!e && historyDetail) {
      for (const dayEntries of Object.values(historyDetail)) {
        const found = (dayEntries || []).find(x => x.id === message.entryId);
        if (found) { e = found; isHistorical = true; break; }
      }
    }
    if (!e) {
      // Hide orphan messages silently (no more "Comida eliminada" ghost)
      return null;
    }
    return (
      <div className="flex justify-start fade-up">
        <div className="max-w-[90%] p-4 rounded-2xl rounded-bl-md text-sm w-full" style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.7) inset'
        }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full" style={{ background: ACCENT_PASTEL + '60' }}>
                <CheckCircle2 size={11} style={{ color: ACCENT_DARK }} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] uppercase tracking-[0.15em] font-semibold" style={{ color: ACCENT_DARK }}>{e.meal}</span>
              <span className="text-[10px]" style={{ color: TEXT_LIGHT }}>{e.time}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => onFavorite(e)} className="p-1 rounded-full hover:bg-black/5 transition">
                <Star size={12} style={{ color: TEXT_LIGHT }} />
              </button>
              {!isHistorical && (
                <>
                  <button onClick={() => onEdit(e.id)} className="p-1 rounded-full hover:bg-black/5 transition">
                    <Pencil size={12} style={{ color: TEXT_LIGHT }} />
                  </button>
                  <button onClick={() => onDelete(e.id)} className="p-1 rounded-full hover:bg-black/5 transition">
                    <Trash2 size={12} style={{ color: TEXT_LIGHT }} />
                  </button>
                </>
              )}
            </div>
          </div>

          {message.quantityWarning && (
            <div className="mb-3 p-2.5 rounded-xl flex items-start gap-2 text-[11px]" style={{
              background: '#FBF1E5', color: WARN
            }}>
              <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <span>{message.quantityWarning}</span>
                <button onClick={() => onEdit(e.id)} className="ml-1 underline font-medium">Ajustar cantidad</button>
              </div>
            </div>
          )}

          <div className="space-y-1 mb-3">
            {e.items.map((it, i) => (
              <div key={i} className="text-xs flex justify-between gap-3">
                <span style={{ color: TEXT }}>
                  {it.name}{it.amount ? ` · ${it.amount}` : ''}
                  {it.needs_quantity && <span className="ml-1 text-[10px]" style={{ color: WARN }}>· estimado</span>}
                </span>
                <span className="num" style={{ color: TEXT_LIGHT }}>{it.kcal} kcal</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t" style={{ borderColor: BORDER_SOFT }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: TEXT_MUTED }}>Total comida</span>
              <span className="num font-medium" style={{ color: ACCENT_DARK }}>{e.kcal} kcal</span>
            </div>
            <div className="flex gap-3 text-[10px] mt-1 num">
              <span style={{ color: C_PROTEIN }}>P {e.p}g</span>
              <span style={{ color: C_CARBS }}>C {e.c}g</span>
              <span style={{ color: C_FAT }}>G {e.g}g</span>
            </div>
          </div>
          {!isHistorical && (
            <div className="mt-3 pt-3 border-t text-[10px] num" style={{ borderColor: BORDER_SOFT, color: TEXT_LIGHT }}>
              Acumulado: {totals.kcal}/{goals.kcal} kcal · faltan {Math.max(0, goals.kcal - totals.kcal)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.isProportion && message.data) {
    const d = message.data;
    return (
      <div className="flex justify-start fade-up">
        <div className="max-w-[90%] p-4 rounded-2xl rounded-bl-md text-sm" style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.7) inset'
        }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1 rounded-full" style={{ background: ACCENT_PASTEL + '60' }}>
              <Sparkles size={11} style={{ color: ACCENT }} />
            </div>
            <span className="text-[11px] uppercase tracking-[0.15em] font-semibold" style={{ color: ACCENT_DARK }}>Proporciones</span>
          </div>
          <div className="space-y-2 mb-3">
            {d.proportions?.map((p, i) => (
              <div key={i} className="flex justify-between gap-3 text-xs">
                <div>
                  <div style={{ color: TEXT }}>{p.name}</div>
                  <div className="text-[10px] num" style={{ color: TEXT_LIGHT }}>{p.amount}</div>
                </div>
                <div className="text-right num text-[10px]" style={{ color: TEXT_MUTED }}>
                  <div>{p.kcal} kcal</div>
                  <div>P{p.p} C{p.c} G{p.g}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t flex justify-between text-xs" style={{ borderColor: BORDER_SOFT }}>
            <span style={{ color: TEXT_MUTED }}>Total</span>
            <span className="num font-medium" style={{ color: ACCENT_DARK }}>{d.totals?.kcal} kcal</span>
          </div>
          {d.note && <div className="mt-2 text-[11px] italic" style={{ color: ACCENT_DARK }}>{d.note}</div>}
        </div>
      </div>
    );
  }

  if (message.isSummaryDetailed) {
    const dayEntries = message.entries || [];
    return (
      <div className="flex justify-start fade-up">
        <div className="max-w-[90%] p-4 rounded-2xl rounded-bl-md text-sm w-full" style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.7) inset'
        }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1 rounded-full" style={{ background: ACCENT_PASTEL + '60' }}>
              <LineChart size={11} style={{ color: ACCENT_DARK }} />
            </div>
            <span className="text-[11px] uppercase tracking-[0.15em] font-semibold" style={{ color: ACCENT_DARK }}>Detalle del día</span>
          </div>
          {dayEntries.length === 0 ? (
            <div className="text-xs italic py-2" style={{ color: TEXT_LIGHT }}>Sin comidas registradas hoy.</div>
          ) : (
            <div className="space-y-3">
              {dayEntries.map((e, i) => (
                <div key={i} className="pb-3" style={{ borderBottom: i < dayEntries.length - 1 ? `1px solid ${BORDER_SOFT}` : 'none' }}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-[11px] uppercase tracking-[0.15em] font-semibold" style={{ color: ACCENT_DARK }}>{e.meal}</span>
                    <span className="text-[10px] num" style={{ color: TEXT_LIGHT }}>{e.time}</span>
                  </div>
                  <div className="space-y-0.5 mb-1.5">
                    {e.items.map((it, j) => (
                      <div key={j} className="flex justify-between gap-2 text-xs">
                        <span style={{ color: TEXT }}>
                          {it.name}{it.amount ? ` · ${it.amount}` : ''}
                          {it.needs_quantity && <span className="ml-1 text-[10px]" style={{ color: WARN }}>· estimado</span>}
                        </span>
                        <span className="num" style={{ color: TEXT_LIGHT, flexShrink: 0 }}>{it.kcal} kcal</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 text-[10px] num">
                    <span style={{ color: ACCENT_DARK, fontWeight: 600 }}>{e.kcal} kcal</span>
                    <span style={{ color: C_PROTEIN }}>P {e.p}g</span>
                    <span style={{ color: C_CARBS }}>C {e.c}g</span>
                    <span style={{ color: C_FAT }}>G {e.g}g</span>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: TEXT_LIGHT }}>Total acumulado</div>
                <div className="space-y-1.5 text-xs">
                  <Row label="Calorías" val={`${message.totals.kcal} / ${goals.kcal}`} diff={goals.kcal - message.totals.kcal} unit="kcal" color={ACCENT} />
                  <Row label="Proteína" val={`${message.totals.p} / ${goals.p}`} diff={goals.p - message.totals.p} unit="g" color={C_PROTEIN} />
                  <Row label="Carbos" val={`${message.totals.c} / ${goals.c}`} diff={goals.c - message.totals.c} unit="g" color={C_CARBS} />
                  <Row label="Grasas" val={`${message.totals.g} / ${goals.g}`} diff={goals.g - message.totals.g} unit="g" color={C_FAT} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.isSummary) {
    return (
      <div className="flex justify-start fade-up">
        <div className="max-w-[90%] p-4 rounded-2xl rounded-bl-md text-sm" style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.7) inset'
        }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1 rounded-full" style={{ background: ACCENT_PASTEL + '60' }}>
              <LineChart size={11} style={{ color: ACCENT_DARK }} />
            </div>
            <span className="text-[11px] uppercase tracking-[0.15em] font-semibold" style={{ color: ACCENT_DARK }}>Resumen del día</span>
          </div>
          <div className="space-y-2 text-xs">
            <Row label="Calorías" val={`${totals.kcal} / ${goals.kcal}`} diff={goals.kcal - totals.kcal} unit="kcal" color={ACCENT} />
            <Row label="Proteína" val={`${totals.p} / ${goals.p}`} diff={goals.p - totals.p} unit="g" color={C_PROTEIN} />
            <Row label="Carbos" val={`${totals.c} / ${goals.c}`} diff={goals.c - totals.c} unit="g" color={C_CARBS} />
            <Row label="Grasas" val={`${totals.g} / ${goals.g}`} diff={goals.g - totals.g} unit="g" color={C_FAT} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start fade-up">
      <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-md text-[15px] whitespace-pre-wrap" style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        color: TEXT, lineHeight: 1.5,
        boxShadow: '0 1px 0.5px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.7) inset'
      }}>
        {message.content}
      </div>
    </div>
  );
}

function Row({ label, val, diff, unit, color }) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span style={{ color: TEXT_MUTED }}>{label}</span>
      </div>
      <div className="flex gap-2 items-baseline">
        <span className="num" style={{ color: TEXT }}>{val} {unit}</span>
        <span className="text-[10px] num" style={{ color: diff >= 0 ? TEXT_LIGHT : WARN }}>
          {diff >= 0 ? `−${diff}` : `+${Math.abs(diff)}`}
        </span>
      </div>
    </div>
  );
}

function ModalShell({ children, onClose, maxWidth = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{
      background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)'
    }} onClick={onClose}>
      <div className={`w-full ${maxWidth} max-h-[85vh] overflow-y-auto p-6 rounded-3xl fade-up`} style={{
        background: SURFACE, border: `1px solid ${BORDER}`, fontFamily: FONT_UI
      }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ title, body, confirmLabel, onConfirm, onCancel }) {
  return (
    <ModalShell onClose={onCancel} maxWidth="max-w-sm">
      <div className="text-lg font-bold mb-2" style={{ color: TEXT }}>{title}</div>
      <div className="text-sm mb-6" style={{ color: TEXT_MUTED }}>{body}</div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-3 rounded-full text-sm font-medium transition" style={{ background: SURFACE_2, color: TEXT }}>
          Cancelar
        </button>
        <button onClick={onConfirm} className="flex-1 py-3 rounded-full text-sm font-medium transition" style={{ background: ACCENT, color: '#fff' }}>
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

function ModalHeader({ accent, label, title, onClose }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <div className="text-[11px] tracking-[0.22em] uppercase font-semibold" style={{ color: accent }}>{label}</div>
        <div className="text-xl font-bold tracking-tight mt-0.5" style={{ color: TEXT, letterSpacing: '-0.01em' }}>{title}</div>
      </div>
      <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5">
        <X size={16} style={{ color: TEXT_MUTED }} />
      </button>
    </div>
  );
}

function WeeklyModal({ history, goals, onClose }) {
  const days = Object.entries(history).sort((a, b) => a[0].localeCompare(b[0])).slice(-7);
  const maxKcal = Math.max(goals.kcal, ...days.map(([, t]) => t.kcal || 0), 1);
  return (
    <ModalShell onClose={onClose}>
      <ModalHeader accent={ACCENT} label="Resumen" title="Últimos 7 días" onClose={onClose} />
      {days.length === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: TEXT_MUTED }}>
          Sin datos históricos.<br />
          <span className="text-xs" style={{ color: TEXT_LIGHT }}>Los días se archivan al cambiar la fecha.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {days.map(([date, t]) => {
            const pct = (t.kcal / maxKcal) * 100;
            return (
              <div key={date}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="capitalize font-medium" style={{ color: TEXT }}>{formatDateShort(date)}</span>
                  <span className="num" style={{ color: TEXT_MUTED }}>{t.kcal} kcal</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: BORDER_SOFT }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ACCENT }} />
                </div>
                <div className="flex gap-3 mt-1 text-[10px] num">
                  <span style={{ color: C_PROTEIN }}>P {t.p}g</span>
                  <span style={{ color: C_CARBS }}>C {t.c}g</span>
                  <span style={{ color: C_FAT }}>G {t.g}g</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
}

function CalendarModal({ history, historyDetail, goals, today, todayEntries, todayWater, onClose }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(today);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = viewDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  const allHistory = { ...history };
  if (todayEntries.length > 0) {
    const totals = todayEntries.reduce((acc, e) => ({
      kcal: acc.kcal + e.kcal, p: acc.p + e.p, c: acc.c + e.c, g: acc.g + e.g
    }), { kcal: 0, p: 0, c: 0, g: 0 });
    allHistory[today] = { ...totals, water: todayWater };
  }
  const allHistoryDetail = { ...historyDetail };
  if (todayEntries.length > 0) allHistoryDetail[today] = todayEntries;

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateStr, data: allHistory[dateStr] });
  }

  const selectedData = allHistory[selectedDate];
  const selectedEntries = allHistoryDetail[selectedDate] || [];

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg">
      <ModalHeader accent={ACCENT} label="Calendario" title={monthName.charAt(0).toUpperCase() + monthName.slice(1)} onClose={onClose} />

      <div className="flex justify-between mb-3">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-2 rounded-full hover:bg-black/5">
          <ChevronLeft size={16} style={{ color: TEXT_MUTED }} />
        </button>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-2 rounded-full hover:bg-black/5">
          <ChevronRight size={16} style={{ color: TEXT_MUTED }} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-3">
        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold uppercase" style={{ color: TEXT_LIGHT }}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-5">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const isSelected = cell.dateStr === selectedDate;
          const isToday = cell.dateStr === today;
          const hasData = !!cell.data;
          const goalPct = hasData ? cell.data.kcal / goals.kcal : 0;
          return (
            <button key={i} onClick={() => setSelectedDate(cell.dateStr)}
              className="aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition relative"
              style={{
                background: isSelected ? ACCENT : (hasData ? ACCENT_PASTEL + '40' : 'transparent'),
                color: isSelected ? '#fff' : TEXT,
                border: isToday && !isSelected ? `1.5px solid ${ACCENT}` : 'none',
                fontWeight: isToday || isSelected ? 600 : 400
              }}>
              <span>{cell.day}</span>
              {hasData && !isSelected && (
                <div className="w-1 h-1 rounded-full mt-0.5" style={{
                  background: goalPct >= 0.95 && goalPct <= 1.05 ? SUCCESS : ACCENT
                }} />
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-4 border-t" style={{ borderColor: BORDER_SOFT }}>
        <div className="text-xs font-semibold mb-3 capitalize" style={{ color: TEXT }}>
          {formatDate(selectedDate)}
        </div>
        {selectedData ? (
          <>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <Stat label="kcal" val={selectedData.kcal} goal={goals.kcal} color={ACCENT} />
              <Stat label="P" val={selectedData.p} goal={goals.p} color={C_PROTEIN} unit="g" />
              <Stat label="C" val={selectedData.c} goal={goals.c} color={C_CARBS} unit="g" />
              <Stat label="G" val={selectedData.g} goal={goals.g} color={C_FAT} unit="g" />
            </div>
            {selectedEntries.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: TEXT_LIGHT }}>
                  Comidas del día
                </div>
                {selectedEntries.map((e, i) => (
                  <div key={i} className="text-xs p-3 rounded-xl" style={{ background: SURFACE_2 }}>
                    <div className="flex justify-between mb-1.5">
                      <span className="uppercase text-[9px] font-semibold tracking-wider" style={{ color: ACCENT_DARK }}>{e.meal}</span>
                      <span className="num text-[10px]" style={{ color: TEXT_LIGHT }}>{e.time}</span>
                    </div>
                    <div className="space-y-0.5">
                      {e.items.map((it, j) => (
                        <div key={j} className="flex justify-between text-[11px]">
                          <span style={{ color: TEXT }}>{it.name}{it.amount ? ` · ${it.amount}` : ''}</span>
                          <span className="num" style={{ color: TEXT_LIGHT }}>{it.kcal} kcal</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] num mt-1.5 pt-1.5 border-t flex gap-3" style={{ borderColor: BORDER_SOFT }}>
                      <span style={{ color: ACCENT_DARK, fontWeight: 600 }}>{e.kcal} kcal</span>
                      <span style={{ color: C_PROTEIN }}>P{e.p}</span>
                      <span style={{ color: C_CARBS }}>C{e.c}</span>
                      <span style={{ color: C_FAT }}>G{e.g}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-center py-4" style={{ color: TEXT_LIGHT }}>Sin registro este día.</div>
        )}
      </div>
    </ModalShell>
  );
}

function Stat({ label, val, goal, color, unit = '' }) {
  return (
    <div className="text-center p-2 rounded-xl" style={{ background: SURFACE_2 }}>
      <div className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: TEXT_LIGHT }}>{label}</div>
      <div className="text-sm font-medium num mt-0.5" style={{ color }}>{val}{unit}</div>
      <div className="text-[9px] num" style={{ color: TEXT_LIGHT }}>de {goal}{unit}</div>
    </div>
  );
}

function FavoritesModal({ favorites, onUse, onDelete, onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <ModalHeader accent={C_CARBS} label="Favoritos" title="Menús favoritos" onClose={onClose} />
      {favorites.length === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: TEXT_MUTED }}>
          Aún sin menús guardados.<br />
          <span className="text-xs" style={{ color: TEXT_LIGHT }}>
            Toca la estrella en cualquier comida para guardarla.
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {favorites.map((f) => (
            <div key={f.id} className="p-3 rounded-2xl flex items-center gap-3" style={{
              background: SURFACE_2, border: `1px solid ${BORDER_SOFT}`
            }}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: TEXT }}>{f.name}</div>
                <div className="text-[10px] num" style={{ color: TEXT_LIGHT }}>
                  {f.kcal} kcal · P{f.p} C{f.c} G{f.g}
                </div>
              </div>
              <button onClick={() => onUse(f)} className="px-3 py-1.5 rounded-full text-xs font-medium transition hover:scale-105"
                style={{ background: ACCENT, color: '#fff' }}>
                Usar
              </button>
              <button onClick={() => onDelete(f.id)} className="p-1.5 rounded-full hover:bg-black/5 transition">
                <Trash2 size={12} style={{ color: TEXT_LIGHT }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function ExportModal({ name, goals, history, historyDetail, today, todayEntries, todayWater, onClose }) {
  const [days, setDays] = useState(7);
  const [generating, setGenerating] = useState(false);

  const allHistory = { ...history };
  const allHistoryDetail = { ...historyDetail };
  if (todayEntries.length > 0) {
    const totals = todayEntries.reduce((acc, e) => ({
      kcal: acc.kcal + e.kcal, p: acc.p + e.p, c: acc.c + e.c, g: acc.g + e.g
    }), { kcal: 0, p: 0, c: 0, g: 0 });
    allHistory[today] = { ...totals, water: todayWater };
    allHistoryDetail[today] = todayEntries;
  }
  const sortedDates = Object.keys(allHistory).sort().slice(-days);

  const loadJsPDF = () => {
    return new Promise((resolve, reject) => {
      if (window.jspdf) return resolve(window.jspdf);
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => resolve(window.jspdf);
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const generateAndDownload = async () => {
    setGenerating(true);
    haptic(15);
    try {
      const { jsPDF } = await loadJsPDF();
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const margin = 15;
      let y = margin;

      const checkPage = (needed) => {
        if (y + needed > pageH - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const hexToRgb = (hex) => {
        const n = parseInt(hex.replace('#', ''), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      };

      // Header
      doc.setFillColor(14, 14, 14);
      doc.rect(0, 0, pageW, 38, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('MEAL TRACKER', margin, 18);
      doc.setFontSize(9);
      doc.setTextColor(...hexToRgb(ACCENT_PASTEL));
      doc.text('ENTRENA CON MÉTODO', margin, 25);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Mauro Morón · ISSA Certified Fitness and Nutrition Coach', margin, 31);
      y = 50;

      // Meta info
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const metaLine = `${name ? `Cliente: ${name}  ·  ` : ''}Periodo: ${days} días  ·  Generado: ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      doc.text(metaLine, margin, y);
      y += 10;

      // Goals card
      doc.setFillColor(245, 246, 238);
      doc.roundedRect(margin, y, pageW - margin * 2, 22, 3, 3, 'F');
      doc.setTextColor(...hexToRgb(ACCENT_DARK));
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('METAS DIARIAS', margin + 5, y + 6);
      const goalCols = [
        { label: 'Calorías', val: `${goals.kcal}`, unit: 'kcal', color: ACCENT },
        { label: 'Proteína', val: `${goals.p}g`, unit: '', color: C_PROTEIN },
        { label: 'Carbohidratos', val: `${goals.c}g`, unit: '', color: C_CARBS },
        { label: 'Grasas', val: `${goals.g}g`, unit: '', color: C_FAT },
      ];
      goalCols.forEach((g, i) => {
        const colX = margin + 5 + i * 45;
        doc.setTextColor(...hexToRgb(g.color));
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(g.val, colX, y + 14);
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(g.label, colX, y + 19);
      });
      y += 30;

      // Days
      sortedDates.forEach(date => {
        const t = allHistory[date];
        const entriesD = allHistoryDetail[date] || [];
        const isPerfect = t.kcal >= goals.kcal * 0.95 && t.kcal <= goals.kcal * 1.05 &&
                          t.p >= goals.p * 0.95 && t.p <= goals.p * 1.05 &&
                          t.c >= goals.c * 0.95 && t.c <= goals.c * 1.05 &&
                          t.g >= goals.g * 0.95 && t.g <= goals.g * 1.05;
        const dateFormatted = formatDate(date);
        const estimatedHeight = 18 + entriesD.reduce((sum, e) => sum + 7 + (e.items.length * 4), 0);
        checkPage(estimatedHeight);

        // Day card
        doc.setDrawColor(229, 226, 213);
        doc.setLineWidth(0.2);
        const cardStart = y;

        // Day title
        doc.setTextColor(26, 26, 26);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1), margin + 4, y + 6);

        if (isPerfect) {
          const badge = 'PRECISIÓN';
          doc.setFillColor(...hexToRgb(SUCCESS));
          const bw = doc.getTextWidth(badge) + 4;
          doc.roundedRect(pageW - margin - 4 - bw, y + 1.5, bw, 5, 1.5, 1.5, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.text(badge, pageW - margin - 4 - bw + 2, y + 5);
        }
        y += 10;

        // Day totals row
        doc.setFontSize(8);
        const totalCols = [
          { label: 'kcal', val: `${t.kcal}/${goals.kcal}`, color: ACCENT },
          { label: 'P', val: `${t.p}g/${goals.p}g`, color: C_PROTEIN },
          { label: 'C', val: `${t.c}g/${goals.c}g`, color: C_CARBS },
          { label: 'G', val: `${t.g}g/${goals.g}g`, color: C_FAT },
        ];
        totalCols.forEach((c, i) => {
          const colX = margin + 4 + i * 45;
          doc.setTextColor(...hexToRgb(c.color));
          doc.setFont('helvetica', 'bold');
          doc.text(c.label, colX, y);
          doc.setTextColor(60, 60, 60);
          doc.setFont('helvetica', 'normal');
          doc.text(c.val, colX + 8, y);
        });
        y += 5;

        // Meals
        if (entriesD.length === 0) {
          doc.setTextColor(150, 150, 150);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.text('Sin registros este día', margin + 4, y + 4);
          y += 8;
        } else {
          entriesD.forEach(e => {
            checkPage(15 + e.items.length * 4);
            doc.setDrawColor(239, 237, 227);
            doc.line(margin + 4, y + 1, pageW - margin - 4, y + 1);
            y += 4;
            doc.setTextColor(...hexToRgb(ACCENT_DARK));
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(e.meal.toUpperCase(), margin + 4, y + 2);
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'normal');
            doc.text(e.time, pageW - margin - 12, y + 2);
            y += 4;
            e.items.forEach(it => {
              doc.setTextColor(40, 40, 40);
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              const itemText = `${it.name}${it.amount ? ` · ${it.amount}` : ''}`;
              doc.text(itemText, margin + 6, y + 2);
              doc.setTextColor(150, 150, 150);
              doc.text(`${it.kcal} kcal`, pageW - margin - 18, y + 2);
              y += 3.5;
            });
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(7);
            doc.text(`Total: ${e.kcal} kcal · P${e.p}g · C${e.c}g · G${e.g}g`, margin + 6, y + 2);
            y += 5;
          });
        }
        y += 6;
      });

      // Footer on last page
      checkPage(20);
      y += 5;
      doc.setDrawColor(229, 226, 213);
      doc.line(margin, y, pageW - margin, y);
      y += 5;
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('Mauro Morón · ISSA Certified Fitness and Nutrition Coach', pageW / 2, y, { align: 'center' });
      doc.text('Reporte generado por Meal Tracker', pageW / 2, y + 4, { align: 'center' });

      // Save
      doc.save(`Reporte_${name ? name.replace(/\s+/g, '_') : 'Cliente'}_${today}.pdf`);
      setTimeout(() => setGenerating(false), 500);
    } catch (e) {
      setGenerating(false);
      alert('Hubo un error generando el PDF. Intenta de nuevo.');
    }
  };


  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg">
      <ModalHeader accent={TEXT} label="Exportar" title="Reporte al coach" onClose={onClose} />

      <div className="mb-5">
        <div className="text-[12px] font-semibold mb-3 uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Periodo</div>
        <div className="flex gap-2">
          {[7, 14].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className="flex-1 py-3 rounded-2xl text-[14px] font-semibold transition active:scale-[0.98]"
              style={days === d
                ? { background: '#0E0E0E', color: '#fff' }
                : { background: SURFACE_2, color: TEXT_MUTED, border: `1px solid ${BORDER}` }}>
              Últimos {d} días
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-2xl mb-5" style={{ background: SURFACE_2, border: `1px solid ${BORDER}` }}>
        <div className="text-[13px] leading-relaxed" style={{ color: TEXT }}>
          Genera un PDF con tu data del periodo. Puedes enviárselo al coach por WhatsApp o correo directamente desde tu celular.
        </div>
      </div>

      <button onClick={generateAndDownload} disabled={generating || sortedDates.length === 0}
        className="w-full py-3.5 rounded-2xl text-[15px] font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
        style={{
          background: '#0E0E0E',
          color: '#fff',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.1) inset'
        }}>
        {generating ? <><Loader2 size={15} className="animate-spin" /> Generando PDF…</> : <><FileText size={15} /> Descargar reporte PDF</>}
      </button>

      {sortedDates.length === 0 && (
        <div className="text-center text-[12px] mt-3" style={{ color: TEXT_LIGHT }}>
          Sin registros para exportar.
        </div>
      )}
    </ModalShell>
  );
}

function PerfectDayModal({ name, totals, goals, onClose }) {
  const firstName = name ? name.split(' ')[0] : '';
  const [showContent, setShowContent] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-up" style={{
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(14px)'
    }} onClick={onClose}>
      <div className="w-full max-w-sm p-8 rounded-3xl text-center" style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        fontFamily: FONT_UI,
        boxShadow: `0 0 60px ${ACCENT}30, 0 24px 60px rgba(0,0,0,0.18)`
      }} onClick={e => e.stopPropagation()}>
        <div className="inline-flex p-4 rounded-full mb-5 pulse-ring" style={{ background: ACCENT_PASTEL + '60' }}>
          <Trophy size={30} style={{ color: ACCENT_DARK }} />
        </div>
        <div className="text-[10px] tracking-[0.3em] uppercase font-semibold mb-2" style={{ color: ACCENT }}>
          Día con precisión
        </div>
        <div className="text-2xl font-bold mb-3 tracking-tight" style={{ color: TEXT, letterSpacing: '-0.01em' }}>
          {firstName ? `Bien hecho, ${firstName}` : 'Bien hecho'}
        </div>
        {showContent && (
          <div className="fade-up">
            <div className="text-sm mb-6 leading-relaxed" style={{ color: TEXT_MUTED }}>
              Cerraste las cuatro metas dentro del 5%.<br />
              <span style={{ color: ACCENT_DARK, fontStyle: 'italic' }}>Eso es método.</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[
                { l: 'kcal', v: totals.kcal, c: ACCENT },
                { l: 'P', v: `${totals.p}g`, c: C_PROTEIN },
                { l: 'C', v: `${totals.c}g`, c: C_CARBS },
                { l: 'G', v: `${totals.g}g`, c: C_FAT },
              ].map((s, i) => (
                <div key={i} className="p-2 rounded-xl" style={{ background: SURFACE_2 }}>
                  <div className="text-[9px] uppercase font-semibold" style={{ color: TEXT_LIGHT }}>{s.l}</div>
                  <div className="text-sm font-semibold num" style={{ color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="w-full py-3 rounded-full text-sm font-medium transition"
              style={{ background: ACCENT, color: '#fff' }}>
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditEntryModal({ entry, onSave, onDelete, onClose }) {
  const [items, setItems] = useState(entry.items.map(i => ({ ...i })));
  const [meal, setMeal] = useState(entry.meal);
  const [recalculating, setRecalculating] = useState(null);

  const recalculateFromAmount = async (idx, newAmount) => {
    if (!newAmount.trim()) return;
    setRecalculating(idx);
    try {
      const item = items[idx];
      const sys = `Eres un parser nutricional. Devuelves SOLO JSON válido, sin markdown.

Para "${item.name}" con cantidad "${newAmount}", calcula valores REALES (USDA).
Validación: 1g P=4 kcal, 1g C=4 kcal, 1g G=9 kcal. Suma macros entre 85-115% del kcal.

{"kcal": N, "p": N, "c": N, "g": N}`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 200,
          system: sys,
          messages: [{ role: "user", content: `${item.name}: ${newAmount}` }],
        })
      });
      const data = await response.json();
      const text = data.content.map(c => c.text || '').join('');
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);

      const newItems = [...items];
      newItems[idx] = { ...newItems[idx], amount: newAmount, kcal: result.kcal, p: result.p, c: result.c, g: result.g, needs_quantity: false };
      setItems(newItems);
      haptic(10);
    } catch (e) {
      const newItems = [...items];
      newItems[idx] = { ...newItems[idx], amount: newAmount };
      setItems(newItems);
    }
    setRecalculating(null);
  };

  const updateName = (idx, val) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], name: val };
    setItems(newItems);
  };

  const updateAmount = (idx, val) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], amount: val };
    setItems(newItems);
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const save = () => {
    if (items.length === 0) { onDelete(); return; }
    const updated = {
      ...entry, meal, items,
      hasMissingQuantity: items.some(i => i.needs_quantity),
      kcal: items.reduce((s, i) => s + (i.kcal || 0), 0),
      p: items.reduce((s, i) => s + (i.p || 0), 0),
      c: items.reduce((s, i) => s + (i.c || 0), 0),
      g: items.reduce((s, i) => s + (i.g || 0), 0),
    };
    onSave(updated);
  };

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader accent={ACCENT} label="Editar" title="Ajustar comida" onClose={onClose} />

      <div className="mb-4 p-3 rounded-xl text-xs flex items-start gap-2" style={{ background: ACCENT_LIGHT, color: ACCENT_DARK }}>
        <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          {entry.hasMissingQuantity
            ? <><strong>Ajusta la cantidad de cada alimento.</strong> Las calorías y macros se recalculan automáticamente.</>
            : <>Cambia la cantidad si necesitas. Los valores se recalculan automáticamente.</>}
        </span>
      </div>

      <div className="mb-4">
        <div className="text-xs font-medium mb-2" style={{ color: TEXT_MUTED }}>Tipo de comida</div>
        <div className="flex gap-1">
          {['desayuno', 'almuerzo', 'cena', 'snack'].map(m => (
            <button key={m} onClick={() => setMeal(m)}
              className="flex-1 py-2 rounded-full text-[10px] font-medium uppercase tracking-wider transition"
              style={meal === m ? { background: ACCENT, color: '#fff' } : { background: SURFACE_2, color: TEXT_MUTED }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {items.map((it, idx) => (
          <div key={idx} className="p-3 rounded-2xl" style={{
            background: SURFACE_2,
            border: it.needs_quantity ? `1.5px solid ${WARN}40` : `1px solid ${BORDER_SOFT}`
          }}>
            <div className="flex justify-between items-start mb-2 gap-2">
              <input value={it.name} onChange={e => updateName(idx, e.target.value)}
                className="bg-transparent text-sm font-medium outline-none flex-1" style={{ color: TEXT, fontSize: '16px' }} />
              <button onClick={() => removeItem(idx)} className="p-1 rounded-full hover:bg-black/5">
                <Trash2 size={12} style={{ color: TEXT_LIGHT }} />
              </button>
            </div>

            <div className="mb-3">
              <label className="text-[10px] uppercase tracking-wider font-semibold block mb-1.5" style={{ color: it.needs_quantity ? WARN : TEXT_MUTED }}>
                {it.needs_quantity ? '⚠ Cantidad — escríbela aquí' : 'Cantidad'}
              </label>
              <div className="flex gap-2 items-center">
                <input
                  value={it.amount || ''}
                  onChange={e => updateAmount(idx, e.target.value)}
                  onBlur={e => {
                    if (e.target.value !== entry.items[idx]?.amount && e.target.value.trim()) {
                      recalculateFromAmount(idx, e.target.value);
                    }
                  }}
                  placeholder="Ej: 150g, 2 unidades, 1 taza"
                  className="bg-white rounded-lg px-3 py-2 text-sm outline-none flex-1"
                  style={{ color: TEXT, border: `1.5px solid ${it.needs_quantity ? WARN : BORDER_SOFT}`, fontSize: '16px' }}
                />
                {recalculating === idx && <Loader2 size={14} className="animate-spin" style={{ color: ACCENT }} />}
              </div>
              <div className="text-[10px] mt-1" style={{ color: TEXT_LIGHT }}>
                Al cambiar la cantidad, las calorías y macros se ajustan automáticamente.
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t" style={{ borderColor: BORDER_SOFT }}>
              <ReadOnlyStat label="kcal" val={it.kcal} color={ACCENT} />
              <ReadOnlyStat label="P" val={`${it.p}g`} color={C_PROTEIN} />
              <ReadOnlyStat label="C" val={`${it.c}g`} color={C_CARBS} />
              <ReadOnlyStat label="G" val={`${it.g}g`} color={C_FAT} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={onDelete} className="px-4 py-3 rounded-full text-sm font-medium transition flex items-center gap-2"
          style={{ background: SURFACE_2, color: WARN }}>
          <Trash2 size={13} /> Eliminar
        </button>
        <button onClick={save} disabled={recalculating !== null}
          className="flex-1 py-3 rounded-full text-sm font-medium transition disabled:opacity-50"
          style={{ background: ACCENT, color: '#fff' }}>
          {recalculating !== null ? 'Recalculando…' : 'Guardar cambios'}
        </button>
      </div>
    </ModalShell>
  );
}

function ReadOnlyStat({ label, val, color }) {
  return (
    <div className="text-center p-2 rounded-lg" style={{ background: '#fff' }}>
      <div className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: TEXT_LIGHT }}>{label}</div>
      <div className="text-xs font-semibold num mt-0.5" style={{ color }}>{val}</div>
    </div>
  );
}

function Welcome({ onContinue, onTutorial, tutorialOpen, onCloseTutorial }) {
  return (
    <div className="min-h-screen p-5 flex flex-col relative overflow-hidden" style={{ background: BG, color: TEXT, fontFamily: FONT_UI }}>
      <FontStyles />
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes meshFloat1 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(80px, -60px) scale(1.15); } }
        @keyframes meshFloat2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-70px, 80px) scale(1.12); } }
        @keyframes meshFloat3 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(60px, 50px) scale(1.18); } }
        @keyframes meshFloat4 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-50px, -40px) scale(1.1); } }
        @keyframes ringFill { 
          0% { stroke-dashoffset: 1880; } 
          50% { stroke-dashoffset: 380; } 
          100% { stroke-dashoffset: 1880; } 
        }
        .ring-fill { animation: ringFill 8s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .fade-up-1 { animation: fadeUp 0.6s ease-out 0.0s both; }
        .fade-up-2 { animation: fadeUp 0.6s ease-out 0.15s both; }
        .fade-up-3 { animation: fadeUp 0.6s ease-out 0.3s both; }
        .fade-up-4 { animation: fadeUp 0.6s ease-out 0.45s both; }
        .mesh-1 { animation: meshFloat1 14s ease-in-out infinite; }
        .mesh-2 { animation: meshFloat2 17s ease-in-out infinite; }
        .mesh-3 { animation: meshFloat3 13s ease-in-out infinite; }
        .mesh-4 { animation: meshFloat4 19s ease-in-out infinite; }
      `}</style>

      {/* Animated aurora background — gray/white tones, real visible motion */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Aurora layer 1 — large soft white blob, top */}
        <div className="mesh-1 absolute" style={{
          top: '-25%', left: '-20%', width: '90%', height: '70%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0) 60%)',
          filter: 'blur(70px)',
          mixBlendMode: 'screen'
        }} />
        {/* Aurora layer 2 — cool gray, right side */}
        <div className="mesh-2 absolute" style={{
          top: '10%', right: '-30%', width: '85%', height: '75%',
          background: 'radial-gradient(circle, rgba(180,190,200,0.55), rgba(180,190,200,0) 65%)',
          filter: 'blur(80px)'
        }} />
        {/* Aurora layer 3 — warm white, bottom */}
        <div className="mesh-3 absolute" style={{
          bottom: '-25%', left: '10%', width: '80%', height: '70%',
          background: 'radial-gradient(circle, rgba(245,243,238,0.9), rgba(245,243,238,0) 60%)',
          filter: 'blur(75px)'
        }} />
        {/* Aurora layer 4 — subtle dark for depth */}
        <div className="mesh-4 absolute" style={{
          top: '40%', left: '20%', width: '60%', height: '50%',
          background: 'radial-gradient(circle, rgba(120,130,140,0.18), rgba(120,130,140,0) 70%)',
          filter: 'blur(90px)'
        }} />

        {/* Editorial avocado image — integrates with background */}
        <img src="/avocado.png" alt=""
          onError={(e) => { e.target.style.display = 'none'; }}
          style={{
            position: 'absolute',
            top: '50%',
            right: '-90px',
            transform: 'translateY(-50%) rotate(8deg)',
            width: '380px',
            height: 'auto',
            opacity: 0.88,
            mixBlendMode: 'multiply',
            filter: 'drop-shadow(0 30px 50px rgba(80,90,60,0.25)) contrast(1.05) saturate(1.1)',
            maskImage: 'radial-gradient(ellipse at center, black 60%, transparent 95%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 60%, transparent 95%)',
            pointerEvents: 'none',
            userSelect: 'none'
          }} />
      </div>

      {/* Content above background */}
      <div className="relative" style={{ zIndex: 1 }}>
        {/* Top: subtle progress indicator */}
        <div className="max-w-md w-full mx-auto pt-2 fade-up-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-[11px] tracking-[0.22em] uppercase font-semibold" style={{ color: TEXT_MUTED }}>Paso 1 de 3</div>
            <div className="flex-1 flex gap-1">
              <div className="flex-1 h-1 rounded-full" style={{ background: TEXT }} />
              <div className="flex-1 h-1 rounded-full" style={{ background: BORDER }} />
              <div className="flex-1 h-1 rounded-full" style={{ background: BORDER }} />
            </div>
          </div>
        </div>
      </div>

      {/* Center: hero with logo + frase */}
      <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto py-12 relative" style={{ zIndex: 1 }}>

        <div className="fade-up-2">
          <div className="display" style={{
            fontSize: '64px',
            lineHeight: 0.88,
            letterSpacing: '0.005em',
            textTransform: 'uppercase',
            color: TEXT
          }}>
            Meal<br />Tracker
          </div>
          {/* Línea Maestra — gesto visual único */}
          <div className="h-[2px] w-14 mt-5 rounded-full" style={{ background: ACCENT }} />
          <div className="text-[19px] font-bold mt-4" style={{ color: ACCENT_DARK, letterSpacing: '0.005em' }}>
            Entrena con Método
          </div>
        </div>

        <div className="mt-12 fade-up-3">
          <div className="text-[24px] font-bold leading-tight" style={{ color: TEXT, letterSpacing: '-0.015em' }}>
            Registra natural.<br />
            <span style={{ color: TEXT_MUTED }}>Recibe criterio.</span>
          </div>
          <div className="text-[14px] mt-4" style={{ color: TEXT_MUTED, lineHeight: 1.5 }}>
            <span style={{ color: TEXT, fontWeight: 600 }}>Mauro Morón</span> · ISSA Certified Coach
          </div>
        </div>
      </div>

      {/* Bottom: actions */}
      <div className="max-w-md w-full mx-auto pb-16 fade-up-4 relative" style={{ zIndex: 1 }}>

        {/* How it works — prominent secondary action ABOVE Empezar */}
        <button onClick={onTutorial}
          className="w-full py-3.5 mb-3 rounded-2xl text-[14px] font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2"
          style={{
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: `1px solid ${BORDER}`,
            color: TEXT,
            boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 2px 8px rgba(0,0,0,0.04)'
          }}>
          <Info size={15} strokeWidth={2} />
          ¿Cómo funciona? <span style={{ color: TEXT_LIGHT, fontWeight: 500 }}>· 2 min</span>
        </button>

        <button onClick={onContinue}
          className="w-full py-4 rounded-2xl text-base font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2"
          style={{
            background: '#0E0E0E',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.1) inset',
            letterSpacing: '0.01em'
          }}>
          Empezar <ArrowUp size={16} strokeWidth={2.5} style={{ transform: 'rotate(90deg)' }} />
        </button>
      </div>

      {tutorialOpen && <TutorialModal onClose={onCloseTutorial} />}
    </div>
  );
}

function TutorialModal({ onClose }) {
  const [step, setStep] = useState(0);
  const steps = [
    { emoji: '🥚', title: 'Registra natural', body: 'Escribe lo que comiste como si lo dijeras en voz alta. La app calcula calorías y macros con valores reales (USDA, comerciales).', example: '"Desayuno: 2 huevos revueltos, avena con plátano y café con leche"' },
    { emoji: '⭐', title: 'Menús favoritos', body: 'Las comidas que repites se guardan con un tap en la estrella. Reuso instantáneo, cero fricción.', example: 'Desde "Menús favoritos", toca Usar y queda registrado.' },
    { emoji: '❓', title: 'Pregunta antes de comer', body: 'Consulta los macros de cualquier alimento sin registrarlo. Útil para decidir antes de servirte.', example: '"¿Calorías de una manzana?" o "¿Macros de 100g de pollo?"' },
    { emoji: '🥗', title: 'Cuadra macros', body: 'Si te faltan macros y tienes ingredientes, dile qué tienes. La app calcula gramos exactos. Solo matemática, no recetas, no recomendación.', example: '"Tengo pollo, arroz integral, brócoli y aceite de oliva"' },
    { emoji: '✏️', title: 'Edita o elimina', body: 'Toca el lápiz para ajustar cantidades. Los valores se recalculan automáticamente. Toca la papelera para eliminar.', example: 'En cualquier comida: ⭐ favorito · ✏️ editar · 🗑️ eliminar' },
    { emoji: '📊', title: 'Reporte al coach', body: 'PDF con detalle completo de tu data. Diseñado para que tu coach revise el patrón y aporte criterio.', example: 'Calendario, resumen, exportable. Tu data, su criterio.' },
    { emoji: '⚠️', title: 'Importante', body: 'Esta herramienta calcula y registra. No recomienda qué comer ni sustituye el criterio de un coach nutricional.', example: 'La app mide. El coach decide.' },
    { emoji: '🔖', title: 'Guarda esta app', body: 'Agrega esta página a tus favoritos del navegador. Si minimizas en lugar de cerrar, mantienes la conversación abierta.', example: 'iPhone: Compartir → Añadir a inicio · Android: ⋮ → Añadir a pantalla' }
  ];

  const s = steps[step];
  return (
    <ModalShell onClose={onClose}>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-[11px] tracking-[0.22em] uppercase font-semibold" style={{ color: TEXT_MUTED }}>
            {step + 1} de {steps.length}
          </div>
          <div className="flex-1 flex gap-1">
            {steps.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full transition-all duration-500" style={{
                background: i <= step ? TEXT : BORDER
              }} />
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="text-4xl mb-4">{s.emoji}</div>
        <div className="text-[22px] font-bold mb-1 tracking-tight" style={{ color: TEXT, letterSpacing: '-0.015em' }}>{s.title}</div>
        <div className="h-[2px] w-10 mt-2 mb-4 rounded-full" style={{ background: ACCENT }} />
        <div className="text-[15px] leading-relaxed mb-4" style={{ color: TEXT_MUTED }}>{s.body}</div>
        <div className="p-4 rounded-2xl text-[13px] italic" style={{ background: SURFACE_2, color: TEXT, border: `1px solid ${BORDER}` }}>
          {s.example}
        </div>
      </div>

      <div className="flex gap-2">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 rounded-2xl text-[14px] font-semibold transition active:scale-[0.98]"
            style={{ background: SURFACE_2, color: TEXT, border: `1px solid ${BORDER}` }}>
            Anterior
          </button>
        )}
        {step < steps.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)} className="flex-1 py-3 rounded-2xl text-[14px] font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ background: '#0E0E0E', color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}>
            Siguiente <ArrowUp size={14} strokeWidth={2.5} style={{ transform: 'rotate(90deg)' }} />
          </button>
        ) : (
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl text-[14px] font-semibold transition active:scale-[0.98]"
            style={{ background: '#0E0E0E', color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}>
            Entendido
          </button>
        )}
      </div>
    </ModalShell>
  );
}

function ExampleCard({ num, emoji, title, example, className, onClick }) {
  return (
    <button onClick={onClick} className={`w-full p-4 rounded-2xl flex items-start gap-3 text-left transition hover:scale-[1.01] active:scale-[0.99] ${className}`} style={{
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
    }}>
      <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{
        background: SURFACE_2
      }}>
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        {num && <div className="text-[10px] tracking-[0.25em] font-semibold uppercase mb-1" style={{ color: ACCENT }}>{num}</div>}
        <div className="text-[15px] font-bold" style={{ color: TEXT, letterSpacing: '-0.01em' }}>{title}</div>
        <div className="text-[13px] mt-1" style={{ color: TEXT_MUTED, lineHeight: 1.4 }}>{example}</div>
      </div>
      <ChevronRight size={16} style={{ color: TEXT_LIGHT, flexShrink: 0, marginTop: 12 }} />
    </button>
  );
}

function Onboarding({ onComplete, existingGoals, existingName }) {
  const [step, setStep] = useState(existingName ? 1 : 0);
  const [name, setName] = useState(existingName || '');
  const [nameError, setNameError] = useState('');
  const [kcal, setKcal] = useState(existingGoals?.kcal || 2200);
  const [pPct, setPPct] = useState(existingGoals ? Math.round((existingGoals.p * 4 / existingGoals.kcal) * 100) : 30);
  const [cPct, setCPct] = useState(existingGoals ? Math.round((existingGoals.c * 4 / existingGoals.kcal) * 100) : 40);
  const [gPct, setGPct] = useState(existingGoals ? Math.round((existingGoals.g * 9 / existingGoals.kcal) * 100) : 30);

  const validateName = (n) => {
    const trimmed = n.trim();
    if (trimmed.length < 3) return 'Escribe nombre completo';
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) return 'Necesito nombre y apellido';
    if (!/^[a-záéíóúñü\s]+$/i.test(trimmed)) return 'Solo letras (sin números ni símbolos)';
    if (!isAuthorized(trimmed)) return 'Este nombre no está autorizado. Contacta a Mauro para acceso.';
    return '';
  };

  const continueFromName = () => {
    const err = validateName(name);
    if (err) { setNameError(err); return; }
    const formatted = name.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    setName(formatted);
    setStep(1);
  };

  const updatePct = (which, newVal) => {
    newVal = Math.max(5, Math.min(80, newVal));
    const others = which === 'p' ? ['c', 'g'] : which === 'c' ? ['p', 'g'] : ['p', 'c'];
    const currentOthers = { p: pPct, c: cPct, g: gPct };
    const otherSum = currentOthers[others[0]] + currentOthers[others[1]];
    const remaining = 100 - newVal;
    let newOther0, newOther1;
    if (otherSum === 0) { newOther0 = Math.round(remaining / 2); newOther1 = remaining - newOther0; }
    else { newOther0 = Math.round(remaining * (currentOthers[others[0]] / otherSum)); newOther1 = remaining - newOther0; }
    if (which === 'p') { setPPct(newVal); setCPct(others[0] === 'c' ? newOther0 : newOther1); setGPct(others[0] === 'g' ? newOther0 : newOther1); }
    else if (which === 'c') { setCPct(newVal); setPPct(others[0] === 'p' ? newOther0 : newOther1); setGPct(others[0] === 'g' ? newOther0 : newOther1); }
    else { setGPct(newVal); setPPct(others[0] === 'p' ? newOther0 : newOther1); setCPct(others[0] === 'c' ? newOther0 : newOther1); }
  };

  const pGrams = Math.round((kcal * pPct / 100) / 4);
  const cGrams = Math.round((kcal * cPct / 100) / 4);
  const gGrams = Math.round((kcal * gPct / 100) / 9);

  const submit = () => {
    onComplete({ kcal: parseInt(kcal), p: pGrams, c: cGrams, g: gGrams }, name.trim() || null);
  };

  return (
    <div className="min-h-screen p-5 flex items-center justify-center" style={{ background: BG, color: TEXT, fontFamily: FONT_UI }}>
      <FontStyles />
      <style>{`
        .num { font-variant-numeric: tabular-nums; }
        input[type="range"] { -webkit-appearance: none; appearance: none; height: 4px; background: ${BORDER}; border-radius: 2px; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 50%; background: white; border: 2px solid currentColor; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
      `}</style>
      <div className="max-w-md w-full">

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-[11px] tracking-[0.22em] uppercase font-semibold" style={{ color: TEXT_MUTED }}>Paso {step === 0 ? '2' : '3'} de 3</div>
            <div className="flex-1 flex gap-1">
              <div className="flex-1 h-1 rounded-full" style={{ background: TEXT }} />
              <div className="flex-1 h-1 rounded-full" style={{ background: TEXT }} />
              <div className="flex-1 h-1 rounded-full" style={{ background: step === 0 ? BORDER : TEXT }} />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl relative overflow-hidden" style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset, 0 8px 32px rgba(0,0,0,0.06)'
        }}>
          <div className="relative">
          {step === 0 && (
            <div>
              <div className="display mb-3" style={{
                fontSize: '32px',
                lineHeight: 0.95,
                letterSpacing: '0.01em',
                textTransform: 'uppercase',
                color: TEXT
              }}>
                Bienvenido
              </div>
              <div className="h-[2px] w-12 mt-1 mb-4 rounded-full" style={{ background: ACCENT }} />
              <div className="text-[15px] mb-5 leading-relaxed" style={{ color: TEXT_MUTED }}>
                Escribe tu <strong style={{ color: TEXT }}>nombre y apellido</strong>.
              </div>
              <input value={name}
                onChange={e => { setName(e.target.value); setNameError(''); }}
                placeholder="Ej: Juan Pérez"
                className="w-full bg-transparent border-b py-2 outline-none mb-2 text-base"
                style={{ borderColor: nameError ? WARN : BORDER, color: TEXT, fontSize: '16px' }} autoFocus
                onKeyDown={e => e.key === 'Enter' && continueFromName()} />
              {nameError && <div className="text-[11px] mb-3" style={{ color: '#FF9B6B' }}>{nameError}</div>}
              <button onClick={continueFromName}
                className="w-full py-3.5 mt-4 rounded-2xl text-base font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2"
                style={{
                  background: '#0E0E0E',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.1) inset',
                  letterSpacing: '0.01em'
                }}>
                Continuar <ArrowUp size={16} strokeWidth={2.5} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="display mb-3" style={{
                fontSize: '32px',
                lineHeight: 0.95,
                letterSpacing: '0.01em',
                textTransform: 'uppercase',
                color: TEXT
              }}>
                Tus Metas
              </div>
              <div className="h-[2px] w-12 mt-1 mb-5 rounded-full" style={{ background: ACCENT }} />

              <div className="mb-7">
                <div className="text-[12px] mb-2 font-semibold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Calorías diarias</div>
                <div className="flex items-baseline gap-2">
                  <input type="number" value={kcal} onChange={e => setKcal(e.target.value)}
                    className="display outline-none w-32 num bg-transparent" style={{ color: TEXT, letterSpacing: '0.02em', fontSize: '40px' }} />
                  <span className="text-[15px]" style={{ color: TEXT_LIGHT }}>kcal</span>
                </div>
                <div className="h-px mt-2" style={{ background: BORDER }} />
              </div>

              <div className="mb-2">
                <div className="text-[12px] mb-1 font-semibold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Distribución de macros</div>
                <div className="text-[12px] mb-5" style={{ color: TEXT_LIGHT }}>Los porcentajes se rebalancean automáticamente.</div>
              </div>

              <div className="h-3 rounded-full overflow-hidden flex mb-6" style={{ background: BORDER_SOFT }}>
                <div style={{ width: `${pPct}%`, background: C_PROTEIN, transition: 'width 0.25s cubic-bezier(0.2, 0, 0, 1)' }} />
                <div style={{ width: `${cPct}%`, background: C_CARBS, transition: 'width 0.25s cubic-bezier(0.2, 0, 0, 1)' }} />
                <div style={{ width: `${gPct}%`, background: C_FAT, transition: 'width 0.25s cubic-bezier(0.2, 0, 0, 1)' }} />
              </div>

              <SliderRow label="Proteína" color={C_PROTEIN} pct={pPct} grams={pGrams} onChange={v => updatePct('p', v)} />
              <SliderRow label="Carbohidratos" color={C_CARBS} pct={cPct} grams={cGrams} onChange={v => updatePct('c', v)} />
              <SliderRow label="Grasas" color={C_FAT} pct={gPct} grams={gGrams} onChange={v => updatePct('g', v)} />

              <button onClick={submit} disabled={!kcal || kcal < 500}
                className="w-full py-3.5 mt-6 rounded-2xl text-base font-semibold transition disabled:opacity-30 active:scale-[0.98] flex items-center justify-center gap-2"
                style={{
                  background: '#0E0E0E',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.1) inset',
                  letterSpacing: '0.01em'
                }}>
                Empezar <ArrowUp size={16} strokeWidth={2.5} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </div>
          )}
          </div>
        </div>

        <div className="text-center mt-6 text-[10px]" style={{ color: TEXT_LIGHT }}>
          Tus datos se guardan localmente. Cada semana se envía un resumen a tu coach.
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, color, pct, grams, onChange, darkMode }) {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-baseline mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-xs font-medium" style={{ color: darkMode ? '#FFF' : TEXT }}>{label}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold num" style={{ color: darkMode ? '#FFF' : TEXT }}>{pct}%</span>
          <span className="text-[10px] num" style={{ color: darkMode ? 'rgba(255,255,255,0.5)' : TEXT_LIGHT }}>{grams}g</span>
        </div>
      </div>
      <input type="range" min="5" max="80" value={pct} onChange={e => onChange(parseInt(e.target.value))}
        className="w-full" style={{ color }} />
    </div>
  );
}
