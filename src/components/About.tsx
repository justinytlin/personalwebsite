"use client";

import { motion } from "framer-motion";

const About = () => {
  return (
    <motion.div
      className="max-w-2xl"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-4 text-[15px] text-muted leading-relaxed">
        <p>
          I&apos;m a neuroscience student at UCLA (4.0 GPA) conducting research across neurobiology,
          bioinformatics, and biomedical science. My work focuses on understanding brain function
          and disease through experimental and computational approaches.
        </p>
        <p>
          I&apos;ve worked with <span className="text-ink font-medium">UCLA DGSOM</span>,{" "}
          <span className="text-ink font-medium">NASA GeneLab</span>,{" "}
          <span className="text-ink font-medium">Huntington Medical Research Institutes</span>, and{" "}
          <span className="text-ink font-medium">Children&apos;s Hospital Los Angeles</span> — contributing
          to investigations in brain development, Alzheimer&apos;s disease, synaptic transmission,
          craniofacial regeneration, and clinical biomarkers.
        </p>
        <p>
          I&apos;m interested in using both wet lab and computational methods to tackle questions at the
          intersection of neuroscience, genomics, and human disease.
        </p>
      </div>
    </motion.div>
  );
};

export default About;
