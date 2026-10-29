export function AuthWatermark() {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-cyan-400/[0.06] blur-[90px]" />
    <img src="/branding/login-background.png" alt="" className="absolute right-[-12%] top-1/2 h-[78%] max-h-[620px] w-[95%] -translate-y-1/2 select-none object-contain opacity-[0.045] mix-blend-screen invert sm:opacity-[0.06]" />
  </div>;
}
