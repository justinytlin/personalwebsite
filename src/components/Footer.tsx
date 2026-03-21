const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-sm font-medium text-ink">Justin Lin</p>
          <p className="text-xs text-muted mt-0.5">Neuroscience · UCLA</p>
        </div>
        <div className="flex items-center gap-6">
          {[
            { name: "Research", href: "#research" },
            { name: "Publications", href: "#publications" },
            { name: "Contact", href: "#contact" },
          ].map((l) => (
            <a key={l.name} href={l.href} className="text-xs text-muted hover:text-ink transition-colors">
              {l.name}
            </a>
          ))}
        </div>
        <p className="text-xs text-muted">© {currentYear} Justin Lin</p>
      </div>
    </footer>
  );
};

export default Footer;
