import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { Footer } from './Footer';
import { GeometricBackground } from './GeometricBackground';
import Toaster from './Toaster';

/**
 * 应用布局 — 严格匹配原 DEMO 结构
 * GeometricBackground + Navbar(absolute) + main + Footer + Toaster
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen font-sans selection:bg-brand-green selection:text-black bg-transparent relative">
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
