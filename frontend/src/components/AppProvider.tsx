import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

interface Props {
  children: ReactNode;
}

const NavLink = ({ to, children }: { to: string; children: ReactNode }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md text-sm font-medium ${
        isActive
          ? "bg-sky-500 text-white"
          : "text-slate-700 hover:bg-sky-100 hover:text-sky-600"
      }`}
    >
      {children}
    </Link>
  );
};

/**
 * A provider wrapping the whole app.
 *
 * You can add multiple providers here by nesting them,
 * and they will all be applied to the app.
 *
 * Note: ThemeProvider is already included in AppWrapper.tsx and does not need to be added here.
 */
export const AppProvider = ({ children }: Props) => {
  return (
    <>
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-white shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="text-xl font-bold text-sky-600">
                DataFlow
              </Link>
              <div className="flex space-x-2">
                <NavLink to="/">PDF Upload</NavLink>
                <NavLink to="/email-page">E-post</NavLink>
                <NavLink to="/manage-templates-page">Maler</NavLink>
                <NavLink to="/email-templates-page">E-post maler</NavLink>
                <NavLink to="/reports-page">Rapporter</NavLink>
              </div>
            </div>
          </div>
        </nav>
        <main className="container mx-auto p-4">{children}</main>
      </div>
      <Toaster richColors position="top-right" />
    </>
  );
};