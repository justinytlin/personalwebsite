"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const pubs = [
  {
    authors: "Hossain KH, Chuong T, Abad E, Lin J, Xia C, Li M, Chen Y, Arakaki X, and Vasudevan A",
    year: "2025",
    title: "Selective Vulnerability of GABAergic Neurons in Chronic Migraine",
    journal: "The Journal of Headache and Pain",
    link: "https://doi.org/10.1186/s10194-025-02223-9",
  },
  {
    authors: "Lin, J.",
    year: "2025",
    title: "Diagnostic Utility of Protein Biomarkers for Distinguishing Acute Ischemic Stroke and Transient Ischemic Attack: A Meta-Analysis",
    journal: "medRxiv",
    link: "https://doi.org/10.1101/2025.07.09.25331200",
  },
  {
    authors: "Lin, J., & Parkinson, D.",
    year: "2024",
    title: "Effects of alveolar bone grafts vs. orthognathic surgery on cleft palate speech nasalance: A meta-analysis",
    journal: "Journal of Emerging Investigators",
    link: "https://doi.org/10.59720/24-003",
  },
  {
    authors: "Lin, J.",
    year: "2024",
    title: "Medical Insights: Exploring the Effects of Surgery on Paediatric Medical Traumatic Stress",
    journal: "Medic Mentor Magazine, Summer 2024 — Skin Deep",
    link: undefined,
  },
  {
    authors: "Lin, J.",
    year: "2024",
    title: "Cleft Palate Development: Epigenetic Influences of Environmental Factors",
    journal: "American Society of Human Genetics — 2024 DNA Day Essay Contest (3rd Place)",
    link: "https://www.ashg.org/discover-genetics/k-12-education/dna-day/2024-dna-day-essay-contest-full-essays/#3rdplace",
  },
];

const Publications = () => {
  return (
    <div className="space-y-6">
      {pubs.map((pub, i) => (
        <motion.div
          key={i}
          className="grid md:grid-cols-[60px_1fr] gap-3 md:gap-6"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: i * 0.05 }}
        >
          <div className="md:text-right pt-0.5">
            <span className="text-xs font-medium text-mid-blue">{pub.year}</span>
          </div>
          <div className="border-l-2 border-slate-100 pl-6">
            <p className="text-[14px] text-muted mb-1">{pub.authors}</p>
            <p className="text-[15px] font-medium text-ink leading-snug mb-1">
              {pub.title}
            </p>
            <p className="text-[13px] text-muted italic mb-2">{pub.journal}</p>
            {pub.link && (
              <a
                href={pub.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-mid-blue hover:text-slate-blue transition-colors"
              >
                View publication <ExternalLink size={11} />
              </a>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default Publications;
