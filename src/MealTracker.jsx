import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowUp, RotateCcw, Calendar, Sparkles, Loader2, Check, BarChart3, Settings, X, Mic,
  Star, Trash2, FileText, ChevronLeft, ChevronRight, Trophy, Info, ChevronDown, ChevronUp,
  SlidersHorizontal as Sliders, PieChart, Utensils, Download, Droplet, CheckCircle2, Pencil, LineChart, ChefHat, Send
} from 'lucide-react';

// Palette — premium warm neutrals + signature olive + restrained macro hues
const ACCENT = '#8A9558';        // signature olive, slightly more alive for CTAs
const ACCENT_DARK = '#4A5238';   // deeper for text on light
const ACCENT_PASTEL = '#D4DAB8';
const ACCENT_LIGHT = '#F1F3E5';

const C_PROTEIN = '#D77A61';     // coral terracotta — refined, not fluo
const C_PROTEIN_PASTEL = '#F2CBBE';
const C_CARBS = '#D4B581';       // honey mustard
const C_CARBS_PASTEL = '#EDDCBC';
const C_FAT = '#6B7A8F';         // smoke blue
const C_FAT_PASTEL = '#CDD2DB';
const C_WATER = '#5BA3C7';

const BG = '#F7F4ED';            // warm cream, less grey than before
const SURFACE = '#FFFFFF';
const SURFACE_2 = '#EFEBE0';
const BORDER = '#E2DECC';
const BORDER_SOFT = '#EEEBE0';
const TEXT = '#1F1F1F';          // graphite, never pure black
const TEXT_MUTED = '#6B6B6B';
const TEXT_LIGHT = '#9A9A9A';
const SUCCESS = '#7A9579';
const WARN = '#B8732B';

// LLM model — single source of truth. To switch to Sonnet, change this one line:
//   'claude-haiku-4-5-20251001'  (rápido, económico, actual)
//   'claude-sonnet-4-6'          (más capaz, ~3x costo)
const CHAT_MODEL = 'claude-haiku-4-5-20251001';

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
  const [cardCompact, setCardCompact] = useState(false);
  const [frequentItems, setFrequentItems] = useState({}); // { itemName: { count, lastSeen, kcal, p, c, g, amount } }
  const [wellbeing, setWellbeing] = useState({}); // { 'YYYY-MM-DD': { energy, hunger, mood } }
  const [showWellbeingModal, setShowWellbeingModal] = useState(false);
  const [favoriteIngredients, setFavoriteIngredients] = useState([]); // ["pollo", "arroz", ...]
  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [plannerProposal, setPlannerProposal] = useState(null); // result from LLM
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [showCapabilitiesModal, setShowCapabilitiesModal] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const voiceInputRef = useRef(false);

  const today = getLocalDate();

  useEffect(() => {
    (async () => {
      try {
        const [goalsRes, nameRes, lastDayRes, histRes, histDetailRes, favRes, msgsRes, perfectRes, freqRes, wellRes, favIngRes] = await Promise.all([
          window.storage.get('goals').catch(() => null),
          window.storage.get('name').catch(() => null),
          window.storage.get('lastDay').catch(() => null),
          window.storage.get('history').catch(() => null),
          window.storage.get('historyDetail').catch(() => null),
          window.storage.get('favorites').catch(() => null),
          window.storage.get('messages').catch(() => null),
          window.storage.get('perfectDays').catch(() => null),
          window.storage.get('frequentItems').catch(() => null),
          window.storage.get('wellbeing').catch(() => null),
          window.storage.get('favoriteIngredients').catch(() => null),
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
        storedMsgs = storedMsgs.filter(m => {
          if ((m.isLogged || m.isAppended) && m.entryId) return allEntryIds.has(m.entryId);
          return true;
        });
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
        if (freqRes?.value) {
          try { setFrequentItems(JSON.parse(freqRes.value)); } catch (e) {}
        }
        if (wellRes?.value) {
          try { setWellbeing(JSON.parse(wellRes.value)); } catch (e) {}
        }
        if (favIngRes?.value) {
          try { setFavoriteIngredients(JSON.parse(favIngRes.value)); } catch (e) {}
        }

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
          return new Date(y, m - 1, dd).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
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

  // Proactive favorites suggestion: if user has 3+ days with registrations and no favoriteIngredients, suggest once (dismissible)
  useEffect(() => {
    if (view !== 'main') return;
    if (favoriteIngredients.length > 0) return;
    if (Object.keys(history).length < 3) return;
    const check = async () => {
      const dismissedRes = await window.storage.get('favSuggestionDismissed').catch(() => null);
      if (dismissedRes?.value) return;
      const shownRes = await window.storage.get('favSuggestionShown').catch(() => null);
      if (shownRes?.value) return;
      await window.storage.set('favSuggestionShown', JSON.stringify(Date.now())).catch(() => {});
      const firstName = name ? name.split(' ')[0] : '';
      setMessages(m => [...m, {
        role: 'assistant',
        isFavSuggestion: true,
        content: `${firstName ? firstName + ', ' : ''}veo que ya llevas varios días registrando. Si me dices qué ingredientes sueles comprar, te puedo armar el día con eso cuando quieras y no pierdes tiempo decidiendo. ¿Te interesa?`,
        ts: Date.now()
      }]);
    };
    const t = setTimeout(check, 8000);
    return () => clearTimeout(t);
  }, [view, name, favoriteIngredients.length, history]);

  // Closing narrative: at 21:30+ (or on open after that), drop a coach-style end-of-day message once per day
  useEffect(() => {
    if (view !== 'main' || !goals) return;
    const check = async () => {
      const now = new Date();
      const isEvening = now.getHours() > 21 || (now.getHours() === 21 && now.getMinutes() >= 30);
      if (!isEvening) return;
      const key = `closingSent:${today}`;
      const sentRes = await window.storage.get(key).catch(() => null);
      if (sentRes?.value) return; // already sent today
      if (entries.length === 0) return; // no data to summarize
      // Recompute totals locally to avoid TDZ on outer `totals`
      const t = entries.reduce((acc, e) => ({
        kcal: acc.kcal + (e.kcal || 0),
        p: acc.p + (e.p || 0),
        c: acc.c + (e.c || 0),
        g: acc.g + (e.g || 0),
      }), { kcal: 0, p: 0, c: 0, g: 0 });
      const firstName = name ? name.split(' ')[0] : '';
      const intro = firstName ? `${firstName}, ` : '';
      const diff = (v, g) => v - g;
      const pDiff = diff(t.p, goals.p);
      const cDiff = diff(t.c, goals.c);
      const gDiff = diff(t.g, goals.g);
      const kDiff = diff(t.kcal, goals.kcal);
      const inRange = (v, g, tol = 0.07) => Math.abs(v - g) <= g * tol;
      const allInRange = inRange(t.kcal, goals.kcal) && inRange(t.p, goals.p) && inRange(t.c, goals.c) && inRange(t.g, goals.g);
      let narrative;
      if (allInRange) {
        narrative = `${intro}cerraste el día en línea con las cuatro metas. Día sólido. Mañana seguimos con el mismo ritmo.`;
      } else {
        const offs = [
          { name: 'proteína', diff: pDiff, unit: 'g' },
          { name: 'carbos', diff: cDiff, unit: 'g' },
          { name: 'grasas', diff: gDiff, unit: 'g' },
        ].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
        const main = offs[0];
        const dir = main.diff > 0 ? 'por encima' : 'por debajo';
        const ajuste = main.diff > 0
          ? `mañana moderamos ${main.name} desde el desayuno`
          : `mañana sumamos ${main.name} desde el desayuno`;
        narrative = `${intro}cerraste con ${t.kcal} kcal (meta ${goals.kcal}, ${kDiff >= 0 ? '+' : ''}${kDiff}). ${main.name.charAt(0).toUpperCase() + main.name.slice(1)} quedó ${Math.abs(main.diff)}${main.unit} ${dir}. Plan: ${ajuste}.`;
      }
      setMessages(m => [...m, { role: 'assistant', content: narrative, ts: Date.now() }]);
      await window.storage.set(key, JSON.stringify(Date.now())).catch(() => {});
      // Also append gap suggestion if any macro is in deficit ≥25%
      maybeAppendGapSuggestion();
    };
    const timer = setTimeout(check, 6000);
    const interval = setInterval(check, 5 * 60 * 1000); // re-check every 5 min in case user is on app
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [view, name, today, goals, entries]);

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
    // Scroll to bottom using window (the body scrolls, not the chat div)
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    });
  }, [messages, loading]);

  // On mount/load: jump (no animation) to the last message so users open at the most recent
  useEffect(() => {
    if (view === 'main' && messages.length > 0) {
      // Use a small delay so layout settles first
      const t = setTimeout(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [view]);

  // Track if user is scrolled away from bottom (to show "go to latest" button)
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight;
      const winH = window.innerHeight;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const distFromBottom = docH - winH - scrollY;
      setShowJumpToLatest(distFromBottom > 220);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [messages.length]);

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

  // Serialize the recent chat into plain text so the model has conversation memory.
  // We embed it in the prompt (instead of a multi-turn array) to avoid API alternating constraints.
  const buildHistoryText = (maxTurns = 16) => {
    const recent = messages.slice(-maxTurns);
    const lines = [];
    for (const m of recent) {
      if (m.isDaySeparator) continue;
      if (m.role === 'user') {
        lines.push(`Cliente: ${m.content}`);
        continue;
      }
      // assistant / system messages — serialize the meaningful action
      if (m.isLogged && m.entryId) {
        const e = entries.find(x => x.id === m.entryId);
        if (e) lines.push(`Asistente: (registré ${e.meal || 'comida'}: ${e.items.map(i => `${i.name}${i.amount ? ' ' + i.amount : ''}`).join(', ')} — total ${Math.round(e.kcal)} kcal)`);
      } else if (m.isAppended && m.entryId) {
        const e = entries.find(x => x.id === m.entryId);
        const added = (m.addedItems || []).map(i => `${i.name}${i.amount ? ' ' + i.amount : ''}`).join(', ');
        if (e) lines.push(`Asistente: (sumé a ${e.meal || 'comida'}: ${added} — nuevo total ${Math.round(e.kcal)} kcal)`);
      } else if (m.isMacroQuery && m.data) {
        lines.push(`Asistente: (consulta sin registrar — ${m.data.food}: ${Math.round(m.data.kcal)} kcal)`);
      } else if (m.isWater) {
        lines.push(`Asistente: (registré ${m.ml} ml de agua)`);
      } else if (m.isSummaryDetailed) {
        lines.push(`Asistente: (mostré el resumen del día)`);
      } else if (m.isMealSuggestion || m.isGapSuggestions) {
        lines.push(`Asistente: (di opciones de alimentos)`);
      } else if (typeof m.content === 'string' && m.content && !['logged', 'appended', 'water', 'macro_query', 'summary', 'summary_detailed', 'proportion'].includes(m.content)) {
        lines.push(`Asistente: ${m.content}`);
      }
    }
    return lines.join('\n');
  };

  const callClaude = async (prompt, systemPrompt, retries = 2) => {
    let lastError = null;
    // Send the system prompt as a cacheable block. If it's identical across calls
    // (and reused within ~5 min), Anthropic charges ~10% for it (prompt caching).
    const systemBlocks = [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }];
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: CHAT_MODEL,
            max_tokens: 1500,
            system: systemBlocks,
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

  // ─── Streak: consecutive days with any registration (today counts if entries>0) ───
  const streak = (() => {
    let count = 0;
    const d = new Date();
    // include today only if it has entries already
    if (entries.length === 0) d.setDate(d.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      const key = getLocalDate(d);
      const dayTotals = key === today
        ? entries.reduce((s, e) => s + (e.kcal || 0), 0)
        : (history[key]?.kcal || 0);
      if (dayTotals > 0) {
        count++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return count;
  })();

  // ─── Top frequent items (by count, recency tiebreaker) for quick-add bar ───
  const topFrequent = Object.entries(frequentItems)
    .map(([name, info]) => ({ name, ...info }))
    .sort((a, b) => (b.count - a.count) || ((b.lastSeen || 0) - (a.lastSeen || 0)))
    .slice(0, 6);

  // Scroll listener: shrink card when scrolled down
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setCardCompact(y > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Listen for "open capabilities" custom event dispatched from welcome card
  useEffect(() => {
    const handler = () => setShowCapabilitiesModal(true);
    window.addEventListener('openCapabilities', handler);
    return () => window.removeEventListener('openCapabilities', handler);
  }, []);

  // Persist frequentItems & wellbeing when they change
  useEffect(() => {
    if (Object.keys(frequentItems).length > 0) {
      window.storage.set('frequentItems', JSON.stringify(frequentItems)).catch(() => {});
    }
  }, [frequentItems]);
  useEffect(() => {
    if (Object.keys(wellbeing).length > 0) {
      window.storage.set('wellbeing', JSON.stringify(wellbeing)).catch(() => {});
    }
  }, [wellbeing]);
  useEffect(() => {
    window.storage.set('favoriteIngredients', JSON.stringify(favoriteIngredients)).catch(() => {});
  }, [favoriteIngredients]);

  // Generate a daily meal plan from favorite ingredients
  // Compute deficit % for each macro. Returns the macro with the biggest gap, or null.
  const computeBiggestGap = () => {
    if (!goals) return null;
    const gaps = [
      { key: 'kcal', label: 'calorías', remaining: Math.max(0, goals.kcal - totals.kcal), goal: goals.kcal, unit: ' kcal' },
      { key: 'p', label: 'proteína', remaining: Math.max(0, goals.p - totals.p), goal: goals.p, unit: 'g' },
      { key: 'c', label: 'carbohidratos', remaining: Math.max(0, goals.c - totals.c), goal: goals.c, unit: 'g' },
      { key: 'g', label: 'grasas', remaining: Math.max(0, goals.g - totals.g), goal: goals.g, unit: 'g' },
    ];
    const withPct = gaps.map(g => ({ ...g, pct: g.goal > 0 ? g.remaining / g.goal : 0 }));
    return withPct.sort((a, b) => b.pct - a.pct)[0];
  };

  // If a macro has >=25% deficit, ask the LLM for equivalences using ONLY favoriteIngredients.
  // Append a gap_suggestions message. Safe: no prescription, no "you should X", no value judgment.
  const maybeAppendGapSuggestion = async () => {
    const biggest = computeBiggestGap();
    if (!biggest || biggest.pct < 0.25) return;
    const allGaps = [
      { key: 'kcal', label: 'calorías', remaining: Math.max(0, goals.kcal - totals.kcal), goal: goals.kcal, unit: ' kcal' },
      { key: 'p', label: 'proteína', remaining: Math.max(0, goals.p - totals.p), goal: goals.p, unit: 'g' },
      { key: 'c', label: 'carbohidratos', remaining: Math.max(0, goals.c - totals.c), goal: goals.c, unit: 'g' },
      { key: 'g', label: 'grasas', remaining: Math.max(0, goals.g - totals.g), goal: goals.g, unit: 'g' },
    ];

    // Not enough ingredients in client's list — nudge to add more
    if (favoriteIngredients.length < 3) {
      setMessages(m => [...m, {
        role: 'assistant',
        isGapSuggestions: true,
        data: {
          gaps: allGaps,
          missingFavorites: true,
        },
        ts: Date.now()
      }]);
      return;
    }

    const sys = `Eres una calculadora de equivalencias nutricionales. Devuelves SOLO JSON válido, sin markdown.

IDIOMA: español neutro latinoamericano. PROHIBIDO voseo argentino.

LISTA DE INGREDIENTES DEL CLIENTE: ${favoriteIngredients.join(', ')}
DÉFICITS PENDIENTES:
- kcal: faltan ${allGaps[0].remaining} de meta ${allGaps[0].goal}
- proteína: faltan ${allGaps[1].remaining}g de meta ${allGaps[1].goal}g
- carbohidratos: faltan ${allGaps[2].remaining}g de meta ${allGaps[2].goal}g
- grasas: faltan ${allGaps[3].remaining}g de meta ${allGaps[3].goal}g

REGLAS DURAS:
- Genera 2 a 3 "opciones" de combinaciones de alimentos que aproximadamente cubran lo que falta.
- USA EXCLUSIVAMENTE los ingredientes de la lista del cliente. Está PROHIBIDO inventar o sugerir alimentos que no estén en la lista.
- Cada opción es una COMBINACIÓN de 2 a 4 alimentos con cantidades en gramos o unidades.
- Los valores nutricionales son REALES (USDA, alimentos cocidos por defecto).
- PROHIBIDO dar juicios de valor sobre alimentos ("X es mejor", "X es bueno para Y", "evita Z"). PROHIBIDO recomendar prescriptivamente ("deberías", "te recomiendo"). Solo enumeras equivalencias matemáticas.
- Si los déficits son muy pequeños y no merece la pena sugerir, devuelve "options": [].

SCHEMA:
{
  "options": [
    {
      "items": [{"name": "...", "amount": "Xg" o "X unidades", "kcal": N, "p": N, "c": N, "g": N}],
      "subtotal": {"kcal": N, "p": N, "c": N, "g": N}
    }
  ]
}`;
    try {
      const result = await callClaude('Genera 2 a 3 opciones para cubrir lo que falta usando solo los ingredientes del cliente.', sys);
      const clean = result.replace(/```json|```/g, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : clean);
      if (!parsed.options || parsed.options.length === 0) return;
      setMessages(m => [...m, {
        role: 'assistant',
        isGapSuggestions: true,
        data: {
          gaps: allGaps,
          options: parsed.options,
        },
        ts: Date.now()
      }]);
    } catch (e) {
      // silent fail — gap suggestion is a nice-to-have
    }
  };

  // Suggest 2-3 meal combos based on the client's favorite ingredients
  const handleMealSuggestion = async (mealType) => {
    const remaining = {
      kcal: Math.max(0, goals.kcal - totals.kcal),
      p: Math.max(0, goals.p - totals.p),
      c: Math.max(0, goals.c - totals.c),
      g: Math.max(0, goals.g - totals.g),
    };

    if (favoriteIngredients.length < 3) {
      setMessages(m => [...m, {
        role: 'assistant',
        isMealSuggestion: true,
        data: { missingFavorites: true, mealType, remaining },
        ts: Date.now()
      }]);
      return;
    }

    const sys = `Eres una calculadora de combinaciones de alimentos. Devuelves SOLO JSON válido, sin markdown.

IDIOMA: español neutro latinoamericano. PROHIBIDO voseo argentino.

LISTA DE INGREDIENTES DEL CLIENTE: ${favoriteIngredients.join(', ')}
COMIDA SOLICITADA: ${mealType || 'cualquiera (elige tú)'}
MACROS RESTANTES DEL DÍA: ${remaining.kcal} kcal · ${remaining.p}g P · ${remaining.c}g C · ${remaining.g}g G

REGLAS DURAS:
- Genera 2 o 3 "opciones" de combinaciones para esa comida.
- USA EXCLUSIVAMENTE los ingredientes de la lista del cliente. PROHIBIDO inventar o sugerir alimentos fuera de la lista.
- Cada opción es una COMBINACIÓN de 2 a 4 alimentos con cantidades en gramos o unidades.
- Valores nutricionales REALES (USDA, alimentos cocidos).
- Los subtotales de cada opción deberían encajar en lo que falta del día (sin pasarse mucho), pero no obsesionarte: el cliente decide.
- PROHIBIDO juicios de valor sobre alimentos ("X es mejor", "X es bueno para Y", "evita Z").
- PROHIBIDO prescribir ("deberías", "te recomiendo"). Solo enumeras opciones matemáticas.
- Si la lista no es suficiente para esa comida, devuelve "options": [].

SCHEMA:
{
  "options": [
    {
      "items": [{"name": "...", "amount": "Xg" o "X unidades", "kcal": N, "p": N, "c": N, "g": N}],
      "subtotal": {"kcal": N, "p": N, "c": N, "g": N}
    }
  ]
}`;
    try {
      const result = await callClaude(`Genera 2 o 3 opciones para ${mealType || 'una comida'} usando solo los ingredientes del cliente.`, sys);
      const clean = result.replace(/```json|```/g, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : clean);
      setMessages(m => [...m, {
        role: 'assistant',
        isMealSuggestion: true,
        data: { options: parsed.options || [], mealType, remaining },
        ts: Date.now()
      }]);
    } catch (e) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: 'No pude armar opciones ahora, intenta de nuevo en un momento.',
        ts: Date.now()
      }]);
    }
  };

  const generatePlan = async () => {
    if (favoriteIngredients.length === 0) {
      setShowIngredientsModal(true);
      return;
    }
    setPlannerLoading(true);
    setPlannerProposal(null);
    const sys = `Eres un organizador de macros. Devuelves SOLO JSON válido, sin markdown.

CLIENTE: ${name || 'Cliente'}
META DIARIA: ${goals.kcal} kcal · P ${goals.p}g · C ${goals.c}g · G ${goals.g}g
INGREDIENTES QUE LE GUSTAN Y COMPRA: ${favoriteIngredients.join(', ')}

REGLAS DURAS:
- NO es recetario. NO indiques modo de preparación, recetas, salsas ni guarniciones que no estén en la lista.
- Devuelve SOLO los ingredientes de la lista (cocidos por defecto) con kcal y macros REALES (USDA).
- NO inventes alimentos fuera de la lista.
- OBLIGATORIO: la suma total del día debe quedar dentro del ±5% de CADA meta (kcal, P, C, G). Ajusta gramos de cada item hasta cuadrar. Si una cantidad típica no encaja, modifica los gramos hacia arriba o abajo libremente — no estás limitado a porciones estándar.
- Reparte proteína entre comidas. Carbos más altos en desayuno/almuerzo. Grasas moderadas en todo.
- "warning" SOLO debe llenarse en estos dos casos:
  1) La lista tiene menos de 4 ingredientes: warning="La lista es muy corta para armar un día completo. Agrega más alimentos para una distribución mejor."
  2) Es matemáticamente imposible cuadrar la meta con esos ingredientes (ej: solo dan grasas y la meta es alta en carbos): warning describe brevemente qué macro no se puede alcanzar.
- En cualquier otro caso, "warning" debe ser null. NUNCA llenes warning con frases tipo "considera aumentar X o reducir Y" — esos ajustes los haces TÚ directamente en los gramos antes de devolver el JSON.
- Antes de responder, VERIFICA que tu total esté en ±5% de cada meta. Si no lo está, vuelve a ajustar los gramos.
- Frase de introducción FIJA: "Bueno, entendiendo que estos son los ingredientes que te gustan y compras, la distribución podría ser esta."

SCHEMA:
{
  "intro": "Bueno, entendiendo que estos son los ingredientes que te gustan y compras, la distribución podría ser esta.",
  "meals": [
    {
      "meal": "desayuno | almuerzo | snack | cena",
      "items": [{"name": "...", "amount": "Xg" o "X unidades", "kcal": N, "p": N, "c": N, "g": N}],
      "subtotal": {"kcal": N, "p": N, "c": N, "g": N}
    }
  ],
  "total": {"kcal": N, "p": N, "c": N, "g": N},
  "warning": "string | null"
}`;
    try {
      const result = await callClaude('Arma la distribución del día con los ingredientes que te di.', sys);
      const clean = result.replace(/```json|```/g, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : clean);
      setPlannerProposal(parsed);
    } catch (e) {
      setPlannerProposal({ error: 'No pude armar la propuesta ahora. Prueba de nuevo en un momento.' });
    }
    setPlannerLoading(false);
  };

  // Register all proposed meals as today's entries
  const registerPlan = () => {
    if (!plannerProposal?.meals) return;
    haptic(15);
    const newEntries = plannerProposal.meals.map((m, idx) => ({
      id: Date.now() + idx,
      meal: m.meal,
      items: m.items.map(it => ({ ...it, needs_quantity: false })),
      kcal: m.subtotal?.kcal || m.items.reduce((s, i) => s + (i.kcal || 0), 0),
      p: m.subtotal?.p || m.items.reduce((s, i) => s + (i.p || 0), 0),
      c: m.subtotal?.c || m.items.reduce((s, i) => s + (i.c || 0), 0),
      g: m.subtotal?.g || m.items.reduce((s, i) => s + (i.g || 0), 0),
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      rawInput: 'plan del día',
      hasMissingQuantity: false,
    }));
    setEntries(e => [...e, ...newEntries]);
    setPlannerProposal(null);
    setShowPlannerModal(false);
    setMessages(m => [...m, { role: 'assistant', content: 'Plan del día registrado. Suerte con esa distribución.', ts: Date.now() }]);
  };

  // Save proposed meals as a favorite menu
  const savePlanAsFavorite = () => {
    if (!plannerProposal?.meals) return;
    haptic(12);
    const newFavorites = plannerProposal.meals.map((m, idx) => ({
      id: Date.now() + idx,
      name: `${m.meal}: ${m.items.map(i => i.name).join(', ').slice(0, 50)}`,
      items: m.items.map(it => ({ ...it, needs_quantity: false })),
      kcal: m.subtotal?.kcal || 0,
      p: m.subtotal?.p || 0,
      c: m.subtotal?.c || 0,
      g: m.subtotal?.g || 0,
      meal: m.meal,
    }));
    setFavorites(f => [...f, ...newFavorites]);
    setPlannerProposal(null);
    setShowPlannerModal(false);
    setMessages(m => [...m, { role: 'assistant', content: 'Guardé esa propuesta en tus menús favoritos. Los puedes usar cuando quieras.', ts: Date.now() }]);
  };

  const trackFrequency = (items) => {
    const newlyHotKeys = []; // items that just crossed the favorite-suggestion threshold
    setFrequentItems(prev => {
      const next = { ...prev };
      const now = Date.now();
      for (const it of items) {
        const key = (it.name || '').trim().toLowerCase();
        if (!key) continue;
        const existing = next[key] || { count: 0, kcal: it.kcal, p: it.p, c: it.c, g: it.g, amount: it.amount, displayName: it.name, suggested: false };
        const newCount = existing.count + 1;
        next[key] = {
          ...existing,
          count: newCount,
          lastSeen: now,
          kcal: it.kcal || existing.kcal,
          p: it.p || existing.p,
          c: it.c || existing.c,
          g: it.g || existing.g,
          amount: it.amount || existing.amount,
          displayName: it.name || existing.displayName,
        };
        // Crossed threshold: 3+ times AND not yet suggested AND not already in favoriteIngredients
        if (newCount >= 3 && !existing.suggested && !favoriteIngredients.includes(key)) {
          newlyHotKeys.push({ key, displayName: it.name || key });
          next[key].suggested = true;
        }
      }
      return next;
    });
    // After state updates, push a suggestion bubble for each newly-hot item (max 1 at a time to avoid spam)
    if (newlyHotKeys.length > 0) {
      const { key, displayName } = newlyHotKeys[0];
      setTimeout(() => {
        setMessages(m => [...m, {
          role: 'assistant',
          isAutoFavoriteSuggestion: true,
          suggestedKey: key,
          suggestedName: displayName,
          ts: Date.now()
        }]);
      }, 600);
    }
  };

  const acceptAutoFavorite = (key) => {
    haptic(10);
    if (!favoriteIngredients.includes(key)) {
      setFavoriteIngredients(prev => [...prev, key]);
    }
  };
  const dismissAutoFavorite = (key) => {
    // Already marked as suggested in frequentItems; nothing else needed
  };

  // Repeat last meal from yesterday matching predicted meal type
  const repeatYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = getLocalDate(yesterday);
    const yEntries = historyDetail[yKey];
    if (!yEntries || yEntries.length === 0) {
      setMessages(m => [...m, { role: 'assistant', content: 'No tengo registro de ayer. Cuando me cuentes qué comiste hoy, lo guardo.', ts: Date.now() }]);
      return;
    }
    const targetMeal = predictMealType();
    const match = yEntries.find(e => e.meal === targetMeal) || yEntries[yEntries.length - 1];
    haptic(12);
    const newEntry = {
      ...match,
      id: Date.now(),
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      rawInput: 'repetido de ayer',
    };
    setEntries(e => [...e, newEntry]);
    setMessages(m => [...m, {
      role: 'assistant', content: 'logged', isLogged: true,
      entryId: newEntry.id, quantityWarning: null, ts: Date.now()
    }]);
  };

  // Quick-add a single frequent item (1 unit)
  const quickAddItem = (item) => {
    haptic(10);
    const newEntry = {
      id: Date.now(),
      meal: predictMealType(),
      items: [{ name: item.displayName || item.name, amount: item.amount || '', kcal: item.kcal, p: item.p, c: item.c, g: item.g, needs_quantity: false }],
      kcal: item.kcal || 0,
      p: item.p || 0,
      c: item.c || 0,
      g: item.g || 0,
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      rawInput: `quick: ${item.displayName || item.name}`,
      hasMissingQuantity: false,
    };
    setEntries(e => [...e, newEntry]);
    setMessages(m => [...m, {
      role: 'assistant', content: 'logged', isLogged: true,
      entryId: newEntry.id, quantityWarning: null, ts: Date.now()
    }]);
    trackFrequency([{ name: item.displayName || item.name, kcal: item.kcal, p: item.p, c: item.c, g: item.g, amount: item.amount }]);
  };

  // Save wellbeing for today
  const saveWellbeing = (energy, hunger, mood) => {
    setWellbeing(prev => ({ ...prev, [today]: { energy, hunger, mood, ts: Date.now() } }));
    setShowWellbeingModal(false);
    haptic(15);
    const firstName = name ? name.split(' ')[0] : '';
    setMessages(m => [...m, {
      role: 'assistant',
      content: `${firstName ? firstName + ', ' : ''}guardé tu check-in. Esto le sirve mucho a Mauro para afinar la estrategia.`,
      ts: Date.now()
    }]);
  };

  const parseFoodEntry = async (text, opts = {}) => {
    const { voiceInput = false, lastEntry = null } = opts;
    const lastEntrySnippet = lastEntry
      ? `\nÚLTIMA COMIDA REGISTRADA HOY (id=${lastEntry.id}, meal=${lastEntry.meal}, time=${lastEntry.time}):\n${JSON.stringify(lastEntry.items.map(i => ({ name: i.name, amount: i.amount, kcal: i.kcal, p: i.p, c: i.c, g: i.g })))}\n`
      : '\nÚLTIMA COMIDA REGISTRADA HOY: ninguna aún.\n';
    const voiceHint = voiceInput
      ? '\nIMPORTANTE: este texto vino por DICTADO DE VOZ. Puede haber errores de transcripción y faltar puntuación. Corrige palabras mal transcritas por contexto (ej: si dictado dice "quesito" pero hablaban de un postre, probablemente es "ponquecito/ponqué"; "faena" probablemente es "fainá"). Separa los items por contexto (ej: "3 arepas 2 huevos un café con leche" → 3 items distintos).\n'
      : '';
    const historyText = buildHistoryText();
    const historyBlock = historyText
      ? `\n═══ HISTORIAL RECIENTE DE LA CONVERSACIÓN (úsalo para mantener coherencia; si el cliente se refiere a algo dicho antes, recuérdalo) ═══\n${historyText}\n`
      : '';
    const contextSnippet = `
CONTEXTO DEL CLIENTE:
- Nombre: ${name || 'desconocido'}
- Comidas registradas hoy: ${entries.length}
- Totales hoy: ${totals.kcal} kcal · P ${totals.p}g · C ${totals.c}g · G ${totals.g}g
- Meta diaria: ${goals?.kcal || '?'} kcal · P ${goals?.p || '?'}g · C ${goals?.c || '?'}g · G ${goals?.g || '?'}g
- Hora actual: ${new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}${lastEntrySnippet}${voiceHint}${historyBlock}`;

    const sys = `Eres un asistente nutricional inteligente y cálido. Devuelves SOLO JSON válido, sin markdown.

═══ FILOSOFÍA CENTRAL ═══
1. PROHIBIDO ABSOLUTO decir "no entiendo", "no pude interpretar", "no comprendo", "no tengo acceso al historial" o frases similares. Eso genera fricción y el cliente abandona. SÍ tienes el historial reciente (viene junto al mensaje del cliente): úsalo.
2. SIEMPRE haz tu mejor interpretación. Si tienes >70% de certeza, REGISTRA directo y opcionalmente deja una nota breve tipo "asumí 1 huevo entero (~50g)".
3. PROCESA SIEMPRE TODOS LOS ALIMENTOS DEL MENSAJE. Está PROHIBIDO ignorar parte de una lista. Si el cliente menciona 8 alimentos, registras los 8. Nunca tomes solo una parte y dejes el resto.
4. CLARIFY ES EL ÚLTIMO RECURSO. Usa intent="clarify" SOLO cuando es literalmente imposible interpretar (palabra inventada sin sentido, o cantidad absurda como "200 huevos"). En CUALQUIER otro caso, REGISTRA con tu mejor estimación y deja nota en quantity_warning. Si el cliente responde algo corto como "una porción", "sí", "el grande", REVISA EL HISTORIAL para saber de qué alimento habla y regístralo — NO preguntes "¿de qué?".
5. Para cantidades sin gramos: ESTIMA con USDA estándar (1 huevo ≈ 50g, banana mediana ≈ 120g, arepa media ≈ 80g, taza de arroz cocido ≈ 160g, cucharada aceite ≈ 14g, 1 porción ≈ porción estándar del alimento en cuestión). NUNCA rechaces por "valores no cuadran".
6. COHERENCIA: si el cliente se refiere a algo que dijo antes ("esos ponquecitos", "lo que te dije", "la receta de antes"), búscalo en el HISTORIAL RECIENTE y sé consistente. NUNCA digas que no recuerdas.
7. IDIOMA: español neutro latinoamericano estándar. Trato de "tú" siempre, nunca "vos" ni "usted".
   PROHIBIDO ABSOLUTO:
   - Voseo argentino: "querés/tenés/decís/podés/registrá/armá/guardá/olvidá/sumá/pedí/dale". USA: quieres, tienes, dices, puedes, registra, arma, guarda, olvida, suma, pide.
   - Colombianismos: "regálame, parce, parcero, chévere, bacano, qué hubo, qué más, porfa, listo pues, ¡rico!, sabroso". USA: por favor, amigo (evítalo), bien, hola, listo (a secas), sabroso (evita), gracias.
   - Mexicanismos coloquiales: "órale, qué onda, chido, padre (=cool), híjole, ándale". USA equivalentes neutros.
   - Españolismos: "vale, tío/tía, mola, currar, guay, vosotros/vosotras". USA: bien, listo, está bien, trabajar, ustedes.
   Mantén tono cálido y profesional pero geográficamente neutro.
8. PRIORIDAD DE INTENT (orden estricto al clasificar). Aplica la PRIMERA que matchee:
   a) Si menciona "resumen", "reenvíame", "mándame", "muéstrame", "qué llevo", "cómo voy", "cuánto llevo", "qué he comido", "qué comí hoy" → SIEMPRE intent=summary_day (aunque mencione alimentos previos para contexto, tu trabajo es mostrar el día actual, NO registrar ni preguntar).
   b) Si menciona "semana", "semanal", "resumen semanal", "cómo voy esta semana" → intent=summary_week.
   c) Si hay última comida registrada hoy y dice "me faltó X", "olvidé X", "también comí X", "agrégale X a lo anterior", "súmale X" → intent=append_to_last.
   d) Si describe alimentos por primera vez sin las palabras de (a)(b)(c) → intent=log_meal.
   e) Resto de casos según las reglas de intents abajo.

═══ CÓMO REGISTRAR COMIDAS (categorización) ═══
El cliente puede registrar de dos formas. Adáptate a su intención:
- Si ETIQUETA explícitamente la comida ("desayuno: X", "en la cena comí Y", "almuerzo Z") → respeta esa etiqueta.
- Si dicta UNA LISTA LARGA de TODO el día de una vez:
  · Si hay PISTAS de momento ("en la mañana / al desayuno / al almuerzo / en la tarde / en la noche / de cena / de snack") → DIVIDE en varias comidas, una por cada bloque. Usa el campo "meals" (array) con un objeto por comida.
  · Si NO hay pistas de momento → regístralo TODO como UNA sola comida con meal="comida" (sin discriminar). NO inventes divisiones falsas.
- Si NO etiqueta y es claramente una sola comida puntual → asígnale la comida según la hora actual (antes 11h=desayuno, 11-16h=almuerzo, 16-21h=cena, resto=snack). Si dudas, usa meal="comida".
- REGLA DE ORO: procesa SIEMPRE el mensaje completo. Si es una lista de 10 cosas, las 10 quedan registradas en esta misma respuesta. JAMÁS tomes una parte y dejes el resto para "después".

═══ GLOSARIO DE ALIMENTOS REGIONALES (reconócelos aunque vengan mal transcritos por voz) ═══
- "ponqué/ponquecito/poncecito/quesito (si hablaban de postre)" = bizcocho/cupcake casero. ~250-350 kcal según receta.
- "fainá/faina/faena" = masa de garbanzos horneada. ~110 kcal/100g.
- "arepa" = ~150 kcal (media, maíz blanco).
- "patacón/tostón" = plátano verde frito. ~150 kcal/unidad.
- "tequeño" = dedo de queso frito. ~110 kcal/unidad.
- "palta/aguacate" = ~160 kcal/100g.
- "choclo" = maíz. "poroto" = frijol. "frutilla" = fresa. "durazno" = melocotón.
- "mate/yerba" = infusión, ~0 kcal sin azúcar.
Si una palabra dictada no calza con ningún alimento conocido, busca el alimento fonéticamente más cercano según el contexto antes de preguntar.

═══ VALORES NUTRICIONALES ═══
Usa SOLO valores reales (USDA, etiquetas comerciales). 1g P=4 kcal, 1g C=4 kcal, 1g G=9 kcal.
Sanity: huevo grande ~75 kcal, 100g pollo cocido ~165 kcal, 100g arroz cocido ~130 kcal, 100g avena cruda ~380 kcal, 1 manzana ~95 kcal, 1 plátano ~105 kcal, 1 arepa media maíz blanco ~150 kcal.

NOTA: Junto al mensaje del cliente recibes un bloque CONTEXTO DEL CLIENTE y un HISTORIAL RECIENTE. Úsalos siempre.

═══ INTENTS (elige UNO) ═══
- "log_meal": registrar comida(s) nueva(s). Ej: "desayuno: 2 huevos y café", "almorcé pollo con arroz". Si el mensaje cubre VARIAS comidas del día, usa el campo "meals" (array) con un objeto por comida. Si es UNA sola comida, usa "items" + "meal".
- "append_to_last": SUMAR alimentos a la ÚLTIMA comida registrada hoy (no crear meal nuevo). DETECTAR estos signos: "me faltó", "olvidé decirte", "también comí", "agregale", "sumá", "ah me acordé", "no te dije que también", "ese tercero suma a lo que ya registraste". SI hay última comida, los items van EN ELLA.
- "nutrition_query": pregunta informativa SIN registrar. Ej: "¿cuántas kcal tiene una manzana?", "¿es alta en proteína el atún?".
- "meal_suggestion": pregunta abierta sobre QUÉ COMER en una comida específica. DETECTAR: "qué puedo comer", "qué como", "ideas de cena", "qué me sugieres", "qué desayuno", "qué hago de almuerzo", "no sé qué cenar". Indica también el "meal" deseado (desayuno/almuerzo/snack/cena) si lo menciona. EL FRONTEND MANEJA la respuesta usando los ingredientes favoritos del cliente, así que tú solo clasifica.
- "summary_day": pide ver progreso/totales del día. Ej: "cómo voy", "cuánto llevo hoy", "resumen", "qué me falta".
- "summary_week": pide resumen semanal. Ej: "resumen semana", "cómo voy esta semana".
- "water": registra agua. "1 vaso"=250ml, "1 termo"=500ml, "1 botella"=500ml, "1 litro"=1000ml.
- "command": acción de UI. command ∈ {reset_day, change_goals, calendar, favorites, export, proportion, manage_favorites, plan_day}. Mapping: "reiniciar día"→reset_day, "cambiar meta"→change_goals, "calendario"→calendar, "favoritos/menús favoritos"→favorites, "exportar/descargar reporte"→export, "ayuda con proporciones/qué me sirve para cuadrar"→proportion, "mis ingredientes son X, Y, Z / suelo comprar X, Y / mis favoritos son X"→manage_favorites (los items vienen en "items" o "preview"), "armame el día/propón mi día/qué como hoy con lo que me gusta/distribuí lo que tengo"→plan_day.
- "clarify": SOLO si hay ambigüedad REAL. Llenar "clarify_interpretation" (tu mejor lectura) y "clarify_question" (pregunta corta de confirmación).
- "off_topic": saludos, charla, preguntas sobre el coach, "qué dieta hacer". Llena "message" con respuesta cálida y breve.
- "name": cliente dice su nombre. Llena "name_detected".

═══ SCHEMA ═══
{
  "intent": "log_meal | append_to_last | nutrition_query | meal_suggestion | summary_day | summary_week | water | command | clarify | off_topic | name",
  "meal": "desayuno | almuerzo | cena | snack | comida | null",
  "items": [{"name": "...", "amount": "...", "kcal": N, "p": N, "c": N, "g": N, "needs_quantity": false}],
  "meals": [{"meal": "desayuno|almuerzo|cena|snack|comida", "items": [{"name": "...", "amount": "...", "kcal": N, "p": N, "c": N, "g": N}]}] | null,
  "append_to_entry_id": N | null,
  "command": "reset_day | change_goals | calendar | favorites | export | proportion | null",
  "name_detected": "..." | null,
  "water_ml": N | null,
  "preview": "string corto resumen items | null",
  "quantity_warning": "nota breve sobre supuestos hechos (ej: 'asumí 1 huevo grande ~50g') | null",
  "nutrition_response": {"food": "...", "amount": "...", "kcal": N, "p": N, "c": N, "g": N} | null,
  "clarify_interpretation": "string | null",
  "clarify_question": "string | null",
  "message": "string respuesta cálida y breve | null"
}

═══ REGLAS ADICIONALES ═══
- Si intent=log_meal con UNA comida y no se especifica meal: si hay pista de momento úsala; si no, predice por hora (1ra del día y hora<11 → "desayuno"; hora 11-16 → "almuerzo"; hora 16-21 → "cena"; resto → "snack"); si igual dudas usa "comida".
- Si intent=log_meal con VARIAS comidas (lista de todo el día con pistas de momento): usa "meals" array, una entrada por comida, cada una con su "meal" e "items". Deja "items" vacío o null en ese caso.
- Si es lista de todo el día SIN pistas de momento: una sola comida con meal="comida" e todos los items en "items".
- Si intent=append_to_last, "append_to_entry_id" = id de la última comida (te lo pasé en CONTEXTO).
- Si el texto incluye "ah me acordé que comí también X", "olvidé decirte X", "me faltó X", "agregale X a lo de antes" Y hay última comida → SIEMPRE intent=append_to_last.
- Si menciona nombre propio en saludo ("soy Juan", "me llamo Ana") → intent=name, name_detected.
- "direct" tipo "250 kcal 22p 30c 5g" → intent=log_meal con 1 item.
- Si SOLO saluda ("hola", "buenas") sin comida → intent=off_topic, message="Hola${name ? ' ' + name.split(' ')[0] : ''}, cuéntame qué comiste y lo registro."
- Si pregunta qué comer / dieta → intent=off_topic, message="Yo calculo y registro. La recomendación es trabajo de Mauro. Para criterio personalizado escribile directo."
- Números enteros realistas. SIEMPRE llenar "preview" salvo en off_topic/clarify/name.
- needs_quantity SIEMPRE false (estima si no se especifica, deja nota en quantity_warning).`;

    // Dynamic context goes in the USER message (not the system prompt) so the system
    // prompt stays identical across calls and the cache hits.
    const userMessage = `${contextSnippet}\n\n═══ MENSAJE ACTUAL DEL CLIENTE ═══\n${text}`;

    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await callClaude(userMessage, sys);
        const clean = result.replace(/```json|```/g, '').trim();
        const jsonMatch = clean.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : clean);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  };

  // Auto-correct items instead of rejecting. Returns sanitized items, never rejects valid inputs.
  const sanitizeItems = (items) => {
    return items.map(it => {
      const p = Math.max(0, it.p || 0);
      const c = Math.max(0, it.c || 0);
      const g = Math.max(0, it.g || 0);
      const macroKcal = p * 4 + c * 4 + g * 9;
      // If declared kcal is wildly off from macros, trust macros
      let kcal = it.kcal || 0;
      if (kcal > 0 && macroKcal > 0 && (kcal < macroKcal * 0.6 || kcal > macroKcal * 1.6)) {
        kcal = Math.round(macroKcal);
      }
      // Round every macro to 1 decimal to avoid floating-point noise like 17.400000000000002
      const round1 = (n) => Math.round(n * 10) / 10;
      return {
        ...it,
        kcal: Math.min(Math.round(kcal), 5000),
        p: Math.min(round1(p), 400),
        c: Math.min(round1(c), 700),
        g: Math.min(round1(g), 300),
        needs_quantity: false,
      };
    });
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

    const fromVoice = voiceInputRef.current;
    voiceInputRef.current = false;
    const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;

    try {
      const parsed = await parseFoodEntry(userMsg, { voiceInput: fromVoice, lastEntry });
      if (parsed.preview) setLoadingPreview(`Calculando: ${parsed.preview}`);

      if (parsed.name_detected) {
        setName(parsed.name_detected);
        await window.storage.set('name', JSON.stringify(parsed.name_detected));
      }

      const intent = parsed.intent || parsed.type; // backward-tolerant

      // NUTRITION QUERY — info only, no register
      if (intent === 'nutrition_query' && parsed.nutrition_response) {
        setMessages(m => [...m, { role: 'assistant', content: 'macro_query', isMacroQuery: true, data: parsed.nutrition_response, ts: Date.now() }]);
        setLoading(false); setLoadingPreview('');
        return;
      }

      // WATER
      // MEAL SUGGESTION — what should I eat (uses favoriteIngredients)
      if (intent === 'meal_suggestion') {
        await handleMealSuggestion(parsed.meal || null);
        setLoading(false); setLoadingPreview('');
        return;
      }

      if (intent === 'water' && parsed.water_ml) {
        setWater(w => w + parsed.water_ml);
        haptic(15);
        setMessages(m => [...m, { role: 'assistant', content: 'water', isWater: true, ml: parsed.water_ml, ts: Date.now() }]);
        setLoading(false); setLoadingPreview('');
        return;
      }

      // OFF-TOPIC / WARM REPLY
      if (intent === 'off_topic' && parsed.message) {
        setMessages(m => [...m, { role: 'assistant', content: parsed.message, ts: Date.now() }]);
        setLoading(false); setLoadingPreview('');
        return;
      }

      // NAME only
      if (intent === 'name') {
        const firstName = parsed.name_detected ? parsed.name_detected.split(' ')[0] : '';
        setMessages(m => [...m, { role: 'assistant', content: firstName ? `Perfecto, ${firstName}. Cuando comas, cuéntame y lo registro.` : 'Perfecto. Cuando comas, cuéntame y lo registro.', ts: Date.now() }]);
        setLoading(false); setLoadingPreview('');
        return;
      }

      // SUMMARY DAY / WEEK
      if (intent === 'summary_day') {
        setMessages(m => [...m, { role: 'assistant', content: 'summary_detailed', isSummaryDetailed: true, entries: [...entries], totals: { ...totals }, ts: Date.now() }]);
        setLoading(false); setLoadingPreview('');
        maybeAppendGapSuggestion();
        return;
      }
      if (intent === 'summary_week') {
        setActiveModal('weekly');
        setLoading(false); setLoadingPreview('');
        return;
      }

      // UI COMMAND
      if (intent === 'command') {
        if (parsed.command === 'reset_day') setActiveModal('reset');
        else if (parsed.command === 'change_goals') setView('onboarding');
        else if (parsed.command === 'calendar') setActiveModal('calendar');
        else if (parsed.command === 'favorites') setActiveModal('favorites');
        else if (parsed.command === 'export') setActiveModal('export');
        else if (parsed.command === 'manage_favorites') {
          const fromItems = (parsed.items || []).map(i => (i.name || '').trim().toLowerCase()).filter(Boolean);
          if (fromItems.length > 0) {
            const merged = Array.from(new Set([...favoriteIngredients, ...fromItems]));
            setFavoriteIngredients(merged);
            setMessages(m => [...m, { role: 'assistant', content: `Guardé estos ingredientes: ${fromItems.join(', ')}. Cuando quieras te armo el día con esto.`, ts: Date.now() }]);
          } else {
            setShowIngredientsModal(true);
          }
        }
        else if (parsed.command === 'plan_day') {
          setShowPlannerModal(true);
          generatePlan();
        }
        else if (parsed.command === 'proportion') {
          if (parsed.items && parsed.items.length > 0) {
            const propResult = await calculateProportions(userMsg);
            setMessages(m => [...m, { role: 'assistant', content: 'proportion', isProportion: true, data: propResult, ts: Date.now() }]);
          } else {
            setMessages(m => [...m, {
              role: 'assistant',
              content: 'Indicame qué alimentos tienes disponibles. Calculo proporciones para cuadrar tus macros faltantes.\n\nEjemplo: "tengo pollo, arroz integral, brócoli y aceite de oliva"',
              ts: Date.now()
            }]);
          }
        }
        setLoading(false); setLoadingPreview('');
        return;
      }

      // CLARIFY — only when truly ambiguous
      if (intent === 'clarify' && (parsed.clarify_interpretation || parsed.clarify_question)) {
        const interp = parsed.clarify_interpretation ? `Entendí: ${parsed.clarify_interpretation}. ` : '';
        const q = parsed.clarify_question || '¿Es así?';
        setMessages(m => [...m, { role: 'assistant', content: `${interp}${q}`, ts: Date.now() }]);
        setLoading(false); setLoadingPreview('');
        return;
      }

      // APPEND TO LAST — add items to the previous entry
      if (intent === 'append_to_last' && parsed.items?.length > 0 && lastEntry) {
        const cleanItems = sanitizeItems(parsed.items);
        trackFrequency(cleanItems);
        haptic(12);
        const r1 = (n) => Math.round(n * 10) / 10;
        const addKcal = cleanItems.reduce((s, i) => s + (i.kcal || 0), 0);
        const addP = cleanItems.reduce((s, i) => s + (i.p || 0), 0);
        const addC = cleanItems.reduce((s, i) => s + (i.c || 0), 0);
        const addG = cleanItems.reduce((s, i) => s + (i.g || 0), 0);
        setEntries(es => es.map(e => {
          if (e.id !== lastEntry.id) return e;
          const newItems = [...e.items, ...cleanItems];
          return {
            ...e,
            items: newItems,
            kcal: Math.round((e.kcal || 0) + addKcal),
            p: r1((e.p || 0) + addP),
            c: r1((e.c || 0) + addC),
            g: r1((e.g || 0) + addG),
          };
        }));
        setMessages(m => [...m, {
          role: 'assistant', content: 'appended', isAppended: true,
          entryId: lastEntry.id, addedItems: cleanItems, quantityWarning: parsed.quantity_warning, ts: Date.now()
        }]);
        setLoading(false); setLoadingPreview('');
        return;
      }

      const r1 = (n) => Math.round(n * 10) / 10;

      // LOG MULTIPLE MEALS (whole day dictated with meal cues)
      if (intent === 'log_meal' && Array.isArray(parsed.meals) && parsed.meals.length > 0) {
        haptic(15);
        const baseId = Date.now();
        const newEntries = parsed.meals
          .filter(mealObj => mealObj && Array.isArray(mealObj.items) && mealObj.items.length > 0)
          .map((mealObj, idx) => {
            const cleanItems = sanitizeItems(mealObj.items);
            trackFrequency(cleanItems);
            return {
              id: baseId + idx,
              meal: mealObj.meal || 'comida',
              items: cleanItems,
              kcal: Math.round(cleanItems.reduce((s, i) => s + (i.kcal || 0), 0)),
              p: r1(cleanItems.reduce((s, i) => s + (i.p || 0), 0)),
              c: r1(cleanItems.reduce((s, i) => s + (i.c || 0), 0)),
              g: r1(cleanItems.reduce((s, i) => s + (i.g || 0), 0)),
              time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
              rawInput: userMsg,
              hasMissingQuantity: false,
            };
          });
        if (newEntries.length > 0) {
          setEntries(e => [...e, ...newEntries]);
          const newMsgs = newEntries.map(ne => ({
            role: 'assistant', content: 'logged', isLogged: true,
            entryId: ne.id, quantityWarning: null, ts: Date.now() + Math.random()
          }));
          if (parsed.quantity_warning) newMsgs[0].quantityWarning = parsed.quantity_warning;
          setMessages(m => [...m, ...newMsgs]);
          setLoading(false); setLoadingPreview('');
          return;
        }
      }

      // LOG MEAL (single new entry)
      if (intent === 'log_meal' && parsed.items?.length > 0) {
        const cleanItems = sanitizeItems(parsed.items);
        trackFrequency(cleanItems);
        haptic(12);
        const newEntry = {
          id: Date.now(),
          meal: parsed.meal || predictMealType(),
          items: cleanItems,
          kcal: Math.round(cleanItems.reduce((s, i) => s + (i.kcal || 0), 0)),
          p: r1(cleanItems.reduce((s, i) => s + (i.p || 0), 0)),
          c: r1(cleanItems.reduce((s, i) => s + (i.c || 0), 0)),
          g: r1(cleanItems.reduce((s, i) => s + (i.g || 0), 0)),
          time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
          rawInput: userMsg,
          hasMissingQuantity: false,
        };
        setEntries(e => [...e, newEntry]);
        setMessages(m => [...m, {
          role: 'assistant', content: 'logged', isLogged: true,
          entryId: newEntry.id, quantityWarning: parsed.quantity_warning, ts: Date.now()
        }]);
        setLoading(false); setLoadingPreview('');
        return;
      }

      // SOFT FALLBACK (never "no entiendo")
      const firstName = name ? name.split(' ')[0] : '';
      const greeting = firstName ? `${firstName}, ` : '';
      setMessages(m => [...m, {
        role: 'assistant',
        content: `${greeting}cuéntame con un poco más de detalle qué comiste, así lo registro bien. Ej: "almuerzo: 150g pollo, taza de arroz, ensalada".`,
        ts: Date.now()
      }]);
    } catch (e) {
      const isOverload = String(e?.message || '').includes('overloaded') || String(e?.message || '').includes('http:5');
      const firstName = name ? name.split(' ')[0] : '';
      const greeting = firstName ? `${firstName}, ` : '';
      const msg = isOverload
        ? `${greeting}el servicio está saturado un momento. Prueba de nuevo en unos segundos.`
        : `${greeting}tuve un problema procesando eso. ¿Puedes volver a escribirlo o agregar un detalle más?`;
      setMessages(m => [...m, { role: 'assistant', content: msg, ts: Date.now() }]);
    }

    setLoading(false); setLoadingPreview('');
  };

  const startVoice = async () => {
    // Try Whisper-based recording first (MediaRecorder). Fallback to Web Speech if it fails.
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const candidateMimes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg'];
        const mimeType = candidateMimes.find(m => MediaRecorder.isTypeSupported(m)) || '';
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          const blobType = recorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
          audioChunksRef.current = [];
          if (audioBlob.size < 1000) return; // muy corto, ignorar
          await transcribeAudio(audioBlob, blobType);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setRecording(true);
        haptic(15);
        return;
      } catch (err) {
        // Permisos denegados o error de mic -> caemos a Web Speech
        console.warn('MediaRecorder failed, falling back to Web Speech:', err);
      }
    }
    // Fallback: Web Speech API del navegador
    startVoiceFallback();
  };

  const startVoiceFallback = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('No pude acceder al micrófono. Verifica los permisos del navegador o escribe directamente.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'es';
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
      const txt = (finalTranscript + interimTranscript).trim();
      setInput(txt);
      if (txt) voiceInputRef.current = true;
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) { setRecording(false); }
  };

  const stopVoice = () => {
    // MediaRecorder path
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
      mediaRecorderRef.current = null;
      setRecording(false);
      haptic(10);
      return;
    }
    // Web Speech fallback path
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setRecording(false);
    haptic(10);
  };

  const transcribeAudio = async (audioBlob, mimeType) => {
    setTranscribing(true);
    try {
      const ext = mimeType.includes('mp4') ? 'mp4'
                : mimeType.includes('mpeg') ? 'mp3'
                : mimeType.includes('wav') ? 'wav'
                : 'webm';
      const formData = new FormData();
      formData.append('file', audioBlob, `recording.${ext}`);
      formData.append('model', 'whisper-1');
      formData.append('language', 'es');
      formData.append('response_format', 'json');
      // Glosario de palabras frecuentes que Whisper tiende a oír mal en español latam.
      // Esto le da contexto y reduce errores como "quesito" en lugar de "ponquecito".
      formData.append('prompt', 'Transcripción de una persona dictando lo que comió. Vocabulario frecuente: desayuno, almuerzo, cena, snack, ponqué, ponquecito, arepa, patacón, fainá, tequeño, palta, aguacate, plátano, banana, palta, choclo, poroto, yogur griego, mantequilla de maní, café con leche, huevo, claras de huevo, avena, arroz, pollo, pechuga, atún, salmón, lentejas, quinoa, brócoli, espinaca, almendras, nueces, mantequilla, aceite de oliva.');

      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Transcribe failed');
      }
      const data = await res.json();
      const txt = (data.text || '').trim();
      if (txt) {
        setInput(prev => (prev && prev.trim() ? prev.trim() + ' ' + txt : txt));
        voiceInputRef.current = true;
      }
    } catch (err) {
      console.error('Transcribe error:', err);
      alert('No pude transcribir el audio. Intenta de nuevo o escribe directamente.');
    } finally {
      setTranscribing(false);
    }
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
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
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
        {/* Warm cream blob — top-left */}
        <div className="main-blob-1 absolute" style={{
          top: '-12%', left: '-18%', width: '72%', height: '58%',
          background: 'radial-gradient(circle, rgba(247,243,232,0.95), transparent 65%)',
          filter: 'blur(70px)'
        }} />
        {/* Soft olive — top-right */}
        <div className="main-blob-2 absolute" style={{
          top: '4%', right: '-22%', width: '60%', height: '55%',
          background: `radial-gradient(circle, ${ACCENT_PASTEL}55, transparent 65%)`,
          filter: 'blur(85px)'
        }} />
        {/* Cream warm — bottom-left */}
        <div className="main-blob-3 absolute" style={{
          bottom: '-12%', left: '15%', width: '70%', height: '58%',
          background: 'radial-gradient(circle, rgba(250,246,236,0.95), transparent 60%)',
          filter: 'blur(75px)'
        }} />
        {/* Subtle peach — middle */}
        <div className="main-blob-4 absolute" style={{
          top: '38%', left: '5%', width: '55%', height: '48%',
          background: `radial-gradient(circle, ${C_PROTEIN_PASTEL}30, transparent 70%)`,
          filter: 'blur(90px)'
        }} />
        {/* Smoke blue accent — bottom-right */}
        <div className="main-blob-5 absolute" style={{
          bottom: '5%', right: '-12%', width: '52%', height: '48%',
          background: `radial-gradient(circle, ${C_FAT_PASTEL}28, transparent 70%)`,
          filter: 'blur(95px)'
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
        @keyframes mainBlob5 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(35px, -25px) scale(1.09); } }
        .main-blob-1 { animation: mainBlob1 22s ease-in-out infinite; }
        .main-blob-2 { animation: mainBlob2 26s ease-in-out infinite; }
        .main-blob-3 { animation: mainBlob3 20s ease-in-out infinite; }
        .main-blob-4 { animation: mainBlob4 24s ease-in-out infinite; }
        .main-blob-5 { animation: mainBlob5 28s ease-in-out infinite; }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .sheet-up { animation: sheetUp 0.32s cubic-bezier(0.2, 0, 0, 1); }
        @keyframes wave { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1.4); } }
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

      {/* Header — full-width app bar (sticky, robust against iOS keyboard) */}
      <div className="sticky top-0 w-full overflow-hidden" style={{
        background: '#1F1F1F',
        color: '#FFF',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        zIndex: 50,
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform'
      }}>
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{
          background: `radial-gradient(circle at 90% 30%, ${ACCENT}40, transparent 55%)`
        }} />
        <div className="relative max-w-2xl mx-auto px-5 py-2 flex items-center gap-3">
          <div className="display font-normal" style={{
            color: '#FFF',
            fontSize: '18px',
            lineHeight: 1,
            letterSpacing: '0.03em',
            textTransform: 'uppercase'
          }}>
            Meal Tracker
          </div>
          <div style={{ color: ACCENT_PASTEL, fontWeight: 600, fontSize: '10px', letterSpacing: '0.02em' }}>
            Entrena con Método
          </div>
        </div>
      </div>

      <div className="relative max-w-2xl mx-auto px-5 pt-3 pb-32" style={{ zIndex: 1 }}>


        {/* Goals card — sticky white glass; shrinks on scroll. Robust against iOS keyboard. */}
        <div className="sticky z-30 -mx-5 px-5" style={{
          top: '40px',
          paddingTop: cardCompact ? '4px' : '8px',
          paddingBottom: cardCompact ? '6px' : '12px',
          background: 'linear-gradient(180deg, #F9F7F1 0%, rgba(249,247,241,0.92) 80%, rgba(249,247,241,0.6) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'padding 0.25s cubic-bezier(0.2, 0, 0, 1)',
          transform: 'translate3d(0, 0, 0)',
          willChange: 'transform'
        }}>
        <div className="rounded-3xl relative" style={{
          padding: cardCompact ? '8px 12px' : '16px',
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset, 0 8px 28px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          transition: 'padding 0.25s cubic-bezier(0.2, 0, 0, 1)'
        }}>
          {/* Subtle organic blob inside the card */}
          <div className="absolute pointer-events-none" style={{
            top: '-30%', right: '-20%', width: '60%', height: '120%',
            background: `radial-gradient(circle, ${ACCENT_PASTEL}30, transparent 65%)`,
            filter: 'blur(40px)'
          }} />
          <div className="relative">
          {!cardCompact && (
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
          )}

          {!cardCompact && (
            <div className="text-center mb-3">
              <div className="text-[11px] tracking-[0.22em] uppercase font-semibold" style={{ color: TEXT_LIGHT }}>
                Hoy · <span className="capitalize" style={{ color: TEXT_MUTED }}>{formatDate(today)}</span>
                {streak >= 2 && (
                  <>
                    <span style={{ color: TEXT_LIGHT, margin: '0 6px' }}>·</span>
                    <span style={{ color: ACCENT_DARK, fontWeight: 600 }}>{streak} días seguidos</span>
                    <span style={{ color: ACCENT, marginLeft: 4 }}>●</span>
                  </>
                )}
              </div>
            </div>
          )}

          {cardCompact ? (
            <div className="flex items-center justify-between gap-2">
              <CompactMacro val={totals.kcal} goal={goals.kcal} color={ACCENT} label="kcal" />
              <CompactMacro val={totals.p} goal={goals.p} color={C_PROTEIN} label="P" unit="g" />
              <CompactMacro val={totals.c} goal={goals.c} color={C_CARBS} label="C" unit="g" />
              <CompactMacro val={totals.g} goal={goals.g} color={C_FAT} label="G" unit="g" />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1">
              <GlassRing val={totals.kcal} goal={goals.kcal} color={ACCENT} label="Calorías" unit="" />
              <GlassRing val={totals.p} goal={goals.p} color={C_PROTEIN} label="Proteína" unit="g" />
              <GlassRing val={totals.c} goal={goals.c} color={C_CARBS} label="Carbos" unit="g" />
              <GlassRing val={totals.g} goal={goals.g} color={C_FAT} label="Grasas" unit="g" />
            </div>
          )}
          </div>
        </div>
        </div>

        {/* Action FAB — fixed pill-shaped button, always visible while chatting */}
        {!actionsExpanded && (
          <button
            onClick={() => { haptic(10); setActionsExpanded(true); }}
            className="fixed z-40 rounded-full transition active:scale-95 flex items-center justify-center gap-1.5"
            style={{
              bottom: '96px',
              right: '20px',
              height: '46px',
              padding: '0 16px 0 14px',
              background: '#1F1F1F',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.08) inset'
            }}
            title="Herramientas y acciones">
            <Sparkles size={16} strokeWidth={2} style={{ color: ACCENT_PASTEL }} />
            <span className="text-[13px] font-semibold tracking-wide">Herramientas</span>
          </button>
        )}

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
                  className="p-2 rounded-full transition active:scale-95" style={{ background: SURFACE_2 }}>
                  <X size={16} style={{ color: TEXT_MUTED }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] tracking-[0.2em] uppercase font-bold mb-2 px-1" style={{ color: TEXT_MUTED }}>Día a día</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <ActionChipMini icon={<ChefHat size={19} strokeWidth={1.75} />} label="Arma mi día" pastel={ACCENT_PASTEL} color={ACCENT_DARK}
                      onClick={() => { haptic(8); setShowPlannerModal(true); setActionsExpanded(false); generatePlan(); }} />
                    <ActionChipMini icon={<RotateCcw size={19} strokeWidth={1.75} />} label="Repetir comida de ayer" pastel={ACCENT_PASTEL} color={ACCENT_DARK}
                      onClick={() => { haptic(8); repeatYesterday(); setActionsExpanded(false); }} />
                    <ActionChipMini icon={<Star size={19} strokeWidth={1.75} />} label="Menús favoritos" pastel={C_CARBS_PASTEL} color={C_CARBS}
                      onClick={() => { haptic(8); setActiveModal('favorites'); setActionsExpanded(false); }} />
                    <ActionChipMini icon={<Utensils size={19} strokeWidth={1.75} />} label="Mis ingredientes" pastel={C_CARBS_PASTEL} color={C_CARBS}
                      onClick={() => { haptic(8); setShowIngredientsModal(true); setActionsExpanded(false); }} />
                  </div>
                </div>

                <div>
                  <div className="text-[10px] tracking-[0.2em] uppercase font-bold mb-2 px-1" style={{ color: TEXT_MUTED }}>Tu progreso</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <ActionChipMini icon={<LineChart size={19} strokeWidth={1.75} />} label="Resumen del día" pastel={C_FAT_PASTEL} color={C_FAT}
                      onClick={() => { haptic(8); handleSend('ver resumen diario'); setActionsExpanded(false); }} />
                    <ActionChipMini icon={<Sparkles size={19} strokeWidth={1.75} />} label="Check-in del día" pastel={C_PROTEIN_PASTEL} color={C_PROTEIN}
                      onClick={() => { haptic(8); setShowWellbeingModal(true); setActionsExpanded(false); }} />
                    <ActionChipMini icon={<Calendar size={19} strokeWidth={1.75} />} label="Calendario" pastel={ACCENT_PASTEL} color={ACCENT}
                      onClick={() => { haptic(8); setActiveModal('calendar'); setActionsExpanded(false); }} />
                    <ActionChipMini icon={<PieChart size={19} strokeWidth={1.75} />} label="Ayuda con proporciones" pastel={C_PROTEIN_PASTEL} color={C_PROTEIN}
                      onClick={() => { haptic(8); setInput('Ayúdame con proporciones, tengo: '); setActionsExpanded(false); }} />
                  </div>
                </div>

                <div>
                  <div className="text-[10px] tracking-[0.2em] uppercase font-bold mb-2 px-1" style={{ color: TEXT_MUTED }}>Coach y configuración</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <ActionChipMini icon={<FileText size={19} strokeWidth={1.75} />} label="Reporte al coach" pastel={ACCENT_PASTEL} color={ACCENT_DARK}
                      onClick={() => { haptic(8); setActiveModal('export'); setActionsExpanded(false); }} />
                    <ActionChipMini icon={<Info size={19} strokeWidth={1.75} />} label="¿Qué puedo hacer?" pastel={ACCENT_PASTEL} color={ACCENT_DARK}
                      onClick={() => { haptic(8); setShowCapabilitiesModal(true); setActionsExpanded(false); }} />
                    <ActionChipMini icon={<RotateCcw size={19} strokeWidth={1.75} />} label="Reiniciar día" pastel="#E5E2D5" color={TEXT_MUTED}
                      onClick={() => { haptic(8); setActiveModal('reset'); setActionsExpanded(false); }} />
                  </div>
                </div>
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
                  onFavorite={addToFavorites}
                  onAcceptFavSuggestion={() => { haptic(10); setShowIngredientsModal(true); }}
                  onDismissFavSuggestion={() => { window.storage.set('favSuggestionDismissed', JSON.stringify(Date.now())).catch(() => {}); }}
                  onAcceptAutoFav={acceptAutoFavorite}
                  onDismissAutoFav={dismissAutoFavorite}
                  favoriteIngredients={favoriteIngredients}
                />
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
      {/* Jump-to-latest floating arrow — appears when scrolled away from bottom */}
      {showJumpToLatest && (
        <button
          onClick={() => { haptic(6); window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); }}
          className="fixed z-40 rounded-full transition active:scale-95 flex items-center justify-center"
          style={{
            bottom: keyboardOpen ? '156px' : '170px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40px',
            height: '40px',
            background: 'rgba(255,255,255,0.95)',
            color: TEXT,
            boxShadow: '0 6px 18px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04) inset'
          }}
          title="Ir al último mensaje">
          <ChevronDown size={18} strokeWidth={2.2} style={{ color: TEXT_MUTED }} />
        </button>
      )}

      <div className="fixed bottom-0 left-0 right-0 px-4 pb-5 pt-6 z-40" style={{
        background: `linear-gradient(180deg, transparent, ${BG}E6 30%, ${BG} 100%)`,
        display: actionsExpanded ? 'none' : 'block'
      }}>
        <div className="max-w-2xl mx-auto">
          {/* Voice waveform when recording */}
          {recording && (
            <div className="flex items-center justify-center gap-1 mb-2 h-6">
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} style={{
                  width: '3px',
                  height: '100%',
                  background: C_PROTEIN,
                  borderRadius: '2px',
                  animation: `wave 0.9s ease-in-out ${i * 0.08}s infinite`,
                  transformOrigin: 'center'
                }} />
              ))}
            </div>
          )}
          {input.trim() && !input.toLowerCase().match(/desayuno|almuerzo|cena|snack|reiniciar|cambiar|resumen|semanal|calendario|exportar|favoritos|proporciones|agua|cuántas|cuanto|cuánto/) && (
            <div className="text-[10px] text-center mb-2 px-3 py-1 rounded-full inline-block" style={{
              background: ACCENT_PASTEL + '60', color: ACCENT_DARK, fontWeight: 500
            }}>
              → se registrará como {predictedMeal}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} autoComplete="off" className="flex items-center gap-2 p-2 rounded-2xl" style={{
            background: SURFACE,
            border: `1px solid ${recording ? C_PROTEIN : BORDER}`,
            boxShadow: recording ? `0 0 0 3px ${C_PROTEIN}25, 0 8px 32px rgba(0,0,0,0.08)` : '0 8px 32px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
            transition: 'border 0.2s, box-shadow 0.2s'
          }}>
            {/* Honeypot fields trick iOS into not showing autofill bar (key/credit-card/address) on the real input */}
            <input type="text" name="username" autoComplete="username" tabIndex={-1} style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }} />
            <input type="password" name="password" autoComplete="current-password" tabIndex={-1} style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }} />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onFocus={() => setActionsExpanded(false)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), e.target.blur(), handleSend())}
              placeholder={recording ? 'Escuchando…' : transcribing ? 'Transcribiendo…' : 'Escribe o dicta lo que comiste…'}
              className="flex-1 bg-transparent px-3 py-3 outline-none"
              style={{ color: TEXT, fontSize: '16px' }}
              readOnly={recording || transcribing}
              type="search"
              role="textbox"
              name="q"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="sentences"
              spellCheck="false"
              inputMode="text"
              enterKeyHint="send"
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
            />
            <button
              type="button"
              onClick={recording ? stopVoice : startVoice}
              disabled={transcribing}
              className="p-3 rounded-xl transition active:scale-[0.95] disabled:opacity-60"
              style={{
                background: recording ? C_PROTEIN : SURFACE_2,
                color: recording ? '#fff' : TEXT_MUTED,
                transition: 'background 0.2s'
              }}
              title={recording ? 'Detener dictado' : transcribing ? 'Transcribiendo…' : 'Dictar por voz'}>
              {transcribing
                ? <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                : <Mic size={16} strokeWidth={2} className={recording ? 'pulse-ring' : ''} />}
            </button>
            <button
              type="submit"
              disabled={!input.trim() || loading || recording}
              className="p-3 rounded-xl transition disabled:opacity-30 active:scale-[0.95]"
              style={{ background: '#1F1F1F', color: '#fff' }}>
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          </form>
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

      {showWellbeingModal && (
        <WellbeingModal
          name={name}
          existing={wellbeing[today]}
          onSave={saveWellbeing}
          onClose={() => setShowWellbeingModal(false)} />
      )}

      {showIngredientsModal && (
        <IngredientsModal
          ingredients={favoriteIngredients}
          onSave={(list) => { setFavoriteIngredients(list); setShowIngredientsModal(false); }}
          onClose={() => setShowIngredientsModal(false)} />
      )}

      {showPlannerModal && (
        <PlannerModal
          loading={plannerLoading}
          proposal={plannerProposal}
          ingredients={favoriteIngredients}
          onRegenerate={generatePlan}
          onRegister={registerPlan}
          onSaveFavorite={savePlanAsFavorite}
          onEditIngredients={() => { setShowPlannerModal(false); setShowIngredientsModal(true); }}
          onClose={() => { setShowPlannerModal(false); setPlannerProposal(null); }} />
      )}

      {showCapabilitiesModal && (
        <CapabilitiesModal onClose={() => setShowCapabilitiesModal(false)} />
      )}
    </div>
  );
}

function composeDayOpening(name, yesterday, goals) {
  const firstName = name ? name.split(' ')[0] : '';
  const greeting = firstName ? `Hola ${firstName}, bienvenido(a) de vuelta.` : 'Bienvenido(a) de vuelta.';
  if (!yesterday || !goals) {
    return `${greeting} Empecemos a registrar. Cuéntame qué comiste hoy o pregúntame las calorías y macros de cualquier alimento. También puedo armar tu día si me dices qué ingredientes te gustan.`;
  }

  const tolerance = 0.05;
  const inRange = (val, goal) => val >= goal * (1 - tolerance) && val <= goal * (1 + tolerance);
  const pDiff = goals.p - yesterday.p;
  const cDiff = goals.c - yesterday.c;
  const gDiff = goals.g - yesterday.g;

  let dayNote;
  if (yesterday.kcal === 0) {
    dayNote = 'Ayer no quedó registro. Hoy lo retomamos sin presión.';
  } else if (inRange(yesterday.kcal, goals.kcal) && inRange(yesterday.p, goals.p) &&
      inRange(yesterday.c, goals.c) && inRange(yesterday.g, goals.g)) {
    dayNote = 'Ayer cerraste con precisión en las cuatro metas. Hoy seguimos en ese ritmo.';
  } else {
    const offBy = [
      { name: 'proteína', diff: pDiff, abs: Math.abs(pDiff), unit: 'g' },
      { name: 'carbohidratos', diff: cDiff, abs: Math.abs(cDiff), unit: 'g' },
      { name: 'grasas', diff: gDiff, abs: Math.abs(gDiff), unit: 'g' },
    ].sort((a, b) => b.abs - a.abs)[0];
    if (offBy.abs < 10) {
      dayNote = 'Ayer cerraste muy cerca de las metas. Hoy ajustamos los detalles.';
    } else if (offBy.diff > 0) {
      dayNote = `Ayer cerraste con ${offBy.name} bajo por ${offBy.abs}${offBy.unit}. Hoy podemos compensar desde el desayuno.`;
    } else {
      dayNote = `Ayer cerraste con ${offBy.name} ${offBy.abs}${offBy.unit} por encima. Hoy moderamos.`;
    }
  }
  return `${greeting} ${dayNote}`;
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
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatDateShort(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
}

// True Apple-style glass ring — the chart is the focal element
function CompactMacro({ val, goal, color, label, unit = '' }) {
  const pct = goal > 0 ? Math.min(1, val / goal) : 0;
  const size = 28;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = circ * pct;
  const center = size / 2;
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <svg width={size} height={size} className="flex-shrink-0">
        <circle cx={center} cy={center} r={radius} fill="none" stroke={color} strokeOpacity="0.18" strokeWidth={stroke} />
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        </g>
      </svg>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold leading-tight" style={{ color: TEXT_LIGHT }}>{label}</div>
        <div className="text-[12px] font-bold num leading-tight" style={{ color: TEXT, letterSpacing: '-0.01em' }}>
          {Math.round(val)}{unit}
        </div>
      </div>
    </div>
  );
}

function GlassRing({ val, goal, color, label, unit = 'g' }) {
  const size = 78;
  const stroke = 5;
  const center = size / 2;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(1, val / goal);
  const dash = circ * pct;
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

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size}>
          {/* Track (background) */}
          <circle cx={center} cy={center} r={radius}
            fill="none"
            stroke={color}
            strokeOpacity="0.14"
            strokeWidth={stroke} />
          {/* Progress — clean stroke, no glow */}
          <g transform={`rotate(-90 ${center} ${center})`}>
            <circle cx={center} cy={center} r={radius}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              style={{
                transition: 'stroke-dasharray 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }} />
          </g>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[18px] font-bold num" style={{
            color: TEXT, lineHeight: 1, letterSpacing: '-0.02em',
            transform: popped ? 'scale(1.18)' : 'scale(1)',
            transition: 'transform 0.36s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {Math.round(val)}
          </div>
          <div className="text-[9px] num mt-0.5 font-medium" style={{ color: TEXT_LIGHT }}>
            /{goal}{unit}
          </div>
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-wider mt-2 font-semibold" style={{ color: TEXT_MUTED, letterSpacing: '0.1em' }}>
        {label}
      </div>
    </div>
  );
}


function ActionChipMini({ icon, label, color, pastel, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 px-3.5 py-3.5 rounded-2xl active:scale-[0.97]"
      style={{
        background: 'rgba(255,255,255,0.7)',
        border: `1px solid rgba(0,0,0,0.05)`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        transition: 'transform 0.08s ease-out, background 0.12s ease-out'
      }}>
      <div className="shrink-0" style={{ color: color || TEXT }}>
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

function MessageBubble({ message, goals, totals, entries, historyDetail, onEdit, onDelete, onFavorite, onAcceptFavSuggestion, onDismissFavSuggestion, onAcceptAutoFav, onDismissAutoFav, favoriteIngredients = [] }) {
  if (message.isAutoFavoriteSuggestion && message.suggestedKey) {
    const alreadyAdded = favoriteIngredients.includes(message.suggestedKey);
    return (
      <div className="flex justify-start fade-up">
        <div className="max-w-[90%] p-4 rounded-2xl rounded-bl-md text-sm" style={{
          background: ACCENT_PASTEL + '40',
          border: `1px solid ${ACCENT_PASTEL}`,
        }}>
          <div className="flex items-center gap-2 mb-2">
            <Star size={14} style={{ color: ACCENT_DARK }} />
            <span className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: ACCENT_DARK }}>Sugerencia</span>
          </div>
          {alreadyAdded ? (
            <div className="text-[13px]" style={{ color: TEXT, lineHeight: 1.5 }}>
              Agregué <strong>{message.suggestedName}</strong> a tus ingredientes favoritos.
            </div>
          ) : (
            <>
              <div className="text-[13px] mb-3" style={{ color: TEXT, lineHeight: 1.5 }}>
                Noto que registras <strong>{message.suggestedName}</strong> con frecuencia. ¿Lo agrego a tu lista de ingredientes favoritos para usarlo en "Arma mi día"?
              </div>
              <div className="flex gap-2">
                <button onClick={() => onAcceptAutoFav(message.suggestedKey)}
                  className="flex-1 py-2 rounded-xl text-[12px] font-semibold active:scale-95"
                  style={{ background: '#1F1F1F', color: '#fff' }}>
                  Sí, agregar
                </button>
                <button onClick={() => onDismissAutoFav(message.suggestedKey)}
                  className="flex-1 py-2 rounded-xl text-[12px] font-semibold active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.7)', color: TEXT_MUTED, border: `1px solid ${BORDER}` }}>
                  No, gracias
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (message.isFavSuggestion) {
    return (
      <div className="flex justify-start fade-up">
        <div className="max-w-[90%] p-4 rounded-2xl rounded-bl-md text-sm" style={{
          background: ACCENT_PASTEL + '40',
          border: `1px solid ${ACCENT_PASTEL}`,
        }}>
          <div className="flex items-center gap-2 mb-2">
            <ChefHat size={14} style={{ color: ACCENT_DARK }} />
            <span className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: ACCENT_DARK }}>Sugerencia</span>
          </div>
          <div className="text-[13px] mb-3" style={{ color: TEXT, lineHeight: 1.5 }}>{message.content}</div>
          <div className="flex gap-2">
            <button onClick={onAcceptFavSuggestion}
              className="flex-1 py-2 rounded-xl text-[12px] font-semibold transition active:scale-95"
              style={{ background: '#1F1F1F', color: '#fff' }}>
              Sí, configurar
            </button>
            <button onClick={onDismissFavSuggestion}
              className="flex-1 py-2 rounded-xl text-[12px] font-semibold transition active:scale-95"
              style={{ background: 'rgba(255,255,255,0.7)', color: TEXT_MUTED, border: `1px solid ${BORDER}` }}>
              Más tarde
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="mb-3" style={{ color: TEXT, lineHeight: 1.5 }}>{message.content}</div>
          <div className="space-y-2 text-xs" style={{ color: TEXT_MUTED }}>
            <div className="flex items-start gap-2">
              <Utensils size={11} style={{ color: ACCENT_DARK, marginTop: 2, flexShrink: 0 }} />
              <span>Registra lo que comiste en lenguaje natural: <em>"2 huevos, avena con plátano y café"</em>.</span>
            </div>
            <div className="flex items-start gap-2">
              <Info size={11} style={{ color: ACCENT, marginTop: 2, flexShrink: 0 }} />
              <span>Consulta macros sin registrar: <em>"¿cuántas calorías tiene una manzana?"</em></span>
            </div>
            <div className="flex items-start gap-2">
              <ChefHat size={11} style={{ color: ACCENT_DARK, marginTop: 2, flexShrink: 0 }} />
              <span>Dime tus ingredientes habituales y te <strong style={{ color: TEXT }}>armo el día</strong>: <em>"armame el día con lo que me gusta"</em>.</span>
            </div>
            <div className="flex items-start gap-2">
              <Mic size={11} style={{ color: C_PROTEIN, marginTop: 2, flexShrink: 0 }} />
              <span>También puedes dictar por voz. Toca el micrófono.</span>
            </div>
          </div>
          <button onClick={() => { haptic(8); window.dispatchEvent(new CustomEvent('openCapabilities')); }}
            className="mt-3 w-full py-2.5 rounded-xl text-[12px] font-semibold transition active:scale-[0.98] flex items-center justify-center gap-1.5"
            style={{ background: '#1F1F1F', color: '#fff' }}>
            <Info size={12} /> ¿Qué puedo hacer aquí?
          </button>
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
              <span className="num font-medium" style={{ color: ACCENT_DARK }}>{Math.round(e.kcal ?? 0)} kcal</span>
            </div>
            <div className="flex gap-3 text-[10px] mt-1 num">
              <span style={{ color: C_PROTEIN }}>P {Math.round((e.p ?? 0) * 10) / 10}g</span>
              <span style={{ color: C_CARBS }}>C {Math.round((e.c ?? 0) * 10) / 10}g</span>
              <span style={{ color: C_FAT }}>G {Math.round((e.g ?? 0) * 10) / 10}g</span>
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

  if (message.isMealSuggestion && message.data) {
    const { options = [], missingFavorites, mealType, remaining } = message.data;
    const mealLabel = mealType ? mealType.charAt(0).toUpperCase() + mealType.slice(1) : 'Comida';
    return (
      <div className="flex justify-start fade-up">
        <div className="max-w-[92%] p-4 rounded-2xl rounded-bl-md text-sm w-full" style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.7) inset'
        }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1 rounded-full" style={{ background: ACCENT_PASTEL + '60' }}>
              <ChefHat size={11} style={{ color: ACCENT_DARK }} strokeWidth={2.2} />
            </div>
            <span className="text-[11px] uppercase tracking-[0.15em] font-semibold" style={{ color: ACCENT_DARK }}>{mealLabel} · opciones</span>
          </div>

          {missingFavorites ? (
            <div className="p-3 rounded-xl text-[12.5px]" style={{ background: ACCENT_PASTEL + '30', color: TEXT, lineHeight: 1.55 }}>
              Para sugerirte opciones con lo que comes habitualmente, necesito que primero configures tus alimentos favoritos en <strong>Mis ingredientes</strong> (desde Herramientas).
              <div className="mt-2 text-[11.5px]" style={{ color: TEXT_MUTED }}>
                Cuanto más completa esté tu lista de ingredientes saludables, mejores opciones puedo darte. Para criterio personalizado, también puedes consultar con tu coach.
              </div>
            </div>
          ) : options.length === 0 ? (
            <div className="p-3 rounded-xl text-[12.5px]" style={{ background: ACCENT_PASTEL + '30', color: TEXT, lineHeight: 1.55 }}>
              Con la lista actual de ingredientes no puedo armar opciones para esa comida. Agrega más alimentos en <strong>Mis ingredientes</strong> y te doy mejores propuestas.
            </div>
          ) : (
            <>
              <div className="text-[11.5px] mb-3" style={{ color: TEXT_MUTED, lineHeight: 1.5 }}>
                Basándome en los ingredientes que sueles tener, podrías combinar:
              </div>
              <div className="space-y-2.5">
                {options.map((opt, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: ACCENT_PASTEL + '25', border: `1px solid ${ACCENT_PASTEL}80` }}>
                    <div className="text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: ACCENT_DARK }}>Opción {i + 1}</div>
                    <div className="space-y-0.5">
                      {opt.items.map((it, j) => (
                        <div key={j} className="text-[12.5px] flex justify-between gap-3">
                          <span style={{ color: TEXT }}>{it.name}{it.amount ? ` · ${it.amount}` : ''}</span>
                          <span className="num" style={{ color: TEXT_LIGHT }}>{Math.round(it.kcal || 0)} kcal</span>
                        </div>
                      ))}
                    </div>
                    {opt.subtotal && (
                      <div className="text-[10px] pt-1.5 mt-1.5 border-t flex gap-3 num" style={{ borderColor: BORDER_SOFT, color: TEXT_MUTED }}>
                        <span>≈ {Math.round(opt.subtotal.kcal || 0)} kcal</span>
                        <span style={{ color: C_PROTEIN }}>P {Math.round((opt.subtotal.p || 0) * 10) / 10}g</span>
                        <span style={{ color: C_CARBS }}>C {Math.round((opt.subtotal.c || 0) * 10) / 10}g</span>
                        <span style={{ color: C_FAT }}>G {Math.round((opt.subtotal.g || 0) * 10) / 10}g</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-3 pt-3 border-t text-[10px] italic" style={{ borderColor: BORDER_SOFT, color: TEXT_LIGHT, lineHeight: 1.5 }}>
            Esto es solo cálculo organizativo basado en los ingredientes que registraste como habituales. No constituye consejo nutricional. Para criterio personalizado, consulta con tu coach.
          </div>
        </div>
      </div>
    );
  }

  if (message.isGapSuggestions && message.data) {
    const { gaps = [], options = [], missingFavorites } = message.data;
    const significantGaps = gaps.filter(g => g.remaining > 0 && (g.goal > 0 && g.remaining / g.goal >= 0.10));
    return (
      <div className="flex justify-start fade-up">
        <div className="max-w-[92%] p-4 rounded-2xl rounded-bl-md text-sm w-full" style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.7) inset'
        }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1 rounded-full" style={{ background: ACCENT_PASTEL + '60' }}>
              <PieChart size={11} style={{ color: ACCENT_DARK }} strokeWidth={2.2} />
            </div>
            <span className="text-[11px] uppercase tracking-[0.15em] font-semibold" style={{ color: ACCENT_DARK }}>Lo que falta hoy</span>
          </div>

          <div className="space-y-1 mb-3">
            {significantGaps.map((g, i) => (
              <div key={i} className="text-[12px] flex justify-between gap-3">
                <span style={{ color: TEXT }}>Faltan <strong>{Math.round(g.remaining * 10) / 10}{g.unit}</strong> de {g.label}</span>
                <span className="num" style={{ color: TEXT_LIGHT }}>meta {g.goal}{g.unit}</span>
              </div>
            ))}
          </div>

          {missingFavorites ? (
            <div className="p-3 rounded-xl text-[12px]" style={{ background: ACCENT_PASTEL + '30', color: TEXT, lineHeight: 1.55 }}>
              Para ayudarte con equivalencias de lo que comes habitualmente, agrega tus alimentos favoritos en <strong>Mis ingredientes</strong> (desde Herramientas). Necesito al menos 3 para calcular opciones reales.
            </div>
          ) : options.length > 0 && (
            <>
              <div className="text-[10px] uppercase tracking-wider font-semibold mb-2 mt-1" style={{ color: TEXT_LIGHT }}>
                De tus ingredientes, equivalencias para cubrirlo
              </div>
              <div className="space-y-2.5">
                {options.map((opt, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: ACCENT_PASTEL + '25', border: `1px solid ${ACCENT_PASTEL}80` }}>
                    <div className="text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: ACCENT_DARK }}>Opción {i + 1}</div>
                    <div className="space-y-0.5">
                      {opt.items.map((it, j) => (
                        <div key={j} className="text-[12px] flex justify-between gap-3">
                          <span style={{ color: TEXT }}>{it.name}{it.amount ? ` · ${it.amount}` : ''}</span>
                          <span className="num" style={{ color: TEXT_LIGHT }}>{Math.round(it.kcal || 0)} kcal</span>
                        </div>
                      ))}
                    </div>
                    {opt.subtotal && (
                      <div className="text-[10px] pt-1.5 mt-1.5 border-t flex gap-3 num" style={{ borderColor: BORDER_SOFT, color: TEXT_MUTED }}>
                        <span>≈ {Math.round(opt.subtotal.kcal || 0)} kcal</span>
                        <span style={{ color: C_PROTEIN }}>P {Math.round((opt.subtotal.p || 0) * 10) / 10}g</span>
                        <span style={{ color: C_CARBS }}>C {Math.round((opt.subtotal.c || 0) * 10) / 10}g</span>
                        <span style={{ color: C_FAT }}>G {Math.round((opt.subtotal.g || 0) * 10) / 10}g</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-3 pt-3 border-t text-[10px] italic" style={{ borderColor: BORDER_SOFT, color: TEXT_LIGHT, lineHeight: 1.5 }}>
            Esto es solo cálculo organizativo. No constituye consejo nutricional ni reemplaza la valoración de un profesional.
          </div>
        </div>
      </div>
    );
  }

  if (message.isAppended && message.entryId) {
    const e = entries.find(x => x.id === message.entryId);
    if (!e) return null;
    const added = message.addedItems || [];
    const addedKeys = new Set(added.map(it => `${it.name}|${it.amount || ''}`));
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
              <span className="text-[11px] uppercase tracking-[0.15em] font-semibold" style={{ color: ACCENT_DARK }}>{e.meal} actualizado</span>
              <span className="text-[10px]" style={{ color: TEXT_LIGHT }}>{e.time}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => onFavorite(e)} className="p-1 rounded-full hover:bg-black/5 transition">
                <Star size={12} style={{ color: TEXT_LIGHT }} />
              </button>
              <button onClick={() => onEdit(e.id)} className="p-1 rounded-full hover:bg-black/5 transition">
                <Pencil size={12} style={{ color: TEXT_LIGHT }} />
              </button>
              <button onClick={() => onDelete(e.id)} className="p-1 rounded-full hover:bg-black/5 transition">
                <Trash2 size={12} style={{ color: TEXT_LIGHT }} />
              </button>
            </div>
          </div>

          {message.quantityWarning && (
            <div className="mb-3 p-2.5 rounded-xl flex items-start gap-2 text-[11px]" style={{ background: '#FBF1E5', color: WARN }}>
              <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{message.quantityWarning}</span>
            </div>
          )}

          <div className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: ACCENT_DARK }}>
            Sumé estos {added.length === 1 ? 'ítem' : 'ítems'}
          </div>
          <div className="space-y-1 mb-3 p-2.5 rounded-xl" style={{ background: ACCENT_PASTEL + '30' }}>
            {added.map((it, i) => (
              <div key={i} className="text-xs flex justify-between gap-3">
                <span style={{ color: TEXT }}>+ {it.name}{it.amount ? ` · ${it.amount}` : ''}</span>
                <span className="num" style={{ color: TEXT_LIGHT }}>{Math.round(it.kcal ?? 0)} kcal</span>
              </div>
            ))}
          </div>

          <div className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: TEXT_LIGHT }}>
            Comida completa
          </div>
          <div className="space-y-1 mb-3">
            {e.items.map((it, i) => {
              const isAdded = addedKeys.has(`${it.name}|${it.amount || ''}`);
              return (
                <div key={i} className="text-xs flex justify-between gap-3">
                  <span style={{ color: isAdded ? ACCENT_DARK : TEXT, fontWeight: isAdded ? 600 : 400 }}>
                    {it.name}{it.amount ? ` · ${it.amount}` : ''}
                  </span>
                  <span className="num" style={{ color: TEXT_LIGHT }}>{Math.round(it.kcal ?? 0)} kcal</span>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t" style={{ borderColor: BORDER_SOFT }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: TEXT_MUTED }}>Nuevo total comida</span>
              <span className="num font-medium" style={{ color: ACCENT_DARK }}>{Math.round(e.kcal ?? 0)} kcal</span>
            </div>
            <div className="flex gap-3 text-[10px] mt-1 num">
              <span style={{ color: C_PROTEIN }}>P {Math.round((e.p ?? 0) * 10) / 10}g</span>
              <span style={{ color: C_CARBS }}>C {Math.round((e.c ?? 0) * 10) / 10}g</span>
              <span style={{ color: C_FAT }}>G {Math.round((e.g ?? 0) * 10) / 10}g</span>
            </div>
          </div>
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
                    <span style={{ color: ACCENT_DARK, fontWeight: 600 }}>{Math.round(e.kcal ?? 0)} kcal</span>
                    <span style={{ color: C_PROTEIN }}>P {Math.round((e.p ?? 0) * 10) / 10}g</span>
                    <span style={{ color: C_CARBS }}>C {Math.round((e.c ?? 0) * 10) / 10}g</span>
                    <span style={{ color: C_FAT }}>G {Math.round((e.g ?? 0) * 10) / 10}g</span>
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
  const monthName = viewDate.toLocaleDateString('es', { month: 'long', year: 'numeric' });

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
          const inGoal = hasData && goalPct >= 0.90 && goalPct <= 1.10;
          const isFuture = cell.dateStr > today;
          const dotColor = !hasData
            ? (isFuture ? 'transparent' : '#D0CFC6')   // gris para días pasados sin registro
            : inGoal ? SUCCESS : ACCENT;
          return (
            <button key={i} onClick={() => setSelectedDate(cell.dateStr)}
              className="aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition relative"
              style={{
                background: isSelected ? ACCENT : (hasData ? ACCENT_PASTEL + '40' : 'transparent'),
                color: isSelected ? '#fff' : (isFuture ? TEXT_LIGHT : TEXT),
                border: isToday && !isSelected ? `1.5px solid ${ACCENT}` : 'none',
                fontWeight: isToday || isSelected ? 600 : 400
              }}>
              <span>{cell.day}</span>
              {!isSelected && dotColor !== 'transparent' && (
                <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{
                  background: dotColor,
                  opacity: !hasData ? 0.5 : 1
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mb-4 text-[10px]" style={{ color: TEXT_MUTED }}>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: SUCCESS }} />
          <span>En meta</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
          <span>Con registro</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#D0CFC6', opacity: 0.5 }} />
          <span>Sin registro</span>
        </div>
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
                      <span style={{ color: ACCENT_DARK, fontWeight: 600 }}>{Math.round(e.kcal ?? 0)} kcal</span>
                      <span style={{ color: C_PROTEIN }}>P{Math.round((e.p ?? 0) * 10) / 10}</span>
                      <span style={{ color: C_CARBS }}>C{Math.round((e.c ?? 0) * 10) / 10}</span>
                      <span style={{ color: C_FAT }}>G{Math.round((e.g ?? 0) * 10) / 10}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-center py-4" style={{ color: TEXT_LIGHT, lineHeight: 1.5 }}>
            Este día quedó sin registro.<br />Pasa. Lo importante es lo que viene.
          </div>
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
  const [busy, setBusy] = useState(null); // 'download' | 'send' | null
  const [sendStatus, setSendStatus] = useState(null); // 'success' | 'error' | null

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

  const generateReport = async (mode = 'download') => {
    setBusy(mode);
    if (mode === 'send') setSendStatus(null);
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
      const metaLine = `${name ? `Cliente: ${name}  ·  ` : ''}Periodo: ${days} días  ·  Generado: ${new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}`;
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

      if (mode === 'download') {
        doc.save(`Reporte_${name ? name.replace(/\s+/g, '_') : 'Cliente'}_${today}.pdf`);
        setTimeout(() => setBusy(null), 500);
      } else {
        // Send via Resend
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const summary = `<div style="font-family: -apple-system, sans-serif; max-width: 600px; color: #1A1A1A;">
  <div style="background: #0E0E0E; color: #fff; padding: 20px; border-radius: 12px 12px 0 0;">
    <div style="font-size: 22px; font-weight: 700;">REPORTE AL COACH</div>
    <div style="height: 2px; width: 40px; background: #C8D0AE; margin: 8px 0;"></div>
    <div style="font-size: 13px; opacity: 0.85;">Entrena con Método · Envío manual</div>
  </div>
  <div style="background: #F9F7F1; padding: 20px; border-radius: 0 0 12px 12px; border: 1px solid #E5E2D5;">
    <div style="font-size: 16px; font-weight: 600;">${name || 'Cliente'}</div>
    <div style="font-size: 12px; color: #6B6B6B; margin-bottom: 12px;">Últimos ${days} días · ${sortedDates.length} con registro</div>
    <div style="font-size: 13px; color: #1A1A1A; line-height: 1.55;">Adjunto encontrarás el reporte detallado en PDF.</div>
  </div>
</div>`;
        const res = await fetch('/api/send-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientName: name || 'Cliente', summary, pdfBase64, weekLabel: today }),
        });
        if (!res.ok) throw new Error('send failed');
        setSendStatus('success');
        setBusy(null);
      }
    } catch (e) {
      setBusy(null);
      if (mode === 'send') {
        setSendStatus('error');
      } else {
        alert('Hubo un error generando el PDF. Intenta de nuevo.');
      }
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
                ? { background: '#1F1F1F', color: '#fff' }
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

      <button onClick={() => generateReport('download')} disabled={busy !== null || sortedDates.length === 0}
        className="w-full py-3.5 rounded-2xl text-[15px] font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
        style={{
          background: '#1F1F1F',
          color: '#fff',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.1) inset'
        }}>
        {busy === 'download' ? <><Loader2 size={15} className="animate-spin" /> Generando PDF…</> : <><FileText size={15} /> Descargar reporte PDF</>}
      </button>

      <button onClick={() => generateReport('send')} disabled={busy !== null || sortedDates.length === 0}
        className="w-full mt-2.5 py-3.5 rounded-2xl text-[15px] font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
        style={{
          background: SURFACE_2,
          color: TEXT,
          border: `1px solid ${BORDER}`
        }}>
        {busy === 'send' ? <><Loader2 size={15} className="animate-spin" /> Enviando…</> : <><Send size={15} /> Enviar al coach por email</>}
      </button>

      {sendStatus === 'success' && (
        <div className="text-center text-[12px] mt-3" style={{ color: ACCENT_DARK }}>
          Reporte enviado al correo del coach.
        </div>
      )}
      {sendStatus === 'error' && (
        <div className="text-center text-[12px] mt-3" style={{ color: WARN }}>
          No se pudo enviar. Revisa la conexión o vuelve a intentar.
        </div>
      )}

      {sortedDates.length === 0 && (
        <div className="text-center text-[12px] mt-3" style={{ color: TEXT_LIGHT }}>
          Aún no hay días con registro. En cuanto comas y lo cuentes, lo voy guardando acá.
        </div>
      )}
    </ModalShell>
  );
}

function CapabilitiesModal({ onClose }) {
  const Section = ({ icon, title, items, accent }) => (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg" style={{ background: (accent || ACCENT) + '20', color: accent || ACCENT_DARK }}>
          {icon}
        </div>
        <div className="text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: TEXT }}>{title}</div>
      </div>
      <ul className="space-y-1.5 text-[13px]" style={{ color: TEXT_MUTED, lineHeight: 1.55 }}>
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 pl-1">
            <span style={{ color: accent || ACCENT, marginTop: 1 }}>•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg">
      <ModalHeader accent={ACCENT_DARK} label="Guía" title="¿Qué puedo hacer aquí?" onClose={onClose} />
      <div className="text-[13px] mb-5" style={{ color: TEXT_MUTED, lineHeight: 1.6 }}>
        Esto no es un coach. Es una herramienta para que registres tu día sin fricción y para que tu coach tenga información real para trabajar contigo.
      </div>

      <Section
        icon={<Utensils size={14} strokeWidth={1.8} />}
        title="Registrar comidas"
        accent={ACCENT_DARK}
        items={[
          'Escribe lo que comiste en lenguaje natural: "2 huevos, avena con plátano y café".',
          'Puedes registrar comida por comida, o contarme TODO tu día de una vez. Si dices "en el desayuno... al almuerzo... en la cena...", lo organizo por comidas. Si solo me das la lista, la registro como tu día.',
          'Si olvidaste un alimento, dime: "se me olvidó, también comí un huevo" y lo sumo a la última comida.',
          'También puedes dictar por voz tocando el micrófono. Recuerdo lo que hablamos antes, así que puedes referirte a algo que ya mencionaste.',
          'Si no especificas gramos, estimo con valores estándar (USDA) y te aviso.',
        ]} />

      <Section
        icon={<Info size={14} strokeWidth={1.8} />}
        title="Consultar sin registrar"
        accent={ACCENT}
        items={[
          'Pregunta calorías y macros de cualquier alimento: "¿cuántas calorías tiene una manzana?".',
          'Funciona también con marcas comerciales y porciones: "¿macros de 100g de pollo?".',
          'Si solo es consulta, no lo registro como comida del día.',
        ]} />

      <Section
        icon={<ChefHat size={14} strokeWidth={1.8} />}
        title="Armar tu día con tus ingredientes"
        accent={ACCENT_DARK}
        items={[
          'Guarda en "Mis ingredientes" lo que sueles comprar y comer.',
          'Pide: "armame el día con lo que me gusta" y propongo una distribución en desayuno, almuerzo, snack y cena que llega a tu meta.',
          'No es recetario: solo distribución y macros de alimentos cocidos.',
          'Decides si lo registras, lo guardas como favorito o regeneras otra variante.',
        ]} />

      <Section
        icon={<PieChart size={14} strokeWidth={1.8} />}
        title="Cuadrar macros faltantes"
        accent={C_PROTEIN}
        items={[
          'Si te faltan macros y tienes algunos ingredientes, dime cuáles tienes.',
          'Te devuelvo gramos exactos para cuadrar. Solo matemática, no recetas.',
          'Ejemplo: "tengo pollo, arroz y aceite, qué proporciones uso".',
        ]} />

      <Section
        icon={<Star size={14} strokeWidth={1.8} />}
        title="Favoritos y atajos"
        accent={C_CARBS}
        items={[
          'Toca la estrella en cualquier comida para guardarla como menú favorito y reutilizarla.',
          'Usa "Repetir comida de ayer" desde acciones para clonar el último registro del día anterior.',
          'Arriba del input ves tus alimentos más frecuentes para tocarlos y registrar rápido.',
        ]} />

      <Section
        icon={<FileText size={14} strokeWidth={1.8} />}
        title="Reportes para tu coach"
        accent={ACCENT_DARK}
        items={[
          'Descarga un PDF con tu data de 7 o 14 días para que tu coach lo revise.',
          'O envíalo directo por correo desde la misma pantalla.',
          'Si haces el check-in del día (energía, hambre, ánimo), tu coach lo ve en el reporte.',
        ]} />

      <Section
        icon={<X size={14} strokeWidth={2} />}
        title="Lo que NO hago"
        accent={WARN}
        items={[
          'No te doy recetas. Pero si me dices qué ingredientes o alimentos te gustan o tienes disponibles, sí te ayudo a definir cómo distribuirlos para llegar a tu meta.',
          'Si quieres recetas, tienes la galería de recetas en el módulo Meals de la app Trainerize.',
          'No reemplazo el criterio de un profesional de la salud.',
          'Si me preguntas "¿qué dieta hago?" o similar, te remito al coach.',
        ]} />

      <button onClick={onClose}
        className="w-full mt-2 py-3.5 rounded-2xl text-[15px] font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2"
        style={{ background: '#1F1F1F', color: '#fff' }}>
        Entendido, vamos
      </button>
    </ModalShell>
  );
}

function IngredientsModal({ ingredients, onSave, onClose }) {
  const [list, setList] = useState(ingredients);
  const [input, setInput] = useState('');

  const addIng = () => {
    const v = input.trim();
    if (!v) return;
    if (list.includes(v.toLowerCase())) { setInput(''); return; }
    setList([...list, v.toLowerCase()]);
    setInput('');
    haptic(6);
  };
  const removeIng = (ing) => { setList(list.filter(x => x !== ing)); haptic(6); };

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader accent={ACCENT_DARK} label="Favoritos" title="Mis ingredientes" onClose={onClose} />
      <div className="text-[12px] mb-4" style={{ color: TEXT_MUTED, lineHeight: 1.5 }}>
        Tu lista de alimentos que sueles comprar y comer. La uso cuando me pides "arma mi día" para distribuir kcal y macros sin recetario.
      </div>

      <div className="flex gap-2 mb-4">
        <input value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addIng())}
          placeholder="Ej: pollo, arroz, palta…"
          className="flex-1 bg-transparent border rounded-xl px-3 py-2.5 outline-none text-[14px]"
          style={{ borderColor: BORDER, color: TEXT }} />
        <button onClick={addIng}
          className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition active:scale-95"
          style={{ background: '#1F1F1F', color: '#fff' }}>
          Añadir
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5 min-h-[40px]">
        {list.length === 0 && (
          <div className="text-[12px] italic" style={{ color: TEXT_LIGHT }}>Aún no agregaste ingredientes.</div>
        )}
        {list.map(ing => (
          <button key={ing} onClick={() => removeIng(ing)}
            className="px-3 py-1.5 rounded-full text-[12px] font-medium transition active:scale-95 flex items-center gap-1.5"
            style={{ background: SURFACE_2, color: TEXT, border: `1px solid ${BORDER}` }}
            title="Quitar de la lista">
            {ing}
            <X size={11} style={{ color: TEXT_LIGHT }} />
          </button>
        ))}
      </div>

      <button onClick={() => onSave(list)}
        className="w-full py-3.5 rounded-2xl text-[15px] font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2"
        style={{ background: '#1F1F1F', color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}>
        <CheckCircle2 size={15} /> Guardar lista
      </button>
    </ModalShell>
  );
}

function PlannerModal({ loading, proposal, ingredients, onRegenerate, onRegister, onSaveFavorite, onEditIngredients, onClose }) {
  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg">
      <ModalHeader accent={ACCENT_DARK} label="Planificador" title="Arma mi día" onClose={onClose} />

      {ingredients.length === 0 && (
        <div className="mb-5 p-4 rounded-2xl text-[13px]" style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, color: TEXT }}>
          Antes necesito tu lista de ingredientes. Agrega los alimentos que te gustan y compras.
          <button onClick={onEditIngredients} className="block mt-3 px-4 py-2 rounded-xl text-[13px] font-semibold"
            style={{ background: '#1F1F1F', color: '#fff' }}>
            Configurar ingredientes
          </button>
        </div>
      )}

      {loading && (
        <div className="py-12 flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin" style={{ color: ACCENT }} />
          <div className="text-[13px]" style={{ color: TEXT_MUTED }}>Armando tu distribución…</div>
        </div>
      )}

      {proposal && proposal.error && (
        <div className="p-4 rounded-2xl text-[13px] mb-4" style={{ background: '#FBF1E5', color: WARN }}>
          {proposal.error}
        </div>
      )}

      {proposal && proposal.meals && (
        <div>
          <div className="text-[13px] mb-4 leading-relaxed" style={{ color: TEXT }}>
            {proposal.intro}
          </div>

          {proposal.meals.map((m, i) => (
            <div key={i} className="mb-4 p-3 rounded-2xl" style={{ background: SURFACE_2, border: `1px solid ${BORDER}` }}>
              <div className="text-[11px] uppercase tracking-[0.15em] font-bold mb-2" style={{ color: ACCENT_DARK }}>{m.meal}</div>
              <div className="space-y-1 mb-2">
                {m.items.map((it, j) => (
                  <div key={j} className="text-[12px] flex justify-between gap-3">
                    <span style={{ color: TEXT }}>{it.name}{it.amount ? ` · ${it.amount}` : ''}</span>
                    <span className="num" style={{ color: TEXT_LIGHT }}>{it.kcal} kcal</span>
                  </div>
                ))}
              </div>
              {m.subtotal && (
                <div className="text-[10px] pt-2 border-t flex gap-3 num" style={{ borderColor: BORDER_SOFT, color: TEXT_MUTED }}>
                  <span>{m.subtotal.kcal} kcal</span>
                  <span style={{ color: C_PROTEIN }}>P {m.subtotal.p}g</span>
                  <span style={{ color: C_CARBS }}>C {m.subtotal.c}g</span>
                  <span style={{ color: C_FAT }}>G {m.subtotal.g}g</span>
                </div>
              )}
            </div>
          ))}

          {proposal.total && (
            <div className="p-3 rounded-2xl mb-4" style={{ background: ACCENT_PASTEL + '40', border: `1px solid ${ACCENT_PASTEL}` }}>
              <div className="text-[11px] uppercase tracking-[0.15em] font-bold mb-1" style={{ color: ACCENT_DARK }}>Total del día</div>
              <div className="text-[14px] font-bold num" style={{ color: TEXT }}>
                {proposal.total.kcal} kcal · P {proposal.total.p}g · C {proposal.total.c}g · G {proposal.total.g}g
              </div>
            </div>
          )}

          {proposal.warning && (
            <div className="p-3 rounded-2xl mb-4 text-[12px]" style={{ background: '#FBF1E5', color: WARN }}>
              {proposal.warning}
            </div>
          )}

          <div className="space-y-2">
            <button onClick={onRegister}
              className="w-full py-3 rounded-2xl text-[14px] font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: '#1F1F1F', color: '#fff' }}>
              <CheckCircle2 size={14} /> Registrar como comidas del día
            </button>
            <button onClick={onSaveFavorite}
              className="w-full py-3 rounded-2xl text-[14px] font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: SURFACE_2, color: TEXT, border: `1px solid ${BORDER}` }}>
              <Star size={14} /> Guardar como favorito
            </button>
            <button onClick={onRegenerate}
              className="w-full py-3 rounded-2xl text-[14px] font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: SURFACE_2, color: TEXT, border: `1px solid ${BORDER}` }}>
              <RotateCcw size={14} /> Regenerar otra variante
            </button>
          </div>
        </div>
      )}

      {!loading && !proposal && ingredients.length > 0 && (
        <div className="py-8 flex flex-col items-center gap-3">
          <div className="text-[13px]" style={{ color: TEXT_MUTED }}>Genera la propuesta cuando quieras.</div>
          <button onClick={onRegenerate}
            className="px-5 py-2.5 rounded-xl text-[14px] font-semibold transition active:scale-95"
            style={{ background: '#1F1F1F', color: '#fff' }}>
            Generar propuesta
          </button>
        </div>
      )}
    </ModalShell>
  );
}

function WellbeingModal({ name, existing, onSave, onClose }) {
  const [energy, setEnergy] = useState(existing?.energy || 3);
  const [hunger, setHunger] = useState(existing?.hunger || 3);
  const [mood, setMood] = useState(existing?.mood || 3);
  const firstName = name ? name.split(' ')[0] : '';

  const Row = ({ label, hint, value, setValue, color }) => (
    <div className="mb-5">
      <div className="flex justify-between items-baseline mb-1.5">
        <div className="text-[13px] font-semibold" style={{ color: TEXT }}>{label}</div>
        <div className="text-[11px]" style={{ color: TEXT_LIGHT }}>{hint}</div>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => { haptic(8); setValue(n); }}
            className="flex-1 py-3 rounded-xl text-[14px] font-semibold transition active:scale-95"
            style={{
              background: value === n ? color : SURFACE_2,
              color: value === n ? '#fff' : TEXT_MUTED,
              border: `1px solid ${value === n ? color : BORDER_SOFT}`
            }}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader accent={ACCENT_DARK} label="Check-in" title={firstName ? `¿Cómo te fue, ${firstName}?` : '¿Cómo te fue hoy?'} onClose={onClose} />
      <div className="text-[12px] mb-5" style={{ color: TEXT_MUTED, lineHeight: 1.5 }}>
        3 toques rápidos. Ayuda a Mauro a entender cómo te sentiste, más allá de los macros.
      </div>

      <Row label="Energía" hint="1 bajón · 5 con todo" value={energy} setValue={setEnergy} color={ACCENT} />
      <Row label="Hambre" hint="1 saciado · 5 con mucha hambre" value={hunger} setValue={setHunger} color={C_PROTEIN} />
      <Row label="Ánimo" hint="1 mal · 5 muy bien" value={mood} setValue={setMood} color={C_FAT} />

      <button onClick={() => onSave(energy, hunger, mood)}
        className="w-full py-3.5 rounded-2xl text-[15px] font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2"
        style={{ background: '#1F1F1F', color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}>
        <CheckCircle2 size={15} /> Guardar check-in
      </button>
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
          model: CHAT_MODEL,
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

        {/* Editorial avocado image — sits to the right, doesn't cover text */}
        <img src="/avocado.png" alt=""
          onError={(e) => { e.target.style.display = 'none'; }}
          style={{
            position: 'absolute',
            top: '8%',
            right: '-6%',
            width: '62%',
            maxWidth: '440px',
            height: 'auto',
            objectFit: 'contain',
            opacity: 1,
            pointerEvents: 'none',
            userSelect: 'none',
            filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.10))'
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
            <span style={{ color: TEXT, fontWeight: 600 }}>Mauro Morón</span> · ISSA Certified Fitness and Nutrition Coach
          </div>
        </div>
      </div>

      {/* Bottom: actions — lifted up so they don't get cut off on smaller phones */}
      <div className="max-w-md w-full mx-auto pb-28 fade-up-4 relative" style={{ zIndex: 1 }}>

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
            background: '#1F1F1F',
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
    { icon: <Utensils size={28} strokeWidth={1.5} />, title: 'Registra natural', body: 'Escribe lo que comiste como si lo dijeras en voz alta. La app calcula calorías y macros con valores reales (USDA, comerciales).', example: '"Desayuno: 2 huevos revueltos, avena con plátano y café con leche"' },
    { icon: <Star size={28} strokeWidth={1.5} />, title: 'Menús favoritos', body: 'Las comidas que repites se guardan con un tap en la estrella. Reuso instantáneo, cero fricción.', example: 'Desde "Menús favoritos", toca Usar y queda registrado.' },
    { icon: <Info size={28} strokeWidth={1.5} />, title: 'Pregunta antes de comer', body: 'Consulta los macros de cualquier alimento sin registrarlo. Útil para decidir antes de servirte.', example: '"¿Calorías de una manzana?" o "¿Macros de 100g de pollo?"' },
    { icon: <PieChart size={28} strokeWidth={1.5} />, title: 'Cuadrá macros', body: 'Si te faltan macros y tienes ingredientes, decile qué tienes. La app calcula gramos exactos. Solo matemática, no recetas, no recomendación.', example: '"Tengo pollo, arroz integral, brócoli y aceite de oliva"' },
    { icon: <ChefHat size={28} strokeWidth={1.5} />, title: 'Arma tu día con lo que te gusta', body: 'Guarda los ingredientes que sueles comprar y comer. Pide "arma mi día" y te propongo una distribución en desayuno, almuerzo, snack y cena que llega a tu meta. No es recetario: son tus ingredientes cocidos con kcal y macros. Decides si lo registras, lo guardas como favorito o regeneras otra variante.', example: 'Tus ingredientes → "armame el día" → propuesta editable' },
    { icon: <Pencil size={28} strokeWidth={1.5} />, title: 'Edita o elimina', body: 'Toca el lápiz para ajustar cantidades. Los valores se recalculan automáticamente. Toca la papelera para eliminar.', example: 'En cualquier comida: favorito · editar · eliminar' },
    { icon: <FileText size={28} strokeWidth={1.5} />, title: 'Reporte al coach', body: 'PDF con detalle completo de tu data. Diseñado para que tu coach revise el patrón y aporte criterio.', example: 'Calendario, resumen, exportable. Tu data, su criterio.' },
    { icon: <CheckCircle2 size={28} strokeWidth={1.5} />, title: 'Importante', body: 'Esta herramienta calcula y registra. No recomienda qué comer ni sustituye el criterio de un coach nutricional.', example: 'La app mide. El coach decide.' },
    { icon: <Download size={28} strokeWidth={1.5} />, title: 'Guarda esta app', body: 'Agrega esta página a tus favoritos del navegador. Si la minimizas en lugar de cerrarla, mantienes la conversación abierta.', example: 'iPhone: Compartir → Añadir a inicio · Android: ⋮ → Añadir a pantalla' }
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
        <div className="mb-4 inline-flex p-3 rounded-2xl" style={{ background: ACCENT_PASTEL + '60', color: ACCENT_DARK }}>
          {s.icon}
        </div>
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
            style={{ background: '#1F1F1F', color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}>
            Siguiente <ArrowUp size={14} strokeWidth={2.5} style={{ transform: 'rotate(90deg)' }} />
          </button>
        ) : (
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl text-[14px] font-semibold transition active:scale-[0.98]"
            style={{ background: '#1F1F1F', color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}>
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
                Hola
              </div>
              <div className="h-[2px] w-12 mt-1 mb-4 rounded-full" style={{ background: ACCENT }} />
              <div className="text-[15px] mb-5 leading-relaxed" style={{ color: TEXT_MUTED }}>
                Soy tu Meal Tracker. Antes de arrancar, dime tu <strong style={{ color: TEXT }}>nombre y apellido</strong>.
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
                  background: '#1F1F1F',
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
                  background: '#1F1F1F',
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
