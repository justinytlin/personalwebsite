"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const projects = [
  {
    title: "BioScriptAI",
    tag: "Bioinformatics",
    description: "A research-support tool designed to assist with bioinformatics and data analysis workflows, streamlining computational biology research for data processing, analysis, and visualization.",
    link: undefined,
  },
  {
    title: "BCI Prosthetic Hand",
    tag: "CruX Neurotech · Neuroengineering",
    description: "Research-driven project exploring brain-computer interface applications for prosthetic hand control, combining neuroscience principles with engineering to develop assistive technology solutions.",
    link: undefined,
  },
  {
    title: "Stroke Biomarker Meta-Analysis",
    tag: "Independent Research · 2025",
    description: "Systematic meta-analysis using R examining protein biomarkers for differentiating acute ischemic stroke and TIA across 21,570 patients and 63 studies. Published on medRxiv.",
    link: "https://doi.org/10.1101/2025.07.09.25331200",
  },
  {
    title: "Cleft Palate Speech Meta-Analysis",
    tag: "Independent Research · 2024",
    description: "Meta-analysis comparing alveolar bone grafts vs. orthognathic surgery on cleft palate speech nasalance across 304 pediatric patients from 9 studies. Published in Journal of Emerging Investigators.",
    link: "https://doi.org/10.59720/24-003",
  },
  {
    title: "Spaceflight & Alzheimer's Pathways",
    tag: "NASA GeneLab · First Author",
    description: "Investigating the effects of spaceflight on cellular transport pathways and Alzheimer's-related Tau and Aβ interactions using NASA OSDR datasets OSD-562, OSD-564, and RR-3.",
    link: undefined,
  },
];

const Projects = () => {
  return (
    <div className="space-y-5">
      {projects.map((proj, i) => (
        <motion.div
          key={i}
          className="group p-5 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-ice-blue/40 transition-all duration-200"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: i * 0.05 }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                <span className="text-[15px] font-medium text-ink">{proj.title}</span>
                <span className="text-[11px] text-mid-blue bg-blue-50 px-2 py-0.5 rounded-full font-medium">{proj.tag}</span>
              </div>
              <p className="text-[14px] text-muted leading-relaxed">{proj.description}</p>
            </div>
            {proj.link && (
              <a
                href={proj.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-mid-blue transition-colors shrink-0 mt-0.5"
              >
                <ExternalLink size={15} />
              </a>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default Projects;
