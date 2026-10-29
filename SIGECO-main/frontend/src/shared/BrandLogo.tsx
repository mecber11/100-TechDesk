export function BrandLogo({ className = "h-12 w-12" }: { className?: string }) {
  return <img src="/branding/ingenieros-transparent.png" alt="100% Ingenieros" width={1254} height={1254} className={`shrink-0 object-contain drop-shadow-[0_0_10px_rgba(103,232,249,0.12)] ${className}`} />;
}
