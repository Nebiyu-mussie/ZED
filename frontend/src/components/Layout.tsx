import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Package, LogOut, User, Menu, X, Facebook, Twitter, Instagram } from 'lucide-react';
import { useEffect, useState } from 'react';

const CONTACT = {
  phone: '+251 911 000 000',
  email: 'support@zemenexpress.com',
  address: 'Bole Road, Addis Ababa, Ethiopia',
};

const SECTION_IDS = ['home', 'services', 'track', 'pricing', 'contact'];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const dashboardPath = (role?: string) => {
    if (!role) return '/login';
    if (role === 'super_admin') return '/super-admin-dashboard';
    if (role === 'admin' || role === 'manager') return '/admin-dashboard';
    if (role === 'dispatcher') return '/dispatcher-dashboard';
    if (role === 'driver') return '/driver-dashboard';
    return '/customer-dashboard';
  };

  const handleSectionNav = (sectionId: string) => {
    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`);
      setIsMenuOpen(false);
      return;
    }
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (location.pathname !== '/' || !location.hash) return;
    const sectionId = location.hash.replace('#', '');
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (location.pathname !== '/') return;
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          setActiveSection(visible.target.id);
        }
      },
      { threshold: [0.2, 0.5, 0.75], rootMargin: '-20% 0px -55% 0px' }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [location.pathname]);

  const navItemClass = (sectionId: string) =>
    `text-sm font-semibold transition-colors ${activeSection === sectionId ? 'text-[#F28C3A]' : 'text-slate-600 hover:text-[#F28C3A]'}`;

  return (
    <div className="min-h-screen bg-[#F7F7FB] flex flex-col">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-[#2A1B7A] p-2 rounded-xl">
              <Package className="h-6 w-6 text-[#F28C3A]" />
            </div>
            <span className="font-bold text-xl text-[#2A1B7A]">Zemen Express</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-5">
            <button
              type="button"
              onClick={() => handleSectionNav('home')}
              className={navItemClass('home')}
              aria-current={activeSection === 'home' ? 'page' : undefined}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleSectionNav('services')}
              className={navItemClass('services')}
              aria-current={activeSection === 'services' ? 'page' : undefined}
            >
              Services
            </button>
            <button
              type="button"
              onClick={() => handleSectionNav('track')}
              className={navItemClass('track')}
              aria-current={activeSection === 'track' ? 'page' : undefined}
            >
              Track
            </button>
            <button
              type="button"
              onClick={() => handleSectionNav('pricing')}
              className={navItemClass('pricing')}
              aria-current={activeSection === 'pricing' ? 'page' : undefined}
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => handleSectionNav('contact')}
              className={navItemClass('contact')}
              aria-current={activeSection === 'contact' ? 'page' : undefined}
            >
              Contact
            </button>
            {user ? (
              <>
                <Link to={dashboardPath(user.role)} className="text-sm font-semibold text-slate-600 hover:text-[#F28C3A] transition-colors">
                  Dashboard
                </Link>
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                  <User className="h-4 w-4" />
                  <span>{user.name} ({user.role})</span>
                </div>
                <button onClick={handleLogout} className="text-slate-500 hover:text-red-600 p-2">
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary px-4 py-2 text-sm">
                  Login
                </Link>
                <Link to="/register" className="btn-primary px-4 py-2 text-sm">
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-gray-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-4">
            <button
              type="button"
              className={`block text-left font-semibold w-full ${activeSection === 'home' ? 'text-[#F28C3A]' : 'text-slate-600'}`}
              onClick={() => handleSectionNav('home')}
            >
              Home
            </button>
            <button
              type="button"
              className={`block text-left font-semibold w-full ${activeSection === 'services' ? 'text-[#F28C3A]' : 'text-slate-600'}`}
              onClick={() => handleSectionNav('services')}
            >
              Services
            </button>
            <button
              type="button"
              className={`block text-left font-semibold w-full ${activeSection === 'track' ? 'text-[#F28C3A]' : 'text-slate-600'}`}
              onClick={() => handleSectionNav('track')}
            >
              Track
            </button>
            <button
              type="button"
              className={`block text-left font-semibold w-full ${activeSection === 'pricing' ? 'text-[#F28C3A]' : 'text-slate-600'}`}
              onClick={() => handleSectionNav('pricing')}
            >
              Pricing
            </button>
            <button
              type="button"
              className={`block text-left font-semibold w-full ${activeSection === 'contact' ? 'text-[#F28C3A]' : 'text-slate-600'}`}
              onClick={() => handleSectionNav('contact')}
            >
              Contact
            </button>
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                  <User className="h-4 w-4" />
                  <span>{user.name} ({user.role})</span>
                </div>
                <Link to={dashboardPath(user.role)} className="block text-slate-600 font-semibold" onClick={() => setIsMenuOpen(false)}>
                  Dashboard
                </Link>
                <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="flex items-center gap-2 text-red-600 font-medium w-full text-left">
                  <LogOut className="h-5 w-5" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block text-slate-600 font-semibold" onClick={() => setIsMenuOpen(false)}>Login</Link>
                <Link to="/register" className="block text-[#F28C3A] font-semibold" onClick={() => setIsMenuOpen(false)}>Register</Link>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 w-full mx-auto">
        {location.pathname === '/' ? (
          <Outlet />
        ) : (
          <div className="max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-12 mt-auto">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-[#2A1B7A] p-2 rounded-xl">
                <Package className="h-6 w-6 text-[#F28C3A]" />
              </div>
              <span className="font-bold text-xl text-[#2A1B7A]">Zemen Express</span>
            </Link>
            <p className="text-slate-500 text-sm">
              Premium last-mile logistics with real-time tracking, verified couriers, and reliable service across Addis Ababa.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-[#2A1B7A] mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/" className="hover:text-[#F28C3A] transition-colors">Home</Link></li>
              <li><button type="button" onClick={() => handleSectionNav('services')} className="hover:text-[#F28C3A] transition-colors">Services</button></li>
              <li><button type="button" onClick={() => handleSectionNav('pricing')} className="hover:text-[#F28C3A] transition-colors">Pricing</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-[#2A1B7A] mb-4">Contact Us</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>Email: {CONTACT.email}</li>
              <li>Phone: {CONTACT.phone}</li>
              <li>Address: {CONTACT.address}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-[#2A1B7A] mb-4">Follow Us</h4>
            <div className="flex gap-4">
              <a href="#" className="text-slate-400 hover:text-[#F28C3A] transition-colors">
                <span className="sr-only">Facebook</span>
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-[#F28C3A] transition-colors">
                <span className="sr-only">Twitter</span>
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-[#F28C3A] transition-colors">
                <span className="sr-only">Instagram</span>
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-100 text-center text-sm text-slate-400">
          &copy; {new Date().getFullYear()} Zemen Express Delivery System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
