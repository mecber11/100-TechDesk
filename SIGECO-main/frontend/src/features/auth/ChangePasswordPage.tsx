import { AuthWatermark } from "../../shared/AuthWatermark";
import { BrandLogo } from "../../shared/BrandLogo";
import { FormEvent, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api, setSession } from "../../lib/api";
import { queryClient } from "../../lib/queryClient";
import { useAuth } from "../../store/auth";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
};

function PasswordField({ label, value, onChange, autoComplete, minLength }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.11em] text-slate-400">{label}</span>
      <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.055] px-4 transition focus-within:border-cyan-300/55 focus-within:bg-white/[0.075]">
        <KeyRound size={18} className="text-slate-500" />
        <input required minLength={minLength} type={visible ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500" placeholder="••••••••••••" />
        <button type="button" onClick={() => setVisible((current) => !current)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white/[0.06] hover:text-cyan-200" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
      </div>
    </label>
  );
}

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rules = useMemo(() => [
    { label: "8 caracteres como mínimo", valid: password.length >= 8 },
    { label: "Una letra mayúscula", valid: /[A-Z]/.test(password) },
    { label: "Una letra minúscula", valid: /[a-z]/.test(password) },
    { label: "Un número", valid: /\d/.test(password) },
  ], [password]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      await api("/auth/password", { method: "POST", body: JSON.stringify({ current_password: currentPassword, password, password_confirmation: confirmation }) });
      setSession(null);
      queryClient.clear();
      useAuth.setState({ user: null, initialized: true });
      navigate("/login", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo actualizar la contraseña.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#06121f] px-4 py-6 sm:px-7 lg:flex lg:items-center lg:px-10 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,220,231,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,220,231,0.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_82%)]" />
        <motion.div className="absolute -left-32 top-[-5rem] h-[500px] w-[500px] rounded-full bg-cyan-400/[0.17] blur-[125px]" animate={reduceMotion ? undefined : { x: [0, 90, 0], y: [0, 55, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute -bottom-48 right-[-6rem] h-[600px] w-[600px] rounded-full bg-violet-500/[0.17] blur-[145px]" animate={reduceMotion ? undefined : { x: [0, -80, 0], scale: [1, 1.15, 1] }} transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }} />
      </div>

      <section className="relative mx-auto grid min-h-[740px] w-full max-w-[1200px] overflow-hidden rounded-[30px] border border-white/[0.09] bg-[#0c1c2d]/95 shadow-[0_34px_100px_rgba(0,0,0,0.42)] lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden border-r border-white/[0.07] bg-white/[0.025] p-14 lg:flex lg:flex-col lg:justify-between xl:p-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_25%,rgba(34,211,238,0.13),transparent_32%),linear-gradient(145deg,rgba(15,43,64,0.45),transparent)]" />
          <div className="relative z-10 flex items-center gap-3"><BrandLogo className="h-14 w-14" /><div><p className="font-black">SIGECO</p><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100/40">Control corporativo</p></div></div>

          <div className="relative z-10 max-w-xl">
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 160 }} className="relative mb-9 grid h-28 w-28 place-items-center rounded-[32px] border border-cyan-200/15 bg-cyan-300/[0.08] text-cyan-200 shadow-[0_25px_70px_rgba(6,182,212,0.15)]">
              <LockKeyhole size={45} />
              <motion.span className="absolute inset-[-18px] rounded-[42px] border border-cyan-200/10" animate={reduceMotion ? undefined : { scale: [0.94, 1.08, 0.94], opacity: [0.35, 0.75, 0.35] }} transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }} />
            </motion.div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100/75"><ShieldCheck size={13} /> Protección de cuenta</div>
            <h1 className="text-4xl font-black leading-[1.08] tracking-[-0.04em] xl:text-5xl">Una contraseña nueva,<span className="block bg-gradient-to-r from-cyan-200 via-teal-glow to-violet-300 bg-clip-text text-transparent">un acceso más seguro.</span></h1>
            <p className="mt-6 max-w-lg text-[15px] leading-7 text-slate-300/65">Este paso protege tu identidad y los datos de tu área antes de entrar al sistema.</p>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-xs font-semibold text-slate-500"><Sparkles size={15} className="text-cyan-300/70" /> Tus credenciales se transmiten de forma segura.</div>
        </aside>

        <div className="relative isolate flex min-h-[680px] items-center justify-center overflow-hidden bg-[#0b1726]/80 px-5 py-9 sm:px-10 lg:px-16 xl:px-24">
          <AuthWatermark />
          <motion.form onSubmit={submit} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-lg">
            <div className="mb-8 lg:hidden"><div className="mb-8 flex items-center gap-3"><BrandLogo className="h-14 w-14" /><span className="font-black">SIGECO</span></div><div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] text-cyan-200"><LockKeyhole size={21} /></div></div>
            <div className="mb-8"><h2 className="text-3xl font-black tracking-[-0.035em] sm:text-4xl">Protege tu cuenta</h2><p className="mt-2 text-sm leading-6 text-slate-400">Crea una contraseña segura para continuar a tu espacio de trabajo.</p></div>

            <div className="space-y-4">
              <PasswordField label="Contraseña actual" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
              <PasswordField label="Nueva contraseña" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} />
              <PasswordField label="Confirmar contraseña" value={confirmation} onChange={setConfirmation} autoComplete="new-password" minLength={8} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
              {rules.map((rule) => <div key={rule.label} className={`flex items-center gap-2 text-[11px] font-semibold transition-colors ${rule.valid ? "text-emerald-300" : "text-slate-500"}`}><span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${rule.valid ? "border-emerald-300/40 bg-emerald-300/10" : "border-white/10"}`}>{rule.valid && <Check size={10} />}</span>{rule.label}</div>)}
            </div>

            <AnimatePresence>{error && <motion.p role="alert" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200">{error}</motion.p>}</AnimatePresence>

            <motion.button disabled={busy} whileHover={busy ? undefined : { y: -2 }} whileTap={busy ? undefined : { scale: 0.985 }} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-teal-glow to-cyan-400 text-sm font-black text-[#07202d] shadow-[0_16px_40px_rgba(34,211,238,0.2)] disabled:cursor-wait disabled:opacity-70">{busy ? <><motion.span className="h-4 w-4 rounded-full border-2 border-[#07202d]/25 border-t-[#07202d]" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }} /> Actualizando…</> : <>Actualizar contraseña <CheckCircle2 size={18} /></>}</motion.button>
            <p className="mt-6 text-center text-xs font-semibold text-slate-600"><ShieldCheck size={14} className="mr-1.5 inline" />Al finalizar, iniciarás sesión con tu nueva contraseña.</p>
          </motion.form>
        </div>
      </section>
    </main>
  );
}
