"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, MapPin, ExternalLink, X, Linkedin, Instagram, Github } from "lucide-react";

type Tab = "about" | "research" | "projects";

// ─── DATA ────────────────────────────────────────────────────────────────────

const publications = [
  {
    authors: "Hossain KH, Chuong T, Abad E, Lin J, et al.",
    year: "2025",
    title: "Selective Vulnerability of GABAergic Neurons in Chronic Migraine",
    journal: "The Journal of Headache and Pain",
    link: "https://doi.org/10.1186/s10194-025-02223-9",
  },
  {
    authors: "Lin, J.",
    year: "2025",
    title: "Diagnostic Utility of Protein Biomarkers for Distinguishing Acute Ischemic Stroke and TIA: A Meta-Analysis",
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
    journal: "Medic Mentor Magazine, Summer 2024",
    link: undefined,
  },
  {
    authors: "Lin, J.",
    year: "2024",
    title: "Cleft Palate Development: Epigenetic Influences of Environmental Factors",
    journal: "ASHG — DNA Day Essay Contest (3rd Place)",
    link: "https://www.ashg.org/discover-genetics/k-12-education/dna-day/2024-dna-day-essay-contest-full-essays/#3rdplace",
  },
];

const presentations = [
  {
    title: "Investigating the Effects of Spaceflight on Cellular Transport Pathways and Alzheimer's-Related Tau and Aβ Interactions",
    venues: "NASA GeneLab AWG Annual Meeting (Sep 2025) · SCCUR (Nov 2025) · ASGSR 2025 (Accepted)",
  },
  {
    title: "Exploring the Effects of Hypergravity on Synaptic Transmission and Bulk Synaptic Vesicle Endocytosis: Implications for Nerve Signaling",
    venues: "American Society for Gravitational and Space Research (Dec 2024)",
  },
  {
    title: "Endothelial GABAA Receptor Signaling Modulates Postnatal Brain Development",
    venues: "Society for Neuroscience (Oct 2024)",
  },
];

const projects = [
  {
    title: "BCI Prosthetic Hand",
    tag: "CruX Neurotech @ UCLA",
    description: "Led a team of five to build a motor imagery EEG classifier model for controlling a multi-grasp prosthetic hand",
    link: undefined,
    color: "from-blue-400 to-cyan-500",
  },
  {
    title: "BioscriptAI",
    tag: "Bioinformatics Tool",
    description: "Building an open-source tool that allows researchers to execute bioinformatics research pipelines using plain language",
    link: undefined,
    color: "from-indigo-400 to-blue-500",
  },
];

// ─── TAG COLORS ───────────────────────────────────────────────────────────────

const tagColor: Record<string, string> = {
  UCLA: "bg-blue-100 text-blue-700",
  NASA: "bg-indigo-100 text-indigo-700",
  HMRI: "bg-sky-100 text-sky-700",
  Independent: "bg-slate-100 text-slate-600",
};

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────

const polaroids = [
  { src: "/photo1.jpg", caption: "taipei 101 from 象山" },
  { src: "/photo2.jpg", caption: "tennis courts + rocket launch" },
  { src: "/photo3.jpg", caption: "dockweiler beach ✈️" },
  { src: "/photo4.jpg", caption: "hiking at 九份" },
];

function Polaroid({ src, caption }: { src: string; caption: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      style={{ willChange: "transform" }}
      className="relative cursor-pointer w-44 sm:w-52 lg:w-56"
    >
      <div
        className="relative bg-white"
        style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.13)" }}
      >
        <div className="p-3 pb-0">
          <img
            src={src}
            alt={caption}
            className="w-full h-36 sm:h-40 lg:h-44 object-cover"
            style={{ willChange: "transform" }}
          />
        </div>
        <div className="px-3 py-3">
          <p className="text-[10px] sm:text-[11px] text-slate-500 font-light text-center leading-tight">{caption}</p>
        </div>
      </div>
    </motion.div>
  );
}

function AboutSection() {
  const textDelay = 0.7;
  const photoBaseDelay = textDelay + 0.4;

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row items-start justify-center max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 gap-10 lg:gap-16 pt-4 lg:pt-16">

        {/* Left: text */}
        <div className="flex-shrink-0 w-full lg:w-72 xl:w-96 lg:pt-7 lg:ml-8">
          {/* Name pops in first */}
          <motion.h1
            className="font-serif text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-ink mb-4 leading-none tracking-tight font-light whitespace-nowrap"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            Justin Lin
          </motion.h1>

          {/* Rest of text fades in after 1s */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: textDelay, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-2 text-ink text-base mb-5 mt-6 lg:mt-8">
              <MapPin size={16} className="text-mid-blue" />
              <span className="font-light tracking-wide">los angeles, ca</span>
            </div>
            <div className="space-y-2 text-[15px] md:text-[16px] lg:text-[17px] text-ink leading-relaxed font-light">
              <p>neuroscience @ ucla</p>
              <p>previously @ nasa</p>
              <p className="text-mid-blue">building Bioscript—an AI native ecosystem for organizing and analyzing academic papers</p>
              <p>--</p>
              <p className="text-navy-blue">some cool flicks i took:</p>
            </div>
          </motion.div>
        </div>

        {/* Right: 2×2 grid, shown on all screen sizes (hidden on lg was too restrictive) */}
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:gap-6 shrink-0 w-full lg:w-auto lg:ml-auto lg:-mt-4 lg:mr-8 pb-8 lg:pb-0">
          {polaroids.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.82, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.65,
                delay: photoBaseDelay + i * 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{ willChange: "transform, opacity" }}
            >
              <Polaroid {...p} />
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}

function ResearchSection() {
  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="text-center mb-8">
          <h2 className="font-serif text-3xl text-ink font-semibold mb-2">Publications</h2>
          <p className="text-muted text-sm">peer-reviewed work &amp; preprints</p>
        </div>

        <div className="space-y-4 sm:space-y-6 mb-14">
          {publications.map((pub, i) => (
            <motion.div
              key={i}
              className="group relative bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 p-4 sm:p-6 hover:shadow-lg transition-all duration-300 overflow-hidden max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="pl-3 sm:pl-4">
                <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                    <span className="text-xs font-semibold text-mid-blue bg-blue-50 px-2.5 py-1 rounded-full shrink-0">{pub.year}</span>
                    <span className="text-[14px] sm:text-[16px] font-semibold text-ink">{pub.title}</span>
                  </div>
                  {pub.link && (
                    <a
                      href={pub.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted hover:text-mid-blue transition-colors shrink-0 mt-0.5"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
                <p className="text-[12px] sm:text-[13px] text-muted">{pub.authors} · <span className="italic">{pub.journal}</span></p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mb-8">
          <h2 className="font-serif text-3xl text-ink font-semibold mb-2">Conference Presentations</h2>
          <p className="text-muted text-sm">talks &amp; accepted abstracts</p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {presentations.map((p, i) => (
            <motion.div
              key={i}
              className="group relative bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 p-4 sm:p-6 hover:shadow-lg transition-all duration-300 overflow-hidden max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="pl-3 sm:pl-4">
                <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
                  <div>
                    <span className="text-[14px] sm:text-[16px] font-semibold text-ink">{p.title}</span>
                  </div>
                </div>
                <p className="text-[12px] sm:text-[13px] text-muted">{p.venues}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function ProjectsSection() {
  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="text-center mb-8">
          <h2 className="font-serif text-3xl text-ink font-semibold mb-2">Projects</h2>
          <p className="text-muted text-sm">research-driven work &amp; tools</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((proj, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              {/* Project Description */}
              <motion.div
                className="group relative bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 p-5 hover:shadow-lg transition-all duration-300 overflow-hidden mb-8"
                whileHover={{ scale: 1.02 }}
              >
                <div className="pl-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-[16px] font-semibold text-ink">{proj.title}</span>
                      <span className="ml-2 text-[11px] text-mid-blue bg-blue-50 px-2 py-0.5 rounded-full font-medium">{proj.tag}</span>
                    </div>
                    {proj.link && (
                      <a
                        href={proj.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted hover:text-mid-blue transition-colors shrink-0"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  <p className="text-[13px] text-muted leading-relaxed">{proj.description}</p>
                </div>
              </motion.div>

              {/* Project Image */}
              <motion.div
                className="w-full h-80 rounded-2xl overflow-hidden shadow-lg"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                {i === 0 ? (
                  <img 
                    src="/BCI Project Image.png" 
                    alt="BCI Prosthetic Hand Project" 
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <img 
                    src="/BioscriptAI Project Image.png" 
                    alt="BioscriptAI Project" 
                    className="w-full h-full object-cover object-top"
                  />
                )}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function ProfilePanel({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-ink/10 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* panel */}
      <motion.div
        className="relative w-full max-w-sm bg-white/95 backdrop-blur-md h-full overflow-y-auto shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
      >
        <div className="p-8">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-muted hover:text-ink transition-colors"
          >
            <X size={15} />
          </button>

          {/* Profile photo */}
          <div className="w-16 h-16 rounded-full overflow-hidden mb-5 shadow-lg">
            <img 
              src="/profile-photo.jpg" 
              alt="Justin Lin" 
              className="w-full h-full object-cover"
            />
          </div>

          <h2 className="font-serif text-2xl font-semibold text-ink mb-1">Justin Lin</h2>
          <p className="text-sm text-muted mb-6">building @ ucla</p>

          <div className="space-y-4 text-[14px] text-muted leading-relaxed mb-8">
            <p>
              Hi! I'm Justin, a neuroscience student at UCLA passionate about bioinformatics, space exploration, and scaling AI/ML tools for research.
            </p>
            <p>
              In my free time, I love playing tennis, speed solving Rubik's cubes, and trying out food from different cultures 😋
            </p>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">Get in touch</p>
            <div className="space-y-3">
              <a
                href="mailto:justinytlin4@gmail.com"
                className="flex items-center gap-2 text-sm text-ink hover:text-mid-blue transition-colors"
              >
                justinytlin4[at]gmail.com
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [profileOpen, setProfileOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setNavHidden(true);
      } else if (currentScrollY < lastScrollY) {
        setNavHidden(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const footerClassName =
    activeTab === "research" || activeTab === "projects"
      ? "relative mt-20 z-30"
      : `fixed bottom-0 left-0 right-0 z-30 ${
          activeTab === "about"
            ? "bg-transparent"
            : "bg-gradient-to-t from-white/80 via-white/60 to-transparent backdrop-blur-sm"
        }`;

  const tabs: { id: Tab; label: string }[] = [
    { id: "about", label: "about" },
    { id: "research", label: "research" },
    { id: "projects", label: "projects" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#dbeafe] via-[#eff6ff] to-[#e0f2fe] relative">
      {/* moon outline in top left corner - only on about tab */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-10 -translate-x-1/3 -translate-y-1/3"
        animate={{ opacity: activeTab === 'about' ? 1 : 0, scale: activeTab === 'about' ? 1 : 0.85 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src="/moon-outline.png"
          alt="Moon outline"
          className="w-64 h-64 rounded-full object-cover"
        />
      </motion.div>

      {/* sunsketch in top left corner - only on projects tab */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-10 -translate-x-1/3 -translate-y-1/3"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: activeTab === 'projects' ? 1 : 0, scale: activeTab === 'projects' ? 1 : 0.85 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src="/sunsketch.png"
          alt="Sun sketch"
          className="w-64 h-64 rounded-full object-cover"
        />
      </motion.div>

      {/* earthpencil in top left corner - only on research tab */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-10 -translate-x-1/3 -translate-y-1/3"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: activeTab === 'research' ? 1 : 0, scale: activeTab === 'research' ? 1 : 0.85 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src="/earthpencil.png"
          alt="Earth pencil"
          className="w-64 h-64 rounded-full object-cover"
        />
      </motion.div>

      {/* spray paint effect in top left */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] opacity-30">
          <div className="absolute inset-0 bg-blue-600 rounded-full blur-[80px] transform -rotate-45 scale-150" />
          <div className="absolute top-10 left-8 w-[200px] h-[200px] bg-blue-500 rounded-full blur-[60px] transform rotate-45 scale-120" />
          <div className="absolute top-20 left-20 w-[150px] h-[150px] bg-blue-700 rounded-full blur-[40px] transform -rotate-12 scale-100" />
          <div className="absolute top-32 left-4 w-[100px] h-[100px] bg-blue-800 rounded-full blur-[30px] transform rotate-30 scale-80" />
          <div className="absolute top-8 left-32 w-[80px] h-[80px] bg-blue-600 rounded-full blur-[25px] transform -rotate-60 scale-90" />
          <div className="absolute top-40 left-36 w-[60px] h-[60px] bg-blue-900 rounded-full blur-[20px] transform rotate-12 scale-70" />
        </div>
      </div>

      {/* spray paint effect in bottom right */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] opacity-30">
          <div className="absolute inset-0 bg-blue-600 rounded-full blur-[80px] transform -rotate-45 scale-150" />
          <div className="absolute bottom-10 right-8 w-[200px] h-[200px] bg-blue-500 rounded-full blur-[60px] transform rotate-45 scale-120" />
          <div className="absolute bottom-20 right-20 w-[150px] h-[150px] bg-blue-700 rounded-full blur-[40px] transform -rotate-12 scale-100" />
          <div className="absolute bottom-32 right-4 w-[100px] h-[100px] bg-blue-800 rounded-full blur-[30px] transform rotate-30 scale-80" />
          <div className="absolute bottom-8 right-32 w-[80px] h-[80px] bg-blue-600 rounded-full blur-[25px] transform -rotate-60 scale-90" />
          <div className="absolute bottom-40 right-36 w-[60px] h-[60px] bg-blue-900 rounded-full blur-[20px] transform rotate-12 scale-70" />
        </div>
      </div>
      
      {/* subtle radial glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-200/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-[100px]" />
      </div>

      {/* ── TOP NAV ── */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 sm:px-6 py-4"
        animate={{ 
          y: navHidden ? -100 : 0,
          opacity: navHidden ? 0 : 1
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* left: empty space */}
        <span className="hidden sm:block w-24" />
        <span className="sm:hidden w-6" />

        {/* center: tab switcher */}
        <div className="bg-white/75 backdrop-blur-md border border-white/90 rounded-full px-1 py-1 flex gap-0.5 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? "text-ink font-medium"
                  : "text-muted hover:text-ink"
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 bg-white rounded-full shadow-sm"
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                />
              )}
              <span className="relative">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* right: profile icon */}
        <div className="w-9 sm:w-24 flex justify-end">
          <button
            onClick={() => setProfileOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/75 backdrop-blur-md border border-white/90 text-muted hover:text-ink shadow-sm transition-colors"
          >
            <User size={15} />
          </button>
        </div>
      </motion.nav>

      {/* ── CONTENT ── */}
      <main className="relative z-10 pt-20 sm:pt-28 lg:pt-32 pb-20 sm:pb-32 px-0 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "about" && <AboutSection />}
            {activeTab === "research" && <ResearchSection />}
            {activeTab === "projects" && <ProjectsSection />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── FOOTER ── */}
      <footer className={footerClassName}>
        <div className="flex items-center justify-center gap-4 sm:gap-6 lg:gap-8 pb-8 pt-4 flex-wrap px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="cursor-pointer"
          >
            <img 
              src="/moon-corner.png" 
              alt="Moon" 
              className="w-9 h-9 object-contain"
              style={{ mixBlendMode: 'screen' }}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="cursor-pointer"
          >
            <img 
              src="/sun.png" 
              alt="Sun" 
              className="w-9 h-9 object-contain"
              style={{ mixBlendMode: 'screen' }}
            />
          </motion.div>
          <a
            href="https://www.linkedin.com/in/justinytlin"
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-white hover:shadow-sm transition-all duration-200"
          >
            <Linkedin size={16} />
          </a>
          <a
            href="https://www.instagram.com/justinytlin/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-white hover:shadow-sm transition-all duration-200"
          >
            <Instagram size={16} />
          </a>
          <a
            href="https://github.com/justinytlin"
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-white hover:shadow-sm transition-all duration-200"
          >
            <Github size={16} />
          </a>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="cursor-pointer"
          >
            <img 
              src="/earth.png" 
              alt="Earth" 
              className="w-9 h-9 object-contain"
              style={{ mixBlendMode: 'screen' }}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="cursor-pointer"
          >
            <img 
              src="/mars.png" 
              alt="Mars" 
              className="w-9 h-9 object-contain"
              style={{ mixBlendMode: 'screen' }}
            />
          </motion.div>
        </div>
      </footer>

      {/* ── PROFILE PANEL ── */}
      <AnimatePresence>
        {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
