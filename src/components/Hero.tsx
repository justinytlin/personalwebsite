"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "6", label: "research roles" },
  { value: "5", label: "publications" },
  { value: "3", label: "conference talks" },
];

const Hero = () => {
  return (
    <section className="min-h-screen flex flex-col justify-center bg-white pt-16 relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#eff6ff] via-white to-white pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 py-24 w-full">
        <div className="max-w-2xl">
          <motion.p
            className="text-xs font-semibold text-mid-blue mb-5 tracking-widest uppercase"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            UCLA · Neuroscience · 4.0 GPA
          </motion.p>

          <motion.h1
            className="text-5xl md:text-[64px] font-bold text-ink mb-5 leading-[1.1] tracking-tight"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
          >
            Justin Lin
          </motion.h1>

          <motion.p
            className="text-lg text-muted mb-5 font-light"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16 }}
          >
            neuroscience student @ ucla
          </motion.p>

          <motion.p
            className="text-[15px] text-muted leading-relaxed mb-10 max-w-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.24 }}
          >
            I conduct research in neurobiology, bioinformatics, and biomedical science,
            focusing on understanding brain function and disease through experimental
            and computational approaches.
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-2.5 mb-16"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.32 }}
          >
            {[
              { label: "Research", href: "#research" },
              { label: "Publications", href: "#publications" },
              { label: "Projects", href: "#projects" },
              { label: "Contact", href: "#contact" },
            ].map((btn, i) => (
              <a
                key={btn.label}
                href={btn.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  i === 0
                    ? "bg-[#3b82f6] text-white hover:bg-[#1e40af]"
                    : "bg-[#eff6ff] text-[#1e40af] hover:bg-[#bfdbfe] border border-blue-100"
                }`}
              >
                {btn.label}
              </a>
            ))}
          </motion.div>

          {/* Stats row */}
          <motion.div
            className="flex gap-8 pt-8 border-t border-slate-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.45 }}
          >
            {stats.map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-ink">{value}</p>
                <p className="text-xs text-muted mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
