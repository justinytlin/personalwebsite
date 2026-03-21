"use client";

import { motion } from "framer-motion";
import { ExternalLink, BookOpen } from "lucide-react";

interface PublicationCardProps {
  title: string;
  journal: string;
  year: string;
  link?: string;
  index: number;
}

const PublicationCard = ({
  title,
  journal,
  year,
  link,
  index,
}: PublicationCardProps) => {
  return (
    <motion.div
      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ y: -5 }}
    >
      <div className="p-6 flex flex-col flex-grow">
        {/* Index number + icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-deep-blue to-royal-blue flex items-center justify-center shrink-0">
            <BookOpen size={14} className="text-white" />
          </div>
          <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase">
            Publication {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-deep-blue leading-snug mb-4 flex-grow">
          {title}
        </h3>

        {/* Footer: journal badge + year + link */}
        <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-royal-blue bg-blue-50 px-2.5 py-1 rounded-full">
              {journal}
            </span>
            <span className="text-xs text-gray-400 font-medium">{year}</span>
          </div>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-royal-blue hover:text-cyan transition-colors duration-200 text-sm font-medium group-hover:underline"
            >
              View Publication
              <ExternalLink size={13} className="ml-1.5" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PublicationCard;
