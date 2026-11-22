import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Workouts from './pages/Workouts';
import Nutrition from './pages/Nutrition';
import Settings from './pages/Settings';

const links = [
  { to: '/', label: 'Özet', icon: '🏠', end: true },
  { to: '/antrenman', label: 'Antrenman', icon: '🏋️' },
  { to: '/beslenme', label: 'Beslenme & Kilo', icon: '🥗' },
  { to: '/ayarlar', label: 'Ayarlar', icon: '⚙️' },
];

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">💪</span>
          <span>FitTakip</span>
        </div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <span className="nav-icon">{l.icon}</span>
              <span className="nav-label">{l.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/antrenman/*" element={<Workouts />} />
          <Route path="/beslenme/*" element={<Nutrition />} />
          <Route path="/ayarlar" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
