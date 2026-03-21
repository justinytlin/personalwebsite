"use client";

import { motion } from "framer-motion";
import { ExternalLink, Microscope } from "lucide-react";

interface ProjectCardProps {
  title: string;
  description: string;
  tag?: string;
  link?: string;
  index: number;
}

const ProjectCard = ({
  title,
  description,
  tag,
  link,
  index,
}: ProjectCardProps) => {
  return (
    <motion.div
      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -6 }}
    >
      {/* Top accent */}
      <div className="h-1 bg-gradient-to-r from-cyan via-soft-blue to-royal-blue" />

      <div className="p-6 flex flex-col flex-grow">
        {/* Icon + tag */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-cyan/10 flex items-center justify-center shrink-0 group-hover:bg-cyan/20 transition-colors duration-300">
            <Microscope size={18} className="text-cyan" />
          </div>
          {tag && (
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              {tag}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-deep-blue mb-3 leading-snug">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed flex-grow mb-4">
          {description}
        </p>

        {/* Link */}
        {link && link !== "#" && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-royal-blue hover:text-cyan transition-colors duration-200 text-sm font-semibold"
          >
            Learn More
            <ExternalLink size={14} className="ml-1.5" />
          </a>
        )}
      </div>
    </motion.div>
  );
};

export default ProjectCard;
