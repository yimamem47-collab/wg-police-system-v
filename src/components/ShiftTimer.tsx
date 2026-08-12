import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  Pause, 
  Clock, 
  ShieldCheck, 
  MapPin, 
  User as UserIcon, 
  FileText, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  Award,
  ChevronDown,
  ChevronUp,
  Send,
  Radio,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Officer, ShiftLog } from '../types';
import { Language, translations } from '../lib/translations';
import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';

interface ShiftTimerProps {
  user: User | null;
  officers?: Officer[];
  lang: Language;
}

const STORAGE_ACTIVE_KEY = 'west_gojjam_active_shift_v1';
const STORAGE_HISTORY_KEY = 'west_gojjam_shift_history_v1';

export function ShiftTimer({ user, officers = [], lang }: ShiftTimerProps) {
  const t = translations[lang];

  // Form State
  const [officerName, setOfficerName] = useState<string>(user?.name || '');
  const [badgeNumber, setBadgeNumber] = useState<string>('');
  const [station, setStation] = useState<string>('Finote Selam City');
  const [dutyType, setDutyType] = useState<string>('General Patrol');
  const [locationNotes, setLocationNotes] = useState<string>('');

  // Shift Execution State
  const [activeShift, setActiveShift] = useState<ShiftLog | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Modal & History State
  const [showEndModal, setShowEndModal] = useState<boolean>(false);
  const [incidentsCount, setIncidentsCount] = useState<number>(0);
  const [endNotes, setEndNotes] = useState<string>('');
  const [history, setHistory] = useState<ShiftLog[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Sync officer details if user changes
  useEffect(() => {
    if (user?.name && !officerName) {
      setOfficerName(user.name);
    }
    // Try matching officer badge from officers list
    if (user && officers.length > 0) {
      const matched = officers.find(o => o.email === user.email || o.name.toLowerCase() === user.name.toLowerCase());
      if (matched) {
        if (matched.badgeNumber) setBadgeNumber(matched.badgeNumber);
        if (matched.station) setStation(matched.station);
      }
    }
  }, [user, officers]);

  // Load active shift and history from LocalStorage & Firestore on mount
  useEffect(() => {
    try {
      const savedActive = localStorage.getItem(STORAGE_ACTIVE_KEY);
      if (savedActive) {
        const parsed: ShiftLog = JSON.parse(savedActive);
        setActiveShift(parsed);
        setIsPaused(parsed.status === 'Paused');

        // Calculate initial elapsed time
        const startMs = new Date(parsed.startTime).getTime();
        const nowMs = Date.now();
        const initialSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
        setElapsedSeconds(initialSeconds);
      }

      const savedHistory = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.warn('Failed to parse saved shift logs from storage:', e);
    }

    // Attempt fetching shift logs from Firestore asynchronously
    fetchShiftHistoryFromFirestore();
  }, [user]);

  // Active Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (activeShift && !isPaused) {
      interval = setInterval(() => {
        const startMs = new Date(activeShift.startTime).getTime();
        const nowMs = Date.now();
        const diffSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
        setElapsedSeconds(diffSeconds);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activeShift, isPaused]);

  const fetchShiftHistoryFromFirestore = async () => {
    try {
      if (!db) return;
      const shiftsRef = collection(db, 'police_shifts');
      const q = query(shiftsRef, orderBy('startTime', 'desc'), limit(15));
      const querySnap = await getDocs(q);
      const remoteLogs: ShiftLog[] = [];
      querySnap.forEach((docSnap) => {
        remoteLogs.push({ id: docSnap.id, ...docSnap.data() } as ShiftLog);
      });

      if (remoteLogs.length > 0) {
        setHistory(remoteLogs);
        localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(remoteLogs));
      }
    } catch (err) {
      console.warn('Could not fetch shift history from Firestore:', err);
    }
  };

  // Start Shift Handler
  const handleStartShift = async () => {
    const nameToUse = officerName.trim() || user?.name || (lang === 'am' ? 'ያልተገለጸ ኦፊሰር' : 'Officer');
    const nowIso = new Date().toISOString();

    const newShift: ShiftLog = {
      id: 'shift_' + Date.now(),
      officerId: user?.id || 'off_' + Date.now(),
      officerName: nameToUse,
      badgeNumber: badgeNumber.trim() || 'WG-PAD',
      station: station || 'West Gojjam Zone Station',
      dutyType: dutyType || 'General Patrol',
      startTime: nowIso,
      endTime: null,
      durationSeconds: 0,
      status: 'Active',
      location: locationNotes.trim() || station,
      notes: '',
      timestamp: nowIso
    };

    setActiveShift(newShift);
    setElapsedSeconds(0);
    setIsPaused(false);
    localStorage.setItem(STORAGE_ACTIVE_KEY, JSON.stringify(newShift));

    showBannerNotification(
      lang === 'am' 
        ? `ሥራ በስኬት ተጀምሯል! መልካም የሥራ ሰዓት፤ ኦፊሰር ${nameToUse}`
        : `Shift Started Successfully! Have a safe duty, Officer ${nameToUse}`
    );

    // Sync start to Firestore in background
    try {
      if (db) {
        await addDoc(collection(db, 'police_shifts'), {
          ...newShift,
          eventType: 'SHIFT_START',
          createdAt: new Date()
        });
      }
    } catch (err) {
      console.warn('Firestore log error:', err);
    }
  };

  // Toggle Pause/Resume
  const handleTogglePause = () => {
    if (!activeShift) return;
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);

    const updatedShift: ShiftLog = {
      ...activeShift,
      status: nextPaused ? 'Paused' : 'Active'
    };
    setActiveShift(updatedShift);
    localStorage.setItem(STORAGE_ACTIVE_KEY, JSON.stringify(updatedShift));

    showBannerNotification(
      nextPaused
        ? (lang === 'am' ? 'የሥራ ሰዓት ለጊዜው ቆሟል።' : 'Shift paused.')
        : (lang === 'am' ? 'የሥራ ሰዓት ቀጥሏል።' : 'Shift resumed.')
    );
  };

  // End Shift Handler
  const handleConfirmEndShift = async () => {
    if (!activeShift) return;
    setIsSubmitting(true);

    const endTimeIso = new Date().toISOString();
    const finalDuration = elapsedSeconds;

    const completedShift: ShiftLog = {
      ...activeShift,
      endTime: endTimeIso,
      durationSeconds: finalDuration,
      status: 'Completed',
      notes: endNotes.trim(),
      incidentsHandledCount: incidentsCount
    };

    // Update Local History
    const updatedHistory = [completedShift, ...history.filter(h => h.id !== completedShift.id)];
    setHistory(updatedHistory);
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updatedHistory));
    localStorage.removeItem(STORAGE_ACTIVE_KEY);

    // Reset active shift states
    setActiveShift(null);
    setElapsedSeconds(0);
    setShowEndModal(false);
    setEndNotes('');
    setIncidentsCount(0);
    setIsSubmitting(false);

    showBannerNotification(
      lang === 'am'
        ? `ሥራ ተጠናቋል! አጠቃላይ የሥራ ሰዓት፡ ${formatDurationHMS(finalDuration)}`
        : `Shift Completed! Total Active Hours: ${formatDurationHMS(finalDuration)}`
    );

    // Save final shift summary to Firestore
    try {
      if (db) {
        await addDoc(collection(db, 'police_shifts'), {
          ...completedShift,
          eventType: 'SHIFT_END',
          createdAt: new Date()
        });
      }
    } catch (err) {
      console.warn('Firestore final shift log failed:', err);
    }
  };

  const showBannerNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4500);
  };

  // Helper formatting HMS
  const formatDurationHMS = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  // Calculate Today's Total Active Time from Completed Shifts
  const todayTotalSeconds = history
    .filter(log => {
      if (!log.startTime) return false;
      const logDate = new Date(log.startTime).toDateString();
      const todayDate = new Date().toDateString();
      return logDate === todayDate && log.durationSeconds;
    })
    .reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0) + (activeShift ? elapsedSeconds : 0);

  const stationsList = [
    lang === 'am' ? 'ፍኖተ ሰላም 1ኛ ጣቢያ' : 'Finote Selam 1st Station',
    lang === 'am' ? 'ፍኖተ ሰላም ከተማ' : 'Finote Selam City',
    lang === 'am' ? 'ቡሬ ከተማ ፖሊስ' : 'Bure City Police',
    lang === 'am' ? 'ደምበጫ ከተማ' : 'Dembecha City Police',
    lang === 'am' ? 'ጃቢ ጠህናን ጣቢያ' : 'Jabi Tehnan Station',
    lang === 'am' ? 'ጅጋ ከተማ ፖሊስ' : 'Jiga City Police',
    lang === 'am' ? 'ሰከላ ፖሊስ ጣቢያ' : 'Sekela Police Station',
    lang === 'am' ? 'ኳሪት ፖሊስ ጣቢያ' : 'Quarit Police Station',
    lang === 'am' ? 'ደጋ ዳሞት ፖሊስ' : 'Dega Damot Police'
  ];

  const dutyTypesList = [
    { id: 'General Patrol', am: 'መደበኛ ፓትሮል', en: 'General Patrol' },
    { id: 'Traffic Checkpoint', am: 'የትራፊክ ፍተሻ', en: 'Traffic Checkpoint' },
    { id: 'Criminal Investigation', am: 'የወንጀል ምርመራ', en: 'Criminal Investigation' },
    { id: 'Station Duty', am: 'የጣቢያ ጥበቃና አገልግሎት', en: 'Station Duty' },
    { id: 'Emergency Response', am: 'የድንገተኛ ድጋፍ ግብረ-መልስ', en: 'Emergency Response' },
    { id: 'Special Mission', am: 'ልዩ ተልዕኮ', en: 'Special Mission' }
  ];

  return (
    <div className="glass-card p-5 lg:p-6 border-brand-accent/30 bg-gradient-to-br from-brand-bg/95 via-slate-900/90 to-brand-bg/95 shadow-2xl relative overflow-hidden">
      {/* Decorative Accent Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Notification */}
      <AnimatePresence>
        {notificationMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2.5 shadow-lg"
          >
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0 animate-bounce" />
            <span>{notificationMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-brand-border/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-accent/10 rounded-xl border border-brand-accent/20 text-brand-accent">
            <Clock size={22} className={activeShift && !isPaused ? 'animate-spin-slow' : ''} />
          </div>
          <div>
            <h2 className="text-base lg:text-lg font-black text-white tracking-wide uppercase flex items-center gap-2">
              {lang === 'am' ? 'የኦፊሰር የሥራ ሰዓት መቆጣጠሪያ' : 'Officer Duty Shift Timer'}
              <span className="text-[10px] bg-brand-accent/20 text-brand-accent font-bold px-2 py-0.5 rounded-full lowercase font-mono">
                v1.0
              </span>
            </h2>
            <p className="text-[11px] text-brand-text-secondary font-medium">
              {lang === 'am' ? 'የኦፊሰሮችን የሥራ ሰዓት እና የፓትሮል እንቅስቃሴ በቅጽበት መከታተያ' : 'Track active duty hours, patrol shifts, and station assignments'}
            </p>
          </div>
        </div>

        {/* Today's Cumulative Badge */}
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-brand-border/60 text-right self-start sm:self-auto">
          <Calendar size={14} className="text-brand-accent" />
          <div className="text-left">
            <p className="text-[9px] uppercase tracking-wider text-brand-text-secondary font-bold">
              {lang === 'am' ? 'የዛሬ አጠቃላይ ሰዓት' : "Today's Duty"}
            </p>
            <p className="text-xs font-mono font-black text-emerald-400">
              {formatDurationHMS(todayTotalSeconds)}
            </p>
          </div>
        </div>
      </div>

      {/* Shift State Content */}
      {activeShift ? (
        /* ACTIVE ON-DUTY VIEW */
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-black/50 p-4 lg:p-6 rounded-2xl border border-brand-accent/30 shadow-inner">
            {/* Live Clock Display */}
            <div className="md:col-span-7 flex flex-col items-center md:items-start space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isPaused ? 'bg-amber-500 animate-pulse' : 'bg-rose-500 animate-ping'}`} />
                <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                  isPaused 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  {isPaused 
                    ? (lang === 'am' ? '⏸️ የቆመ' : '⏸️ PAUSED') 
                    : (lang === 'am' ? '🔴 በሥራ ላይ (ON DUTY)' : '🔴 ON DUTY')}
                </span>
              </div>

              {/* Big Digital Timer Font */}
              <div className="text-4xl sm:text-5xl lg:text-6xl font-mono font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(34,211,238,0.3)] my-1">
                {formatDurationHMS(elapsedSeconds)}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-text-secondary font-medium">
                <span className="flex items-center gap-1">
                  <UserIcon size={12} className="text-brand-accent" />
                  <strong className="text-white">{activeShift.officerName}</strong> ({activeShift.badgeNumber})
                </span>
                <span className="flex items-center gap-1">
                  <Building2 size={12} className="text-brand-accent" />
                  {activeShift.station}
                </span>
              </div>
            </div>

            {/* Quick Duty Details Card */}
            <div className="md:col-span-5 bg-slate-900/80 p-3.5 rounded-xl border border-brand-border/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
                <span className="text-brand-text-secondary font-bold uppercase text-[10px]">
                  {lang === 'am' ? 'የተጀመረበት ሰዓት' : 'Start Time'}
                </span>
                <span className="text-white font-mono font-bold">
                  {new Date(activeShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
                <span className="text-brand-text-secondary font-bold uppercase text-[10px]">
                  {lang === 'am' ? 'የተመደበበት የሥራ ዓይነት' : 'Duty Type'}
                </span>
                <span className="text-brand-accent font-bold">
                  {dutyTypesList.find(d => d.id === activeShift.dutyType)?.[lang] || activeShift.dutyType}
                </span>
              </div>

              {activeShift.location && (
                <div className="flex justify-between items-start pt-0.5">
                  <span className="text-brand-text-secondary font-bold uppercase text-[10px] shrink-0">
                    {lang === 'am' ? 'የፓትሮል ቦታ' : 'Location'}
                  </span>
                  <span className="text-emerald-300 font-medium text-right truncate max-w-[150px]">
                    {activeShift.location}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Active Shift Action Controls */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTogglePause}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              }`}
            >
              {isPaused ? (
                <>
                  <Play size={16} />
                  {lang === 'am' ? 'ሥራ ቀጥል (Resume)' : 'Resume Duty'}
                </>
              ) : (
                <>
                  <Pause size={16} />
                  {lang === 'am' ? 'ለጊዜው አቁም (Pause)' : 'Pause Duty'}
                </>
              )}
            </button>

            <button
              onClick={() => setShowEndModal(true)}
              className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-600/20 active:scale-[0.98]"
            >
              <Square size={16} className="fill-current" />
              {lang === 'am' ? 'ሥራ ጨርስ (End Shift)' : 'End Shift'}
            </button>
          </div>
        </div>
      ) : (
        /* OFF-DUTY START SHIFT FORM */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Officer Name */}
            <div>
              <label className="block text-[11px] font-bold text-brand-text-secondary uppercase mb-1">
                {lang === 'am' ? 'የኦፊሰር ስም' : 'Officer Name'}
              </label>
              <div className="relative">
                <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder={lang === 'am' ? 'ለምሳሌ፡ ሳጅን መንገሻ ይማም' : 'e.g. Sgt. Mengesha Yimam'}
                  className="input-field pl-9 py-2 text-xs w-full"
                />
              </div>
            </div>

            {/* Badge Number */}
            <div>
              <label className="block text-[11px] font-bold text-brand-text-secondary uppercase mb-1">
                {lang === 'am' ? 'የመታወቂያ/ባጅ ቁጥር' : 'Badge Number'}
              </label>
              <div className="relative">
                <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder="WG-1042"
                  className="input-field pl-9 py-2 text-xs w-full"
                />
              </div>
            </div>

            {/* Duty Station */}
            <div>
              <label className="block text-[11px] font-bold text-brand-text-secondary uppercase mb-1">
                {lang === 'am' ? 'የፖሊስ ጣቢያ/ወረዳ' : 'Police Station'}
              </label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
                <select
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  className="input-field pl-9 py-2 text-xs w-full appearance-none pr-8"
                >
                  {stationsList.map((st, i) => (
                    <option key={i} value={st} className="bg-slate-900 text-white">
                      {st}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-secondary pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Duty / Assignment Type */}
            <div>
              <label className="block text-[11px] font-bold text-brand-text-secondary uppercase mb-1">
                {lang === 'am' ? 'የተመደቡበት የሥራ ዓይነት' : 'Patrol / Duty Assignment'}
              </label>
              <div className="relative">
                <Radio size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
                <select
                  value={dutyType}
                  onChange={(e) => setDutyType(e.target.value)}
                  className="input-field pl-9 py-2 text-xs w-full appearance-none pr-8"
                >
                  {dutyTypesList.map((dt) => (
                    <option key={dt.id} value={dt.id} className="bg-slate-900 text-white">
                      {dt[lang]}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Location Checkpoint */}
            <div>
              <label className="block text-[11px] font-bold text-brand-text-secondary uppercase mb-1">
                {lang === 'am' ? 'የፓትሮል/ፍተሻ ቦታ (አማራጭ)' : 'Specific Location / Patrol Checkpoint'}
              </label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
                <input
                  type="text"
                  value={locationNotes}
                  onChange={(e) => setLocationNotes(e.target.value)}
                  placeholder={lang === 'am' ? 'ለምሳሌ፡ ፍኖተ ሰላም መውጫ ፍተሻ ጣቢያ' : 'e.g. Finote Selam Exit Checkpoint'}
                  className="input-field pl-9 py-2 text-xs w-full"
                />
              </div>
            </div>
          </div>

          {/* Big Green Start Button */}
          <button
            onClick={handleStartShift}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-emerald-600/20 active:scale-[0.99] mt-2"
          >
            <Play size={18} className="fill-current" />
            {lang === 'am' ? 'ሥራ ጀምር (Start Duty Shift)' : 'Start Duty Shift'}
          </button>
        </div>
      )}

      {/* History Drawer Toggle */}
      <div className="mt-4 pt-3 border-t border-brand-border/40 flex justify-between items-center text-xs">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 text-brand-accent font-bold hover:underline"
        >
          <History size={14} />
          <span>
            {showHistory 
              ? (lang === 'am' ? 'የሥራ ታሪክ ደብቅ' : 'Hide Shift History') 
              : (lang === 'am' ? `የቀደሙ የሥራ ሰዓታት ታሪክ (${history.length})` : `Shift History (${history.length})`)}
          </span>
          {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <span className="text-[10px] text-brand-text-secondary font-mono">
          {lang === 'am' ? 'የምዕራብ ጎጃም ፖሊስ ዲጂታል ረዳት' : 'WG Police Shift Tracker'}
        </span>
      </div>

      {/* Shift History Section */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-brand-border/60 overflow-hidden space-y-2"
          >
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2">
              {lang === 'am' ? 'የቅርብ ጊዜ የሥራ ሰዓታት መዝገብ' : 'Recent Duty Shift Logs'}
            </h4>

            {history.length > 0 ? (
              <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-900/90 border border-brand-border/60 rounded-xl text-xs space-y-1 hover:border-brand-accent/30 transition-colors"
                  >
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-white flex items-center gap-1.5">
                        <UserIcon size={12} className="text-brand-accent" />
                        {item.officerName} ({item.station})
                      </span>
                      <span className="text-emerald-400 font-mono font-black">
                        {formatDurationHMS(item.durationSeconds || 0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-brand-text-secondary">
                      <span>
                        {new Date(item.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        {item.endTime && ` ➔ ${new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                      <span className="bg-brand-bg px-2 py-0.5 rounded text-brand-text-secondary border border-brand-border">
                        {dutyTypesList.find(d => d.id === item.dutyType)?.[lang] || item.dutyType || 'Patrol'}
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-slate-300 italic pt-1 border-t border-brand-border/30">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-brand-text-secondary italic py-2 text-center">
                {lang === 'am' ? 'ምንም የተቀመጠ የሥራ ታሪክ አልተገኘም።' : 'No previous shift logs found.'}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* END SHIFT SUMMARY MODAL */}
      {showEndModal && activeShift && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-lg p-6 lg:p-8 space-y-5 border-brand-accent/30 bg-slate-950/95"
          >
            <div className="flex items-center gap-3 border-b border-brand-border/60 pb-3">
              <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl">
                <Square size={22} className="fill-current" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wide">
                  {lang === 'am' ? 'የሥራ ሰዓት ማጠቃለያ እና መዝጊያ' : 'End Shift Summary & Log'}
                </h3>
                <p className="text-xs text-brand-text-secondary">
                  {lang === 'am' ? 'እባክዎ የተከናወኑ ተግባራትን እና ማስታወሻዎችን አጠቃልለው ይመዝግቡ' : 'Summarize your duty accomplishments before ending active shift'}
                </p>
              </div>
            </div>

            {/* Shift Stats Card */}
            <div className="grid grid-cols-2 gap-3 bg-slate-900 p-3.5 rounded-xl border border-brand-border text-xs">
              <div>
                <span className="text-brand-text-secondary font-bold uppercase text-[10px] block">
                  {lang === 'am' ? 'አጠቃላይ የሥራ ሰዓት' : 'Total Active Duration'}
                </span>
                <span className="text-xl font-mono font-black text-emerald-400">
                  {formatDurationHMS(elapsedSeconds)}
                </span>
              </div>
              <div>
                <span className="text-brand-text-secondary font-bold uppercase text-[10px] block">
                  {lang === 'am' ? 'ኦፊሰር' : 'Officer'}
                </span>
                <span className="text-sm font-bold text-white truncate block">
                  {activeShift.officerName}
                </span>
              </div>
            </div>

            {/* Incidents Handled Input */}
            <div>
              <label className="block text-xs font-bold text-brand-text-secondary uppercase mb-1">
                {lang === 'am' ? 'በሥራ ሰዓት የተስተናገዱ ክስተቶች/ወንጀሎች ብዛት' : 'Incidents / Cases Handled'}
              </label>
              <input
                type="number"
                min="0"
                value={incidentsCount}
                onChange={(e) => setIncidentsCount(parseInt(e.target.value) || 0)}
                className="input-field py-2 text-xs w-full font-mono"
              />
            </div>

            {/* End Notes Input */}
            <div>
              <label className="block text-xs font-bold text-brand-text-secondary uppercase mb-1">
                {lang === 'am' ? 'የሥራ ማጠቃለያ እና የፓትሮል ማስታወሻ' : 'Shift Summary & Patrol Notes'}
              </label>
              <textarea
                rows={3}
                value={endNotes}
                onChange={(e) => setEndNotes(e.target.value)}
                placeholder={lang === 'am' ? 'በሥራ ሰዓቱ የተከናወኑ ዋና ዋና ተግባራትን ይፃፉ...' : 'Log any incidents, checkpoints, or turnover notes for the next shift...'}
                className="input-field p-3 text-xs w-full"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowEndModal(false)}
                disabled={isSubmitting}
                className="flex-1 btn-secondary py-3 text-xs uppercase font-bold"
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                onClick={handleConfirmEndShift}
                disabled={isSubmitting}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-rose-600/20 text-xs uppercase flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                {lang === 'am' ? 'ሥራውን አጠናቅቅ (Confirm End)' : 'Confirm End Shift'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
