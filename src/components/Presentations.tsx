"use client";

import { motion } from "framer-motion";

const presentations = [
  {
    title: "Investigating the Effects of Spaceflight on Cellular Transport Pathways and Alzheimer's-Related Tau and Aβ Interactions",
    venues: [
      { name: "NASA GeneLab Analysis Working Group Annual Meeting", date: "Sep 25, 2025" },
      { name: "Southern California Conferences for Undergraduate Research", date: "Nov 22, 2025" },
      { name: "American Society for Gravitational and Space Research 2025", date: "Accepted" },
    ],
  },
  {
    title: "Exploring the Effects of Hypergravity on Synaptic Transmission and Bulk Synaptic Vesicle Endocytosis: Implications for Nerve Signaling",
    venues: [
      { name: "American Society for Gravitational and Space Research", date: "Dec 7, 2024" },
    ],
  },
  {
    title: "Endothelial GABAA Receptor Signaling Modulates Postnatal Brain Development",
    venues: [
      { name: "Society for Neuroscience", date: "Oct 5, 2024" },
    ],
  },
];

const Presentations = () => {
  return (
    <div className="space-y-8">
      {presentations.map((pres, i) => (
        <motion.div
          key={i}
          className="grid md:grid-cols-[200px_1fr] gap-4 md:gap-8"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: i * 0.06 }}
        >
          <div className="md:text-right pt-0.5">
            <span className="text-xs font-medium text-mid-blue">
              {pres.venues[0].date}
            </span>
          </div>
          <div className="border-l-2 border-slate-100 pl-6">
            <p className="text-[15px] font-medium text-ink leading-snug mb-3">
              {pres.title}
            </p>
            <div className="space-y-1.5">
              {pres.venues.map((v, j) => (
                <div key={j} className="flex items-baseline gap-2">
                  <span className="text-[13px] text-muted">{v.name}</span>
                  {j > 0 && (
                    <span className="text-[12px] text-muted/60">· {v.date}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default Presentations;
