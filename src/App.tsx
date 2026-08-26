import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Footer from '@/components/Footer';
import NavBar from '@/components/NavBar';
import GeometricBackdrop from '@/components/GeometricBackdrop';
import { catchAllRoute, routes } from '@/routes/config';

export default function App() {
  return (
    <Router>
      <div className="antialiased min-h-screen flex flex-col relative z-0">
        {/* Random geometric backdrop — fixed full-viewport, behind EVERY PAGE */}
        <GeometricBackdrop />
        {/* Content layer (nav / pages / footer) sits above the deco */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <NavBar />
          <Routes>
            {routes.map((r) => (
              <Route key={r.path} path={r.path} element={<r.element />} />
            ))}
            <Route path={catchAllRoute.path} element={<catchAllRoute.element />} />
          </Routes>
          <Footer />
        </div>
      </div>
    </Router>
  );
}
