"use client";

import { motion } from "framer-motion";

const experiences = [
  {
    institution: "UCLA DGSOM Craniofacial Regeneration Lab",
    location: "Los Angeles, CA",
    role: "Student Research Assistant",
    dates: "Sep 2025 – Present",
    bullets: [
      "Investigating radiomic and spatial transcriptomic feature outcomes associated with biomaterials in craniofacial regeneration to identify imaging-based biomarkers of treatment response under Dr. Justine Lee.",
      "Assisting with a clinical study on long-term behavioral outcomes in pediatric craniofacial patients, engaging with patients during monthly multidisciplinary craniofacial team clinics.",
    ],
  },
  {
    institution: "NASA GeneLab Multi-Omics and Alzheimer's AWG",
    location: "Remote",
    role: "Contributing Researcher",
    dates: "Jul 2024 – Present",
    bullets: [
      "Partnering with cross-institutional researchers utilizing NASA's OSDR to address omics and bioinformatics challenges.",
      "First author collaborating with Stanford professor Dr. Windy McNerney and Dr. Kevin Clark on \"Investigating the Effects of Spaceflight on Cellular Transport Pathways and Alzheimer's-Related Tau and Aβ Interactions,\" analyzing NASA OSDR datasets OSD-562, OSD-564, and RR-3.",
    ],
  },
  {
    institution: "Huntington Medical Research Institutes",
    location: "Pasadena, CA",
    role: "Student Research Assistant",
    dates: "Sep 2023 – Present",
    bullets: [
      "Researched effects of GABAA signaling on postnatal brain development under Dr. Anju Vasudevan and Dr. Kazi Helal Hossain; worked on a second project exploring selective vulnerability of GABAergic neurons in chronic migraine.",
      "Proficient with ImageJ (analyzing blood vessel density, area, cell counts), digital microscope imaging, IHC, ICC, paraffin cutting, micropipetting, and evaluating mice sociability tests.",
    ],
  },
  {
    institution: "Independent Research on Stroke Biomarkers",
    location: "San Marino, CA",
    role: "Student Researcher",
    dates: "Sep 2024 – Jun 2025",
    bullets: [
      "Conducted a meta-analysis using R on the diagnostic utility of protein biomarkers for differentiating acute ischemic stroke and TIA, analyzing data from 21,570 patients across 63 studies.",
      "Mentored by Dr. Vijay Vishwanath (Children's Hospital Los Angeles, Keck Medicine of USC) as part of the AP Research Capstone Program.",
    ],
  },
  {
    institution: "NASA Ames Research Center GeneLab4HS",
    location: "Remote",
    role: "Research Intern",
    dates: "Jul 2024",
    bullets: [
      "Leveraged NASA GeneLab's OSDR to conduct cross-dataset transcriptomics research analyzing Drosophila dataset OSD-207.",
      "Discovered a novel link between genes (shi, stmA, fwe) in chemical synaptic transmission and bulk synaptic vesicle endocytosis; developed an experiment in neuromuscular junction under hypergravity conditions.",
      "Created graphical visualizations using Galaxy, StringDB, and BioRender.",
    ],
  },
  {
    institution: "Independent Research on Cleft Palate Speech",
    location: "Remote",
    role: "Student Researcher",
    dates: "Jul 2023 – Aug 2024",
    bullets: [
      "Conducted a meta-analysis analyzing the effects of two surgical interventions (alveolar bone grafts vs. orthognathic surgery) on cleft palate speech nasalance, across 304 pediatric patients from 9 studies.",
      "Mentored by David Parkinson (University of Michigan Medical School).",
    ],
  },
];

const Research = () => {
  return (
    <div className="space-y-10">
      {experiences.map((exp, i) => (
        <motion.div
          key={i}
          className="grid md:grid-cols-[200px_1fr] gap-4 md:gap-8"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
        >
          {/* Left: dates + location */}
          <div className="md:text-right pt-0.5">
            <p className="text-xs font-medium text-mid-blue">{exp.dates}</p>
            <p className="text-xs text-muted mt-0.5">{exp.location}</p>
          </div>

          {/* Right: content */}
          <div className="border-l-2 border-slate-100 pl-6 pb-6">
            <p className="text-[13px] font-semibold text-mid-blue mb-0.5 uppercase tracking-wide">{exp.institution}</p>
            <p className="text-sm font-medium text-ink mb-3">{exp.role}</p>
            <ul className="space-y-2">
              {exp.bullets.map((b, j) => (
                <li key={j} className="text-[14px] text-muted leading-relaxed flex gap-2">
                  <span className="text-pale-blue mt-1.5 shrink-0">—</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default Research;
