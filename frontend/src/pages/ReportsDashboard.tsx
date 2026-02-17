import { useState } from 'react';
import { useLazyQuery, gql } from '@apollo/client';
import { FileText } from 'lucide-react';
import { ReportCard } from '../components/reports/ReportCard.js';
import { ReportViewer } from '../components/reports/ReportViewer.js';

// All report queries return JSON
const Q = {
  MRV:   gql`query ReportMrv($year: Int!)  { reportMrv(year: $year) }`,
  DCS:   gql`query ReportDcs($year: Int!)  { reportDcs(year: $year) }`,
  CII:   gql`query ReportCii($year: Int!)  { reportCiiCompliance(year: $year) }`,
  FUELEU:gql`query ReportFuelEu($year: Int!){ reportFuelEu(year: $year) }`,
  EEXI:  gql`query ReportEexi             { reportEexi }`,
  FLEET: gql`query ReportFleet($year: Int!){ reportFleetSummary(year: $year) }`,
};

const CURRENT_YEAR = new Date().getFullYear();

export function ReportsDashboard() {
  const [year, setYear] = useState(CURRENT_YEAR - 1);
  const [activeReport, setActiveReport] = useState<any>(null);

  // One lazy query hook per report type
  const [fetchMrv,    { loading: l1 }] = useLazyQuery(Q.MRV,    { onCompleted: (d) => setActiveReport(d.reportMrv) });
  const [fetchDcs,    { loading: l2 }] = useLazyQuery(Q.DCS,    { onCompleted: (d) => setActiveReport(d.reportDcs) });
  const [fetchCii,    { loading: l3 }] = useLazyQuery(Q.CII,    { onCompleted: (d) => setActiveReport(d.reportCiiCompliance) });
  const [fetchFuelEu, { loading: l4 }] = useLazyQuery(Q.FUELEU, { onCompleted: (d) => setActiveReport(d.reportFuelEu) });
  const [fetchEexi,   { loading: l5 }] = useLazyQuery(Q.EEXI,   { onCompleted: (d) => setActiveReport(d.reportEexi) });
  const [fetchFleet,  { loading: l6 }] = useLazyQuery(Q.FLEET,  { onCompleted: (d) => setActiveReport(d.reportFleetSummary) });

  const years = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].filter((y) => y >= 2024);

  const REPORTS = [
    {
      title: 'EU MRV Annual Emissions Report',
      subtitle: 'Per-vessel CO₂, fuel consumption, distance, transport work',
      regulation: 'Regulation (EU) 2015/757 as amended by (EU) 2023/1805',
      deadline: `${year + 1}-04-30`,
      tags: ['EU', 'MRV', 'CO₂', 'Annual'],
      onGenerate: () => fetchMrv({ variables: { year } }),
      loading: l1,
    },
    {
      title: 'IMO DCS Fuel Consumption Report',
      subtitle: 'Annual fuel oil data submitted to flag state / IMO GISIS',
      regulation: 'MARPOL Annex VI Regulation 22A',
      deadline: `${year + 1}-03-31`,
      tags: ['IMO', 'DCS', 'Fuel', 'Annual'],
      onGenerate: () => fetchDcs({ variables: { year } }),
      loading: l2,
    },
    {
      title: 'CII Statement of Compliance',
      subtitle: 'Annual rating certificate — attained CII vs required, rating A–E',
      regulation: 'IMO MEPC.337(76) + MEPC.354(78)',
      deadline: `${year + 1}-04-30`,
      tags: ['IMO', 'CII', 'Annual', 'Certificate'],
      onGenerate: () => fetchCii({ variables: { year } }),
      loading: l3,
    },
    {
      title: 'FuelEU Annual Compliance Report',
      subtitle: 'GHG intensity vs target, penalties, pooling — per vessel',
      regulation: 'Regulation (EU) 2023/1805 Article 8',
      deadline: `${year + 1}-01-31`,
      tags: ['EU', 'FuelEU', 'GHG', 'Annual'],
      onGenerate: () => fetchFuelEu({ variables: { year } }),
      loading: l4,
    },
    {
      title: 'EEXI Technical File Summary',
      subtitle: 'One-time certification — attained vs required EEXI, EPL details',
      regulation: 'IMO MEPC.333(76) Regulation 27 — mandatory from 1 Jan 2023',
      tags: ['IMO', 'EEXI', 'One-time'],
      onGenerate: () => fetchEexi(),
      loading: l5,
    },
    {
      title: 'Fleet Carbon Executive Summary',
      subtitle: 'All modules combined — CII + ETS + FuelEU + EEXI + Credits',
      regulation: 'Internal — for management / ESG reporting',
      tags: ['Internal', 'ESG', 'All Modules'],
      onGenerate: () => fetchFleet({ variables: { year } }),
      loading: l6,
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-400" />
            Regulatory Reports
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            EU MRV · IMO DCS · CII Certificate · FuelEU · EEXI · Fleet Summary
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500">Reporting Year</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Report catalog grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <ReportCard
            key={r.title}
            {...r}
            status="available"
          />
        ))}
      </div>

      {/* Compliance calendar */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="font-semibold text-white text-sm mb-4">Reporting Calendar — {year} data</h3>
        <div className="space-y-2">
          {[
            { date: `${year + 1}-01-31`, label: 'FuelEU Annual Compliance Report', tag: 'FuelEU', color: 'orange' },
            { date: `${year + 1}-03-31`, label: 'IMO DCS Fuel Consumption Report', tag: 'IMO DCS', color: 'blue' },
            { date: `${year + 1}-04-30`, label: 'EU MRV Annual Emissions Report', tag: 'EU MRV', color: 'blue' },
            { date: `${year + 1}-04-30`, label: 'CII Statement of Compliance', tag: 'CII', color: 'emerald' },
            { date: `${year + 1}-04-30`, label: 'EUA Surrender Deadline', tag: 'EU ETS', color: 'red' },
          ].map(({ date, label, tag, color }) => {
            const d = new Date(date);
            const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
            const past = daysLeft < 0;
            return (
              <div key={date + label} className="flex items-center gap-3 py-2 border-b border-gray-700/50 last:border-0">
                <div className="w-24 shrink-0 text-xs text-gray-400 font-mono">{date}</div>
                <div className="flex-1 text-sm text-gray-300">{label}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full bg-${color}-500/15 text-${color}-400 border border-${color}-500/20`}>
                  {tag}
                </span>
                <div className={`text-xs w-20 text-right shrink-0 font-mono ${
                  past ? 'text-gray-600'
                  : daysLeft <= 30 ? 'text-red-400'
                  : daysLeft <= 60 ? 'text-orange-400'
                  : 'text-gray-400'
                }`}>
                  {past ? 'Past' : `${daysLeft}d left`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Regulatory notes */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-400">Regulatory Basis</p>
        <ul className="space-y-0.5 mt-1">
          <li><span className="text-gray-300">EU MRV:</span> Regulation (EU) 2015/757, monitoring methods A–D, verification by accredited verifier</li>
          <li><span className="text-gray-300">IMO DCS:</span> MARPOL Annex VI Reg. 22A, data to flag state → GISIS Ship Fuel Oil Consumption Database</li>
          <li><span className="text-gray-300">CII:</span> IMO MEPC.337(76)/MEPC.354(78), annual survey endorsement on SEEMP Part III</li>
          <li><span className="text-gray-300">FuelEU:</span> Regulation (EU) 2023/1805, reporting to administering authority, verification required</li>
          <li><span className="text-gray-300">EEXI:</span> IMO MEPC.333(76), one-time Technical File, endorsed at first IAPP survey after 1 Jan 2023</li>
        </ul>
      </div>

      {/* Report Viewer modal */}
      {activeReport && (
        <ReportViewer
          report={activeReport}
          onClose={() => setActiveReport(null)}
        />
      )}
    </div>
  );
}
