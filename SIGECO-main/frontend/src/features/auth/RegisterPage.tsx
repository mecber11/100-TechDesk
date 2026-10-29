import { AuthWatermark } from "../../shared/AuthWatermark";
import { BrandLogo } from "../../shared/BrandLogo";
import { FormEvent, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Check, ChevronDown, Eye, EyeOff, KeyRound, Mail, ShieldCheck, Sparkles, User, UserCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/auth";

const accessSteps = [
  { icon: UserCheck, title: "Envía tu solicitud", detail: "Completa tus datos corporativos." },
  { icon: ShieldCheck, title: "Validación del área", detail: "El responsable revisará tu acceso." },
  { icon: Sparkles, title: "Empieza a trabajar", detail: "Recibirás acceso según tus funciones." },
];

export function RegisterPage() {
  const register = useAuth((state) => state.register);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [slackUserId, setSlackUserId] = useState("");
  const [password, setPassword] = useState("");
  const [area, setArea] = useState("VENTAS");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, area, slackUserId.trim().toUpperCase());
      setSuccess(true);
      window.setTimeout(() => navigate("/login"), 3000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo enviar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = "flex h-[54px] items-center gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.055] px-4 transition focus-within:border-cyan-300/55 focus-within:bg-white/[0.075]";
  const inputClass = "h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500";

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#06121f] px-4 py-6 sm:px-7 lg:flex lg:items-center lg:px-10 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,220,231,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,220,231,0.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_82%)]" />
        <motion.div className="absolute -left-32 top-10 h-[480px] w-[480px] rounded-full bg-cyan-400/[0.16] blur-[125px]" animate={reduceMotion ? undefined : { x: [0, 75, 0], y: [0, 45, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute -bottom-44 right-[-8rem] h-[560px] w-[560px] rounded-full bg-violet-500/[0.17] blur-[140px]" animate={reduceMotion ? undefined : { x: [0, -65, 0], scale: [1, 1.14, 1] }} transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }} />
      </div>

      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="relative mx-auto grid min-h-[740px] w-full max-w-[1200px] overflow-hidden rounded-[30px] border border-white/[0.09] bg-[#0c1c2d]/95 shadow-[0_34px_100px_rgba(0,0,0,0.42)] lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden border-r border-white/[0.07] bg-white/[0.025] p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.13),transparent_30%),linear-gradient(145deg,rgba(15,43,64,0.42),transparent)]" />
          <motion.div className="absolute -right-28 top-20 h-80 w-80 rounded-full border border-cyan-200/10" animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 32, repeat: Infinity, ease: "linear" }}><span className="absolute left-9 top-10 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_24px_rgba(103,232,249,0.9)]" /></motion.div>

          <div className="relative z-10">
            <Link to="/login" className="inline-flex items-center gap-3"><BrandLogo className="h-14 w-14" /><div><p className="font-black">SIGECO</p><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100/40">Control corporativo</p></div></Link>
            <motion.div initial={{ opacity: 0, x: -25 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.6 }} className="mt-20 max-w-lg">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100/75"><Sparkles size={13} /> Únete al equipo</div>
              <h1 className="text-4xl font-black leading-[1.08] tracking-[-0.04em] xl:text-5xl">Tu espacio de trabajo,<span className="block bg-gradient-to-r from-cyan-200 via-teal-glow to-violet-300 bg-clip-text text-transparent">listo para conectarte.</span></h1>
              <p className="mt-6 max-w-md text-[15px] leading-7 text-slate-300/65">Solicita un acceso seguro y empieza a colaborar con tu área dentro de SIGECO.</p>
            </motion.div>
          </div>

          <div className="relative z-10 space-y-5">
            {accessSteps.map(({ icon: Icon, title, detail }, index) => <motion.div key={title} initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + index * 0.12 }} className="flex items-center gap-4"><div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] text-cyan-200"><Icon size={19} />{index < 2 && <span className="absolute left-1/2 top-[52px] h-5 w-px bg-gradient-to-b from-cyan-200/25 to-transparent" />}</div><div><p className="text-sm font-extrabold text-slate-100">{title}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div></motion.div>)}
          </div>
        </aside>

        <div className="relative isolate flex min-h-[680px] items-center justify-center overflow-hidden bg-[#0b1726]/80 px-5 py-8 sm:px-10 lg:px-14 xl:px-20">
          <AuthWatermark />
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.65, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-xl">
            <div className="mb-7 flex items-center justify-between lg:hidden"><Link to="/login" className="flex items-center gap-3"><BrandLogo className="h-14 w-14" /><span className="font-black">SIGECO</span></Link></div>
            <Link to="/login" className="mb-7 inline-flex items-center gap-2 text-xs font-bold text-slate-400 transition hover:text-cyan-200"><ArrowLeft size={15} /> Volver al inicio de sesión</Link>
            <div className="mb-7"><h2 className="text-3xl font-black tracking-[-0.035em] sm:text-4xl">Solicita tu acceso</h2><p className="mt-2 text-sm leading-6 text-slate-400">Completa tus datos. Tu cuenta será habilitada por el responsable del área.</p></div>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.08] p-8 text-center"><motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220 }} className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-300/15 text-emerald-300"><Check size={30} /></motion.div><h3 className="text-xl font-black">Solicitud enviada</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-300/70">El encargado de tu área revisará la cuenta. Te llevaremos al inicio de sesión.</p></motion.div>
              ) : (
                <motion.form key="form" onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence>{error && <motion.p role="alert" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200">{error}</motion.p>}</AnimatePresence>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2"><span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.11em] text-slate-400">ID de miembro de Slack</span><div className={fieldClass}><User size={18} className="text-slate-500" /><input required pattern="[UW][A-Z0-9]{8,29}" maxLength={30} value={slackUserId} onChange={(event) => setSlackUserId(event.target.value.trim().toUpperCase())} className={inputClass} placeholder="Ej. U012ABCDEF0" /></div><p className="mt-2 text-xs text-slate-400">En Slack: abre tu perfil → Más → Copiar ID de miembro. Usa el Slack de la empresa.</p></label>
                    <label className="block sm:col-span-2"><span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.11em] text-slate-400">Nombre completo</span><div className={fieldClass}><User size={18} className="text-slate-500" /><input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Ej. Juan Pérez" /></div></label>
                    <label className="block sm:col-span-2"><span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.11em] text-slate-400">Correo corporativo</span><div className={fieldClass}><Mail size={18} className="text-slate-500" /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="nombre@ingenieros.edu.pe" /></div></label>
                    <label className="block"><span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.11em] text-slate-400">Área</span><div className={fieldClass}><Building2 size={18} className="text-slate-500" /><select required value={area} onChange={(event) => setArea(event.target.value)} className={`${inputClass} appearance-none`}><option className="bg-[#142131]" value="VENTAS">Ventas</option><option className="bg-[#142131]" value="MKT">Marketing</option><option className="bg-[#142131]" value="TI">TI</option><option className="bg-[#142131]" value="ADM">Administración</option><option className="bg-[#142131]" value="RRHH">Recursos Humanos</option><option className="bg-[#142131]" value="CONT">Contabilidad</option><option className="bg-[#142131]" value="PSICO">Psicología</option></select><ChevronDown size={17} className="text-slate-500" /></div></label>
                    <label className="block"><span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.11em] text-slate-400">Contraseña</span><div className={fieldClass}><KeyRound size={18} className="text-slate-500" /><input required minLength={8} type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} placeholder="Mínimo 8 caracteres" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="text-slate-500 transition hover:text-cyan-200">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
                  </div>
                  <motion.button type="submit" disabled={loading} whileHover={loading ? undefined : { y: -2 }} whileTap={loading ? undefined : { scale: 0.985 }} className="relative mt-2 flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-300 via-teal-glow to-cyan-400 text-sm font-black text-[#07202d] shadow-[0_16px_40px_rgba(34,211,238,0.2)] disabled:cursor-wait disabled:opacity-70">{loading ? <><motion.span className="h-4 w-4 rounded-full border-2 border-[#07202d]/25 border-t-[#07202d]" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }} /> Enviando solicitud…</> : <>Solicitar acceso <ArrowRight size={18} /></>}</motion.button>
                  <p className="pt-2 text-center text-sm text-slate-500">¿Ya tienes una cuenta? <Link to="/login" className="font-extrabold text-cyan-300 transition hover:text-cyan-100">Inicia sesión</Link></p>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.section>
    </main>
  );
}
