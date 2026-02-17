import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import {
  Ship, Leaf, Euro, Fuel, ShieldCheck, Award, BarChart3, FileText,
  Settings, ChevronRight
} from 'lucide-react';
import { Dashboard } from './pages/Dashboard.js';
import { CiiDashboard } from './pages/CiiDashboard.js';
import { VesselCiiDetail } from './pages/VesselCiiDetail.js';

const NAV = [
  { to: '/dashboard',  icon: BarChart3,   label: 'Overview'   },
  { to: '/cii',        icon: Leaf,        label: 'CII'        },
  { to: '/ets',        icon: Euro,        label: 'EU ETS'     },
  { to: '/fueleu',     icon: Fuel,        label: 'FuelEU'     },
  { to: '/eexi',       icon: ShieldCheck, label: 'EEXI'       },
  { to: '/credits',    icon: Award,       label: 'Credits'    },
  { to: '/reports',    icon: FileText,    label: 'Reports'    },
  { to: '/settings',   icon: Settings,    label: 'Settings'   },
];

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="p-8 text-center text-gray-500 mt-24">
      <div className="text-4xl mb-4">🔨</div>
      <p className="text-lg font-medium text-gray-300">{title}</p>
      <p className="text-sm mt-1">Coming in the next phase</p>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
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
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">ANKR Labs</p>
              <p className="text-xs text-gray-500">Starter plan</p>
            </div>
            <ChevronRight className="h-3 w-3 text-gray-600 ml-auto shrink-0" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cii" element={<CiiDashboard />} />
          <Route path="/cii/:vesselId" element={<VesselCiiDetail />} />
          <Route path="/ets" element={<ComingSoon title="EU ETS — Phase 3" />} />
          <Route path="/fueleu" element={<ComingSoon title="FuelEU Maritime — Phase 4" />} />
          <Route path="/eexi" element={<ComingSoon title="EEXI Manager — Phase 5" />} />
          <Route path="/credits" element={<ComingSoon title="Carbon Credits — Phase 6" />} />
          <Route path="/reports" element={<ComingSoon title="Regulatory Reports — Phase 7" />} />
          <Route path="/settings" element={<ComingSoon title="Settings" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
