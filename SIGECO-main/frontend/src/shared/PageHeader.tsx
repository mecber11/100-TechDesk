import { motion } from "framer-motion";

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mb-7 flex items-start gap-3"
    >
      <motion.span
        initial={{ height: 0 }}
        animate={{ height: 46 }}
        transition={{ delay: 0.08, duration: 0.4 }}
        className="mt-0.5 w-1 shrink-0 rounded-full bg-gradient-to-b from-teal via-cyan-400 to-violet-500 shadow-[0_0_18px_rgba(34,211,238,0.28)]"
      />
      <div>
        <motion.h1
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.04 }}
          className="text-2xl font-black tracking-tight text-navy dark:text-white sm:text-[28px]"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.14 }}
          className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400"
        >
          {subtitle}
        </motion.p>
      </div>
    </motion.div>
  );
}
