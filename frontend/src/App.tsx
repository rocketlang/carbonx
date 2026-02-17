import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import {
  Ship, Leaf, Euro, Fuel, ShieldCheck, Award, BarChart3, FileText,
  Settings as SettingsIcon, ChevronRight, LogOut
} from 'lucide-react';
import { Dashboard } from './pages/Dashboard.js';
import { CiiDashboard } from './pages/CiiDashboard.js';
import { VesselCiiDetail } from './pages/VesselCiiDetail.js';
import { EtsDashboard } from './pages/EtsDashboard.js';
import { FuelEuDashboard } from './pages/FuelEuDashboard.js';
import { EexiDashboard } from './pages/EexiDashboard.js';
import { CarbonCreditsDashboard } from './pages/CarbonCreditsDashboard.js';
import { ReportsDashboard } from './pages/ReportsDashboard.js';
import { Settings } from './pages/Settings.js';
import { LoginPage } from './pages/LoginPage.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { useAuth } from './lib/auth.js';

const NAV = [
  { to: '/dashboard',  icon: BarChart3,      label: 'Overview'   },
  { to: '/cii',        icon: Leaf,           label: 'CII'        },
  { to: '/ets',        icon: Euro,           label: 'EU ETS'     },
  { to: '/fueleu',     icon: Fuel,           label: 'FuelEU'     },
  { to: '/eexi',       icon: ShieldCheck,    label: 'EEXI'       },
  { to: '/credits',    icon: Award,          label: 'Credits'    },
  { to: '/reports',    icon: FileText,       label: 'Reports'    },
  { to: '/settings',   icon: SettingsIcon,   label: 'Settings'   },
];

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Leaf className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">CarbonX</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 ml-9">Maritime Carbon Suite</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gray-700 flex items-center justify-center">
              <Ship className="h-3.5 w-3.5 text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-200 truncate">{user?.name ?? 'ANKR Labs'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role ?? 'operator'}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-700 transition-colors shrink-0"
            >
              <LogOut className="h-3 w-3 text-gray-600 hover:text-gray-400" />
            </button>
            <ChevronRight className="h-3 w-3 text-gray-600 shrink-0" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/cii" element={<CiiDashboard />} />
                  <Route path="/cii/:vesselId" element={<VesselCiiDetail />} />
                  <Route path="/ets" element={<EtsDashboard />} />
                  <Route path="/fueleu" element={<FuelEuDashboard />} />
                  <Route path="/eexi" element={<EexiDashboard />} />
                  <Route path="/credits" element={<CarbonCreditsDashboard />} />
                  <Route path="/reports" element={<ReportsDashboard />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
