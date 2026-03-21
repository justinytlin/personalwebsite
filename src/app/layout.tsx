import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Justin Lin | Neuroscience Researcher",
  description: "UCLA neuroscience student conducting research in neurobiology, bioinformatics, and biomedical science. Explore my research experience, publications, and scientific projects.",
  keywords: ["neuroscience", "research", "UCLA", "bioinformatics", "biomedical science", "Justin Lin"],
  authors: [{ name: "Justin Lin" }],
  openGraph: {
    title: "Justin Lin | Neuroscience Researcher",
    description: "UCLA neuroscience student conducting research in neurobiology, bioinformatics, and biomedical science.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${lora.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
