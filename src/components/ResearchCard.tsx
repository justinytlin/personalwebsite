"use client";

import { motion } from "framer-motion";
import { FlaskConical } from "lucide-react";

interface ResearchCardProps {
  institution: string;
  role: string;
  dates: string;
  description: string;
  index: number;
  tag?: string;
}

const ResearchCard = ({
  institution,
  role,
  dates,
  description,
  index,
  tag,
}: ResearchCardProps) => {
  return (
    <motion.div
      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ y: -6 }}
    >
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-deep-blue via-royal-blue to-soft-blue" />

      <div className="p-6 flex flex-col flex-grow">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-0.5 w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors duration-300">
            <FlaskConical size={18} className="text-royal-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-deep-blue leading-tight mb-1">
              {institution}
            </h3>
            {tag && (
              <span className="inline-block text-xs font-medium text-cyan bg-cyan/10 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            )}
          </div>
        </div>

        {/* Role & dates */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-1">
          <p className="text-sm font-semibold text-royal-blue">{role}</p>
          <p className="text-xs text-gray-400 font-medium tracking-wide">{dates}</p>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gray-100 mb-3" />

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed flex-grow">
          {description}
        </p>
      </div>
    </motion.div>
  );
};

export default ResearchCard;
