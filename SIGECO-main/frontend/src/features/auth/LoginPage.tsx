import { AuthWatermark } from "../../shared/AuthWatermark";
import { BrandLogo } from "../../shared/BrandLogo";
import { FormEvent, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Network,
  ShieldCheck,
  Sparkles,
  TicketCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/auth";

const capabilities = [
  { icon: TicketCheck, label: "Tickets y solicitudes", detail: "Flujos claros entre todas las áreas" },
  { icon: Network, label: "Operación conectada", detail: "Información centralizada y trazable" },
  { icon: ShieldCheck, label: "Acceso protegido", detail: "Roles, sesiones y archivos privados" },
];

export function LoginPage() {
  const login = useAuth((state) => state.login);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const isDemo = import.meta.env.VITE_DEMO_MODE === "true";
  const [email, setEmail] = useState(isDemo ? "ti@ingenieros.edu.pe" : "");
  const [password, setPassword] = useState(isDemo ? "demo1234" : "");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(useAuth.getState().user?.must_change_password ? "/cambiar-contrasena" : "/", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#06121f] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
<div className="absolute inset-0 bg-[linear-gradient(rgba(148,220,231,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,220,231,0.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_78%)]" />
        <motion.div
          className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-cyan-400/20 blur-[110px]"
          animate={reduceMotion ? undefined : { x: [0, 90, 20], y: [0, 50, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 right-[-7rem] h-[520px] w-[520px] rounded-full bg-violet-500/[0.16] blur-[130px]"
          animate={reduceMotion ? undefined : { x: [0, -80, 0], y: [0, -35, 0], scale: [1, 1.14, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-[48%] top-[32%] h-72 w-72 rounded-full bg-teal/10 blur-[100px]"
          animate={reduceMotion ? undefined : { opacity: [0.35, 0.8, 0.35], scale: [0.9, 1.18, 0.9] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1280px] items-center px-4 py-6 sm:px-7 lg:px-10">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="grid w-full overflow-hidden rounded-[30px] border border-white/[0.09] bg-[#0c1c2d]/95 shadow-[0_34px_100px_rgba(0,0,0,0.42)] lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div className="relative hidden min-h-[740px] overflow-hidden border-r border-white/[0.07] p-10 lg:flex lg:flex-col lg:justify-between xl:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(34,211,238,0.12),transparent_32%),linear-gradient(145deg,rgba(15,43,64,0.62),rgba(8,24,40,0.2))]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute -right-20 top-16 h-96 w-96 rounded-full border border-cyan-100/[0.06]"
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
              >
                <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.85)]" />
              </motion.div>
              <motion.div
                className="absolute -right-8 top-28 h-72 w-72 rounded-full border border-cyan-100/[0.05]"
                animate={reduceMotion ? undefined : { rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-teal-glow shadow-[0_0_16px_rgba(45,212,191,0.8)]" />
              </motion.div>
              <div className="absolute left-8 top-36 h-72 w-72 rounded-full bg-cyan-400/10 blur-[80px]" />
            </div>

            <div className="relative z-10">
              <div className="mb-7 flex items-center gap-3">
                <BrandLogo className="h-12 w-12" />
                <div>
                  <p className="text-base font-black tracking-tight">SIGECO</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-100/45">Control corporativo</p>
                </div>
              </div>

              <div className="relative mb-7 flex h-48 items-center justify-center xl:h-52">
                <div aria-hidden="true" className="absolute h-36 w-36 rounded-full bg-cyan-300/15 blur-3xl" />
                <img src="/branding/login-background.png" alt="100% Ingenieros" width={3294} height={4257} className="relative h-full w-auto object-contain mix-blend-screen invert drop-shadow-[0_0_24px_rgba(103,232,249,0.12)]" />
              </div>
              <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18, duration: 0.65 }}>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100/75">
                  <Sparkles size={13} /> Operación inteligente
                </div>
                <h1 className="max-w-xl text-3xl font-black leading-[1.15] tracking-[-0.04em] xl:text-4xl">
                  Todo tu equipo,
                  <span className="block bg-gradient-to-r from-cyan-200 via-teal-glow to-violet-300 bg-clip-text text-transparent">trabajando en sincronía.</span>
                </h1>
                <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300/70">
                  Gestiona solicitudes, documentos y atención entre áreas desde un entorno seguro, claro y conectado.
                </p>
              </motion.div>
            </div>

            <div className="relative z-10 mt-8 grid gap-2">
              {capabilities.map(({ icon: Icon, label, detail }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + index * 0.1, duration: 0.5 }}
                  whileHover={{ x: 6, backgroundColor: "rgba(255,255,255,0.07)" }}
                  className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3 transition-colors"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-200/10 bg-cyan-300/[0.08] text-cyan-200"><Icon size={19} /></div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-100">{label}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{detail}</p>
                  </div>
                  <CheckCircle2 className="ml-auto text-emerald-300/70" size={17} />
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative isolate flex min-h-[620px] items-center justify-center overflow-hidden bg-[#0b1726]/80 px-6 py-9 sm:px-10 lg:min-h-[740px] xl:px-14">
            <AuthWatermark />
            <motion.form
              onSubmit={onSubmit}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md"
            >
              <div className="mb-9 lg:hidden">
                <div className="mb-7 flex items-center gap-3">
                  <BrandLogo className="h-14 w-14" />
                  <div>
                    <p className="font-black">SIGECO</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100/40">Control corporativo</p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 220, damping: 18 }}
                  className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/15 bg-gradient-to-br from-cyan-300/15 to-violet-400/10 text-cyan-200"
                >
                  <LockKeyhole size={21} />
                </motion.div>
                <h2 className="text-3xl font-black tracking-[-0.035em] text-white">Bienvenido de nuevo</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">Ingresa tus credenciales para continuar a tu espacio de trabajo.</p>
              </div>

              {isDemo && (
                <div className="mb-5 flex items-center justify-between rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-200">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-cyan-300" />
                    <span><strong>Modo Demo Activo</strong> (Sin backend)</span>
                  </div>
                  <span className="rounded-full bg-cyan-400/20 px-2.5 py-0.5 font-mono text-[11px] font-bold text-cyan-100">TI Encargado</span>
                </div>
              )}

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Correo corporativo</span>
                  <motion.div animate={{ borderColor: focused === "email" ? "rgba(103,232,249,0.55)" : "rgba(255,255,255,0.09)" }} className="flex h-14 items-center gap-3 rounded-2xl border bg-white/[0.055] px-4 shadow-inner shadow-black/10">
                    <Mail size={19} className={focused === "email" ? "text-cyan-300" : "text-slate-500"} />
                    <input
                      className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-400"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      type="email"
                      autoComplete="username"
                      placeholder="nombre@ingenieros.edu.pe"
                      required
                    />
                  </motion.div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Contraseña</span>
                  <motion.div animate={{ borderColor: focused === "password" ? "rgba(103,232,249,0.55)" : "rgba(255,255,255,0.09)" }} className="flex h-14 items-center gap-3 rounded-2xl border bg-white/[0.055] px-4 shadow-inner shadow-black/10">
                    <LockKeyhole size={19} className={focused === "password" ? "text-cyan-300" : "text-slate-500"} />
                    <input
                      className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Ingresa tu contraseña"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white/[0.06] hover:text-cyan-200" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </motion.div>
                </label>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -6, height: 0 }} className="mt-4 overflow-hidden">
                    <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={busy}
                whileHover={busy ? undefined : { y: -2, scale: 1.005 }}
                whileTap={busy ? undefined : { scale: 0.985 }}
                className="relative mt-6 flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-300 via-teal-glow to-cyan-400 px-5 text-sm font-black text-[#07202d] shadow-[0_16px_40px_rgba(34,211,238,0.22)] transition disabled:cursor-wait disabled:opacity-70"
              >
                <motion.span className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/45 blur-md" animate={reduceMotion || busy ? undefined : { x: ["0%", "500%"] }} transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.8, ease: "easeInOut" }} />
                {busy ? (
                  <><motion.span className="h-4 w-4 rounded-full border-2 border-[#07202d]/25 border-t-[#07202d]" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }} />Validando acceso…</>
                ) : (
                  <>Ingresar al sistema <ArrowRight size={18} /></>
                )}
              </motion.button>

              <div className="mt-7 flex items-center justify-center gap-1.5 text-center text-sm text-slate-500">
                <span>¿Aún no tienes acceso?</span>
                <Link to="/register" className="font-extrabold text-cyan-300 transition hover:text-cyan-100">Solicítalo aquí</Link>
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 border-t border-white/[0.06] pt-5 text-[11px] font-semibold text-slate-600">
                <ShieldCheck size={14} /> Sesión protegida y acceso según tu área
              </div>
            </motion.form>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
