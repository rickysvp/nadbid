import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { Footer } from './Footer';
import { GeometricBackground } from './GeometricBackground';
import Toaster from './Toaster';

/**
 * 应用布局 — NADBID Dark Premium
 * GeometricBackground + Navbar + main + Footer + Toaster
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen font-sans selection:bg-[#8b5cf6]/30 selection:text-white bg-transparent relative">
      <GeometricBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main>
          <Outlet />
        </main>
        <Footer />
        <Toaster />
      </div>
    </div>
  );
}
