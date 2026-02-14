import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendario GHorarien",
  description: "Calendario mensual con Supabase"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
          {children}
        </div>
      </body>
    </html>
  );
}
