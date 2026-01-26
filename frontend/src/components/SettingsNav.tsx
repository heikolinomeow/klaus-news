import { Link, useLocation } from 'react-router-dom';

export default function SettingsNav() {
  const location = useLocation();

  return (
    <nav className="settings-nav">
      <Link
        to="/settings/system"
        className={location.pathname === '/settings/system' ? 'active' : ''}
      >
        System
      </Link>
      <Link
        to="/architecture"
        className={location.pathname === '/architecture' ? 'active' : ''}
      >
        Architecture
      </Link>
    </nav>
  );
}
