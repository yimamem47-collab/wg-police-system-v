import React, { useState, useEffect } from 'react';
import { useAppData } from './hooks/useAppData';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Incidents } from './components/Incidents';
import { Officers } from './components/Officers';
import { Assignments } from './components/Assignments';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { PoliceServices } from './components/PoliceServices';
import { AppManual } from './components/AppManual';
import { QRScanner } from './components/QRScanner';
import { Scanner } from './components/Scanner';
import { PoliceIDScanner } from './components/PoliceIDScanner';
import { Home } from './components/Home';
import { Auth } from './components/Auth';
import { EmergencyContacts } from './components/EmergencyContacts';
import { CitizenReport } from './components/CitizenReport';
import { CommunityReports } from './components/CommunityReports';
import { CommunityReportForm } from './components/CommunityReportForm';
import ZoneReports from './components/ZoneReports';
import { AIAssistant } from './components/AIAssistant';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Language, translations } from './lib/translations';
import { Phone, Loader2, CheckCircle, ArrowUp, Bot, X } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db, onFirestoreStatusChange, forceReconnect, clearFirestoreCache } from './firebase';
import { sendTelegramMessage, escapeHtml } from './services/telegramService';
import { motion, AnimatePresence } from 'motion/react';
import { APP_LOGO } from './constants';

type View = 'home' | 'login' | 'signup' | 'dashboard' | 'incidents' | 'officers' | 'assignments' | 'reports' | 'settings' | 'contacts' | 'ai-assistant' | 'community-report';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [tabHistory, setTabHistory] = useState<string[]>([]);
  const [initialEditId, setInitialEditId] = useState<string | null>(null);
  const [citizenReportType, setCitizenReportType] = useState<'Crime' | 'Traffic' | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('wg_lang');
    return (saved as Language) || 'en';
  });
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isIDScannerOpen, setIsIDScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [isFirestoreOffline, setIsFirestoreOffline] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    const success = await forceReconnect();
    if (!success) {
      // If force reconnect fails, try clearing cache as a last resort
      console.warn("Force reconnect failed, trying cache clear...");
      await clearFirestoreCache();
    }
    setIsReconnecting(false);
  };

  // HARD FIX: Global Pull-to-refresh prevention
  useEffect(() => {
    let touchStart = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStart = e.touches[0].pageY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Find the active scrollable container
      const container = document.querySelector('.overflow-y-auto');
      if (!container) return;

      const touchMove = e.touches[0].pageY;
      // If at the top and swiping down, prevent default (which triggers refresh)
      if (container.scrollTop <= 0 && touchMove > touchStart) {
        if (e.cancelable) e.preventDefault();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);
  
  const {
    officers, incidents, assignments, reports, zoneReports, user,
    addOfficer, updateOfficer, deleteOfficer,
    addIncident, updateIncident, deleteIncident,
    addAssignment, updateAssignment, deleteAssignment,
    addReport, updateReport, deleteReport,
    addZoneReport,
    login, logout, setUser
  } = useAppData();

  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem('wg_lang', lang);
  }, [lang]);

  // Network Status Listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Firestore status listener
    const unsubscribeFirestore = onFirestoreStatusChange((connected) => {
      setIsFirestoreOffline(!connected);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeFirestore();
    };
  }, []);

  const [showBackToTop, setShowBackToTop] = useState(false);

  // Handle scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Firebase Auth Listener
  useEffect(() => {
    // Safety timeout to prevent infinite loading spinner
    const safetyTimeout = setTimeout(() => {
      if (authLoading) {
        console.warn("Auth loading timed out. Proceeding to app...");
        setAuthLoading(false);
      }
    }, 8000); // 8 seconds safety timeout

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Check if user exists in Firestore - use cache first for speed, then sync
          const userRef = doc(db, 'users', firebaseUser.uid);
          let userSnap;
          try {
            // Try cache first for immediate response
            userSnap = await getDoc(userRef);
            
            // If it doesn't exist in cache, try server only if online
            if (!userSnap.exists() && navigator.onLine) {
              try {
                userSnap = await getDocFromServer(userRef);
              } catch (serverError) {
                console.warn("Server fetch failed, using cache/fallback:", serverError);
              }
            }
          } catch (e) {
            console.warn("Firestore fetch failed, using fallback:", e);
            // Fallback to a mock snapshot if both fail
            userSnap = { exists: () => false, data: () => ({}) } as any;
          }
          
          let role: 'Admin' | 'Officer' = 'Officer';
          if (userSnap.exists()) {
            role = userSnap.data().role;
          } else {
            // Create user in Firestore if not exists
            // Default admin for the specified email
            if (firebaseUser.email === "Yimamem47@gmail.com") {
              role = 'Admin';
            }
            await setDoc(userRef, {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Officer',
              email: firebaseUser.email || '',
              role: role,
              avatar: firebaseUser.photoURL || ''
            });

            // Also add to officers collection so they appear in dropdowns
            const officerRef = doc(db, 'officers', firebaseUser.uid);
            await setDoc(officerRef, {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Officer',
              email: firebaseUser.email || '',
              rank: 'constable',
              badgeNumber: 'PENDING',
              station: 'Pending Assignment',
              phone: '',
              status: 'Active'
            });
            
            // Send Telegram notification for new auto-registered user (Google Sign-in)
            await sendTelegramMessage(`👤 <b>New User Registered (Google)</b>\n---------------------------\n<b>Name:</b> ${escapeHtml(firebaseUser.displayName || 'Officer')}\n<b>Email:</b> ${escapeHtml(firebaseUser.email)}\n<b>Role:</b> ${escapeHtml(role)}`);
          }

          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Officer',
            email: firebaseUser.email || '',
            role: role
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth sync error:', error);
        // Even if Firestore fails, we should let the user in if they are authed in Firebase
        if (firebaseUser) {
          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Officer',
            email: firebaseUser.email || '',
            role: firebaseUser.email === "Yimamem47@gmail.com" ? 'Admin' : 'Officer'
          });
        } else {
          setUser(null);
        }
      } finally {
        setAuthLoading(false);
        clearTimeout(safetyTimeout);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [setUser]);

  // Scroll to top when view, tab, or splash screen changes
  useEffect(() => {
    if (!showSplash) {
      const containers = document.querySelectorAll('.overflow-y-auto');
      containers.forEach(c => {
        c.scrollTop = 0;
      });
      window.scrollTo(0, 0);
    }
  }, [view, activeTab, showSplash]);

  // Redirect to dashboard if logged in and on landing/auth pages
  useEffect(() => {
    if (!authLoading) {
      if (user && (view === 'login' || view === 'signup')) {
        setView('dashboard');
        setActiveTab('reports');
      } else if (!user && view !== 'home' && view !== 'login' && view !== 'signup' && view !== 'contacts') {
        setView('home');
      }
    }
  }, [user, view, authLoading]);

  const handleAuthSuccess = () => {
    // State is handled by onAuthStateChanged
    setView('dashboard');
    setActiveTab('reports'); // Redirect to reports as requested
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
      setView('home');
      // Force a reload after a short delay to ensure clean state on mobile
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSetActiveTab = (tab: string) => {
    if (tab === 'home-view') {
      setView('home');
      return;
    }
    if (tab !== activeTab) {
      setTabHistory(prev => [...prev, activeTab]);
      setActiveTab(tab);
    }
  };

  const handleBack = () => {
    if (tabHistory.length > 0) {
      const prevTab = tabHistory[tabHistory.length - 1];
      setTabHistory(prev => prev.slice(0, -1));
      setActiveTab(prevTab);
    } else if (activeTab === 'dashboard') {
      setView('home');
    } else {
      setActiveTab('dashboard');
    }
  };

  const renderDashboardContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            incidents={incidents} 
            officers={officers} 
            assignments={assignments} 
            reports={reports}
            zoneReports={zoneReports}
            lang={lang}
            onQuickAction={(action) => {
              if (action === 'add-incident') {
                setInitialEditId(null);
                setActiveTab('incidents');
              }
              if (action === 'add-assignment') setActiveTab('assignments');
              if (action === 'open-qr') setIsQRScannerOpen(true);
              if (action === 'open-id-scanner') setIsIDScannerOpen(true);
              if (action === 'view-officers') setActiveTab('officers');
              if (action === 'view-assignments') setActiveTab('assignments');
              if (action === 'view-zone-reports') setActiveTab('zone-reports');
              if (action.startsWith('edit-incident-')) {
                const id = action.replace('edit-incident-', '');
                setInitialEditId(id);
                setActiveTab('incidents');
              }
              if (action.startsWith('edit-report-')) {
                const id = action.replace('edit-report-', '');
                setInitialEditId(id);
                setActiveTab('reports');
              }
            }}
            onUpdateIncident={updateIncident}
            onDeleteIncident={deleteIncident}
            onUpdateReport={updateReport}
            onDeleteReport={deleteReport}
          />
        );
      case 'incidents':
        return (
          <Incidents 
            incidents={incidents} 
            officers={officers} 
            lang={lang}
            initialEditId={initialEditId}
            onAdd={addIncident} 
            onUpdate={updateIncident} 
            onDelete={deleteIncident} 
          />
        );
      case 'officers':
        return (
          <Officers 
            officers={officers} 
            lang={lang}
            onAdd={addOfficer} 
            onUpdate={updateOfficer} 
            onDelete={deleteOfficer} 
          />
        );
      case 'assignments':
        return (
          <Assignments 
            assignments={assignments} 
            incidents={incidents} 
            officers={officers}
            lang={lang}
            onAdd={addAssignment} 
            onUpdate={updateAssignment} 
            onDelete={deleteAssignment} 
          />
        );
      case 'reports':
        return (
          <Reports 
            reports={reports} 
            officers={officers} 
            lang={lang}
            initialEditId={initialEditId}
            onAdd={addReport} 
            onUpdate={updateReport} 
            onDelete={deleteReport} 
          />
        );
      case 'zone-reports':
        return (
          <ZoneReports
            reports={zoneReports}
            officers={officers}
            onAddReport={addZoneReport}
            language={lang}
            currentUser={user}
          />
        );
      case 'community-reports':
        return <CommunityReports lang={lang} />;
      case 'settings':
        return (
          <Settings 
            user={user} 
            lang={lang}
            onUpdate={async (updates) => {
              if (user) {
                const userRef = doc(db, 'users', user.id);
                try {
                  await updateDoc(userRef, updates);
                  setUser({ ...user, ...updates });
                } catch (error) {
                  console.error('Error updating user profile:', error);
                }
              }
            }} 
          />
        );
      case 'info':
        return <PoliceServices lang={lang} />;
      case 'help':
        return <AppManual lang={lang} />;
      case 'ai-assistant':
        return <AIAssistant lang={lang} />;
      case 'contacts':
        return <EmergencyContacts lang={lang} onBack={() => setView('home')} />;
      default:
        return null;
    }
  };

  useEffect(() => {
    // Play welcome voice
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("በጀግንነት መጠበቅ፣ በሰብዓዊነት ማገልገል");
      utterance.lang = 'am-ET';
      utterance.rate = 0.85; // Slightly slower for a majestic feel
      
      // Try to speak (may be blocked by browser autoplay policies until user interaction)
      window.speechSynthesis.speak(utterance);
    }

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="min-h-screen bg-[#002B5B] flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative"
        >
          <div className="w-32 h-32 flex items-center justify-center p-4 overflow-hidden">
            <img 
              src={APP_LOGO} 
              alt="Logo" 
              className="w-full h-full object-contain brightness-110 contrast-125"
              referrerPolicy="no-referrer"
              style={{ filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.4))' }}
            />
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-4 border-2 border-dashed border-[#FFD700]/30 rounded-full"
          />
        </motion.div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <h1 className="text-2xl font-bold text-white mb-2">የምዕራብ ጎጃም ዞን ፖሊስ</h1>
          <p className="text-[#FFD700] font-medium tracking-widest uppercase text-xs">West Gojjam Zone Police</p>
          <div className="mt-8 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-2 h-2 bg-[#FFD700] rounded-full"
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-4">
        <Loader2 className="text-brand-accent animate-spin mb-4" size={48} />
        <p className="text-brand-text-secondary text-sm animate-pulse mb-8">
          {lang === 'am' ? 'እባክዎ ይጠብቁ...' : 'Loading, please wait...'}
        </p>
        <button 
          onClick={() => setAuthLoading(false)}
          className="text-xs text-brand-text-secondary hover:text-brand-accent underline underline-offset-4 transition-colors"
        >
          {lang === 'am' ? 'መጫኑን አቁም' : 'Skip Loading'}
        </button>
      </div>
    );
  }

  if (view === 'home') {
    return (
      <div className="h-screen overflow-hidden">
        <Home 
          onLogin={() => setView('login')} 
          onSignup={() => setView('signup')} 
          onReport={(type) => setCitizenReportType(type)}
          onViewContacts={() => {
            setView('contacts');
            setActiveTab('contacts');
          }}
          onOpenQR={() => setIsQRScannerOpen(true)}
          onCommunityReport={() => setView('community-report')}
          onGoToDashboard={() => setView('dashboard')}
          lang={lang} 
          setLang={setLang} 
          isLoggedIn={!!user}
        />
        {citizenReportType && (
          <CitizenReport 
            type={citizenReportType} 
            lang={lang} 
            onClose={() => setCitizenReportType(null)}
            onSubmit={(report) => {
              addIncident(report);
            }}
          />
        )}
      </div>
    );
  }

  if (view === 'community-report') {
    return <CommunityReportForm lang={lang} onBack={() => setView('home')} />;
  }

  if (view === 'contacts' && !user) {
    return (
      <div className="h-screen overflow-y-auto bg-brand-bg p-4 lg:p-8 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-7xl mx-auto">
          <EmergencyContacts 
            lang={lang} 
            onBack={() => setView('home')} 
          />
        </div>
      </div>
    );
  }

  if (view === 'login' || view === 'signup') {
    return (
      <Auth 
        type={view} 
        lang={lang}
        onLanguageChange={setLang}
        onSuccess={handleAuthSuccess} 
        onSwitch={() => setView(view === 'login' ? 'signup' : 'login')} 
        onBack={() => setView('home')}
      />
    );
  }

  return (
    <ErrorBoundary lang={lang}>
      <div className="h-screen flex flex-col relative overflow-hidden">
        <AnimatePresence>
          {(isOffline || isFirestoreOffline) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`fixed top-0 left-0 w-full z-[1000] ${isOffline ? 'bg-rose-600' : 'bg-amber-500'} text-white px-4 py-3 flex flex-col items-center justify-center gap-1 font-bold text-sm shadow-xl border-b border-white/20`}
            >
              <div className="flex items-center gap-2">
                <Phone className="animate-pulse" size={18} />
                <span>
                  {isOffline 
                    ? (lang === 'am' ? 'ኢንተርኔት ተቋርጧል - ከመስመር ውጭ ነዎት' : 'Network Disconnected - You are offline')
                    : (lang === 'am' ? 'ከፋየርቤዝ ጋር መገናኘት አልተቻለም - እባክዎ አድብሎከርን ያጥፉ' : 'Cannot reach Firestore - Please check your connection or disable Adblockers')
                  }
                </span>
                {!isOffline && isFirestoreOffline && (
                  <div className="flex items-center gap-2 ml-2">
                    <button 
                      onClick={handleReconnect}
                      disabled={isReconnecting}
                      className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px] transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {isReconnecting ? <Loader2 size={10} className="animate-spin" /> : <ArrowUp size={10} className="rotate-90" />}
                      {lang === 'am' ? 'እንደገና ሞክር' : 'Retry'}
                    </button>
                    <button 
                      onClick={async () => {
                        if (window.confirm(lang === 'am' ? 'ሁሉንም ዳታ አጽድተው እንደገና መጀመር ይፈልጋሉ?' : 'Are you sure you want to clear all local data and reset?')) {
                          setIsReconnecting(true);
                          await clearFirestoreCache();
                          setIsReconnecting(false);
                          window.location.reload();
                        }
                      }}
                      disabled={isReconnecting}
                      className="px-2 py-0.5 bg-rose-500/40 hover:bg-rose-500/60 rounded text-[10px] transition-colors border border-white/20 disabled:opacity-50"
                      title={lang === 'am' ? 'ሁሉንም ዳታ አጽዳ' : 'Clear all local data and reset'}
                    >
                      {lang === 'am' ? 'ሙሉ በሙሉ አጽዳ' : 'Force Reset'}
                    </button>
                  </div>
                )}
              </div>
              {!isOffline && isFirestoreOffline && (
                <p className="text-[10px] opacity-90 font-normal max-w-md text-center">
                  {lang === 'am' 
                    ? 'ይህ አብዛኛውን ጊዜ የሚከሰተው በBrave Shields ወይም በሌሎች አድብሎከሮች ምክንያት ነው። እባክዎ ለዚህ ድረ-ገጽ አድብሎከሩን ያጥፉ።' 
                    : 'This is often caused by Brave Shields or other Adblockers. Please disable them for this site to function correctly.'}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <Layout 
          activeTab={activeTab} 
          setActiveTab={handleSetActiveTab} 
          onBack={handleBack}
          onLogout={handleLogout}
          userName={user?.name || 'User'}
          lang={lang}
          setLang={setLang}
        >
          {renderDashboardContent()}
        </Layout>

        {/* Back to Top Button */}
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              onClick={scrollToTop}
              className="fixed bottom-24 lg:bottom-8 right-6 z-[60] p-3 bg-brand-accent text-brand-bg rounded-full shadow-lg shadow-brand-accent/20 hover:scale-110 active:scale-95 transition-all"
              aria-label="Back to top"
            >
              <ArrowUp size={24} strokeWidth={3} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Floating AI Assistant Toggle - Smaller & Less Intrusive */}
        <AnimatePresence>
          {user && !isAIChatOpen && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: 20 }}
              onClick={() => setIsAIChatOpen(true)}
              className="fixed bottom-24 lg:bottom-24 right-4 z-[60] p-2 bg-brand-accent text-brand-bg rounded-full shadow-lg shadow-brand-accent/20 hover:scale-105 active:scale-95 transition-all border border-brand-bg"
              aria-label="Open AI Assistant"
            >
              <Bot size={18} strokeWidth={2.5} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Compact AI Assistant Window - Significantly Smaller */}
        <AnimatePresence>
          {isAIChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="fixed bottom-24 lg:bottom-8 right-4 lg:right-8 z-[100] w-[calc(100vw-2rem)] sm:w-[280px] shadow-2xl rounded-xl overflow-hidden border border-brand-border bg-brand-card"
            >
              <div className="bg-brand-accent px-3 py-2 flex items-center justify-between text-brand-bg">
                <div className="flex items-center gap-2">
                  <Bot size={16} />
                  <span className="font-bold text-xs">{lang === 'am' ? 'AI ረዳት' : 'AI Assistant'}</span>
                </div>
                <button 
                  onClick={() => setIsAIChatOpen(false)}
                  className="p-1 hover:bg-black/10 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="h-[300px] bg-brand-bg">
                <AIAssistant lang={lang} compact={true} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isQRScannerOpen && (
          <Scanner 
            lang={lang} 
            onClose={() => setIsQRScannerOpen(false)} 
          />
        )}

        {isIDScannerOpen && (
          <PoliceIDScanner
            lang={lang}
            onClose={() => setIsIDScannerOpen(false)}
            officers={officers}
          />
        )}

        {scanResult && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card w-full max-w-md p-8 text-center"
            >
              <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-accent/20">
                <CheckCircle size={32} className="text-brand-accent" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t.scanResult || 'Scan Result'}</h3>
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border mb-8 break-all font-mono text-sm">
                {scanResult}
              </div>
              <button 
                onClick={() => setScanResult(null)}
                className="w-full btn-primary"
              >
                {t.close || 'Close'}
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
