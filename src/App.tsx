import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Footer from '@/components/Footer';
import NavBar from '@/components/NavBar';
import { catchAllRoute, routes } from '@/routes/config';

export default function App() {
  return (
    <Router>
      <div className="antialiased min-h-screen flex flex-col grid-bg">
        <NavBar />
        <Routes>
          {routes.map((r) => (
            <Route key={r.path} path={r.path} element={<r.element />} />
          ))}
          <Route path={catchAllRoute.path} element={<catchAllRoute.element />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}
