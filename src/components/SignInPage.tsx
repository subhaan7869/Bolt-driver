import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Mail, 
  User, 
  LogIn, 
  Key, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Globe,
  Database,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface SignInPageProps {
  onBypass: () => void;
  playSoundEffect: (type: 'tap' | 'complete' | 'warn' | 'chime') => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({ onBypass, playSoundEffect }) => {
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [email, setEmail] = useState<string>(() => {
    return localStorage.getItem('swift_remembered_email') || '';
  });
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem('swift_remember_me') !== 'false';
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Focus effect sound
  const handleInputChange = () => {
    if (errorMsg) setErrorMsg(null);
  };

  const handleGoogleSignIn = async () => {
    playSoundEffect('tap');
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
      playSoundEffect('complete');
    } catch (err: any) {
      playSoundEffect('warn');
      console.error(err);
      setErrorMsg(
        err.message.includes('popup-blocked') 
          ? "Popup was blocked by your browser. Please allow popups, or open this page in a new window to sign in."
          : err.message || "Failed to authenticate with Google."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill in all credentials.");
      playSoundEffect('warn');
      return;
    }
    playSoundEffect('tap');
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (rememberMe) {
        localStorage.setItem('swift_remembered_email', email);
        localStorage.setItem('swift_remember_me', 'true');
      } else {
        localStorage.removeItem('swift_remembered_email');
        localStorage.setItem('swift_remember_me', 'false');
      }

      if (isRegistering) {
        // Register new email user
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        playSoundEffect('complete');
        setSuccessMsg("Account created successfully! Synchronising profile database...");
      } else {
        // Sign in existing user
        await signInWithEmailAndPassword(auth, email, password);
        playSoundEffect('complete');
      }
    } catch (err: any) {
      playSoundEffect('warn');
      console.error(err);
      let friendlyError = err.message;
      if (err.code === 'auth/wrong-password') {
        friendlyError = "Incorrect password. Please verify security parameters.";
      } else if (err.code === 'auth/user-not-found') {
        friendlyError = "No registered operator found with this email.";
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyError = "Email identity is already registered in the database.";
      } else if (err.code === 'auth/weak-password') {
        friendlyError = "Security check: Password must be at least 6 characters.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = "Please enter a valid operator email address.";
      }
      setErrorMsg(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[120] bg-[#090a0f] text-zinc-100 flex flex-col justify-center items-center p-4 font-sans select-none overflow-y-auto">
      {/* Background ambient mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000012_1px,transparent_1px),linear-gradient(to_bottom,#00000012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[360px] bg-zinc-950/80 backdrop-blur-md border border-zinc-900 rounded-[32px] p-6 shadow-2xl relative z-10"
      >
        {/* App Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
            <div className="w-full h-full rounded-[14px] bg-zinc-950 flex items-center justify-center font-black text-emerald-400 text-lg tracking-tighter">
              SW
            </div>
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight text-white leading-none">
            SWIFT <span className="text-emerald-400 font-medium">Pilot</span>
          </h1>
          <p className="text-[10px] text-zinc-450 uppercase font-mono tracking-widest mt-1.5">
            Cloud Dispatch Co-Pilot Terminal
          </p>
        </div>

        {/* Custom tabs to switch between Login and Register */}
        <div className="flex p-1 bg-zinc-900/60 rounded-xl mb-4 border border-zinc-900">
          <button
            type="button"
            onClick={() => { playSoundEffect('tap'); setIsRegistering(false); setErrorMsg(null); }}
            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${!isRegistering ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-250'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { playSoundEffect('tap'); setIsRegistering(true); setErrorMsg(null); }}
            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${isRegistering ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-250'}`}
          >
            Register
          </button>
        </div>

        {/* Success/Error Alerts */}
        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded-xl flex gap-2 items-start text-left leading-relaxed font-semibold"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2.5 rounded-xl flex gap-2 items-start text-left leading-relaxed font-semibold"
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500 mt-0.5" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Credentials Form */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
          {isRegistering && (
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[8px] font-black uppercase tracking-wider text-zinc-400 pl-1 font-mono">
                Operator Full Name
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                  <User className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. John Daniel"
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); handleInputChange(); }}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 rounded-xl py-2 px-9 text-xs text-white placeholder-zinc-550 font-bold outline-none transition"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[8px] font-black uppercase tracking-wider text-zinc-400 pl-1 font-mono">
              Driver Registry Email
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                <Mail className="w-3.5 h-3.5" />
              </span>
              <input
                type="email"
                required
                placeholder="driver@swift-dispatch.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); handleInputChange(); }}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 rounded-xl py-2 px-9 text-xs text-white placeholder-zinc-550 font-bold outline-none transition"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[8px] font-black uppercase tracking-wider text-zinc-400 pl-1 font-mono">
              Secure Passcode
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                <Lock className="w-3.5 h-3.5" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); handleInputChange(); }}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 rounded-xl py-2 px-9 text-xs text-white placeholder-zinc-550 font-bold outline-none transition"
              />
            </div>
          </div>

          {/* Remember Me Switch */}
          <div className="flex justify-between items-center px-1 mt-1 font-mono text-[8.5px]">
            <label className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-250">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => { playSoundEffect('tap'); setRememberMe(e.target.checked); }}
                className="rounded bg-zinc-900 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Remember Account</span>
            </label>
            <span className="text-zinc-550 uppercase">AES-256 secure storage</span>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-emerald-500/10 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-1.5 mt-2"
          >
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegistering ? 'Initialise Registry Account' : 'Authenticate Operator'}</span>
                <LogIn className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-900" />
          </div>
          <span className="relative px-3 bg-[#090a0f] text-[7.5px] font-black text-zinc-500 font-mono uppercase tracking-widest">
            Identity Providers
          </span>
        </div>

        {/* Google sign-in */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-bold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer active:scale-98 transition flex items-center justify-center gap-2"
        >
          {/* Custom SVG Google icon */}
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-1.14 2.76-2.4 3.61v3.01h3.89c2.28-2.1 3.59-5.18 3.59-8.47z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.89-3.01c-1.08.72-2.45 1.16-4.04 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.11C3.18 21.88 7.31 24 12 24z"/>
            <path fill="#FBBC05" d="M5.32 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.61H1.21C.44 8.16 0 9.89 0 12s.44 3.84 1.21 5.39l4.11-3.11z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.91 1.19 15.19 0 12 0 7.31 0 3.18 2.12 1.21 5.39l4.11 3.11c.94-2.85 3.57-4.96 6.68-4.96z"/>
          </svg>
          <span>Sync via Google Cloud</span>
        </button>

        {/* Demo / Offline Bypass Mode Button */}
        <button
          onClick={() => {
            playSoundEffect('tap');
            onBypass();
          }}
          className="w-full mt-4 py-2 bg-transparent text-emerald-400 hover:text-emerald-300 font-bold text-[9.5px] uppercase tracking-widest border border-dashed border-emerald-500/20 hover:border-emerald-500/40 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
        >
          <span>Enter Simulator (Offline / Demo Bypass)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </div>
  );
};
