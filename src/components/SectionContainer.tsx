"use client";

import { motion } from "framer-motion";

interface SectionContainerProps {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const SectionContainer = ({
  id,
  title,
  children,
  className = "",
}: SectionContainerProps) => {
  return (
    <section id={id} className={`py-20 ${className}`}>
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-semibold text-ink tracking-tight mb-3">
            {title}
          </h2>
          <div className="h-px bg-slate-100 w-full" />
        </motion.div>
        {children}
      </div>
    </section>
  );
};

export default SectionContainer;
