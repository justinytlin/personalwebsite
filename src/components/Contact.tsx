"use client";

import { motion } from "framer-motion";
import { Mail, Linkedin, ExternalLink } from "lucide-react";

const links = [
  {
    icon: Mail,
    label: "Email",
    value: "justin.lin@ucla.edu",
    href: "mailto:justin.lin@ucla.edu",
  },
  {
    icon: Linkedin,
    label: "LinkedIn",
    value: "linkedin.com/in/justinlin-research",
    href: "https://linkedin.com/in/justinlin-research",
  },
  {
    icon: ExternalLink,
    label: "ORCID",
    value: "orcid.org/0009-0005-3291-4377",
    href: "https://orcid.org/0009-0005-3291-4377",
  },
];

const Contact = () => {
  return (
    <motion.div
      className="max-w-lg"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <p className="text-[15px] text-muted leading-relaxed mb-8">
        I&apos;m open to research collaborations, academic discussions, and general
        inquiries. Feel free to reach out.
      </p>
      <div className="space-y-4">
        {links.map((link, i) => (
          <motion.a
            key={link.label}
            href={link.href}
            target={link.href.startsWith("mailto") ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="flex items-center gap-4 group"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.07 }}
          >
            <div className="w-8 h-8 rounded-lg bg-ice-blue flex items-center justify-center shrink-0 group-hover:bg-pale-blue transition-colors">
              <link.icon size={15} className="text-mid-blue" />
            </div>
            <div>
              <p className="text-[13px] text-muted">{link.label}</p>
              <p className="text-[14px] font-medium text-ink group-hover:text-mid-blue transition-colors">
                {link.value}
              </p>
            </div>
          </motion.a>
        ))}
      </div>
    </motion.div>
  );
};

export default Contact;
