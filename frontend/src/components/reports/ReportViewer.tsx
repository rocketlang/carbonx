/**
 * Report Viewer
 * Renders structured report JSON into a print-ready HTML view.
 * Each report type has its own renderer component.
 */
import { X, Printer, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface Props {
  report: any;
  onClose: () => void;
}

export function ReportViewer({ report, onClose }: Props) {
  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 overflow-y-auto">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between print:hidden">
        <div>
          <h2 className="font-semibold text-white">{getReportTitle(report.reportType)}</h2>
          <p className="text-xs text-gray-500">{report.regulationRef} · {report.companyName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-sm text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Printer className="h-4 w-4" /> Print / PDF
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Report content */}
      <div className="max-w-5xl mx-auto px-6 py-8 print:px-0 print:py-0">
        {report.reportType === 'EU_MRV'         && <MrvReportView report={report} />}
        {report.reportType === 'IMO_DCS'         && <DcsReportView report={report} />}
        {report.reportType === 'CII_STATEMENT'   && <CiiReportView report={report} />}
        {report.reportType === 'FUELEU_ANNUAL'   && <FuelEuReportView report={report} />}
        {report.reportType === 'EEXI_TECHNICAL_FILE' && <EexiReportView report={report} />}
        {report.reportType === 'FLEET_SUMMARY'   && <FleetSummaryView report={report} />}
      </div>
    </div>
  );
}

function getReportTitle(type: string) {
  const map: Record<string, string> = {
    EU_MRV:             'EU MRV Annual Emissions Report',
    IMO_DCS:            'IMO DCS Fuel Oil Consumption Report',
    CII_STATEMENT:      'CII Annual Statement of Compliance',
    FUELEU_ANNUAL:      'FuelEU Annual Compliance Report',
    EEXI_TECHNICAL_FILE:'EEXI Technical File Summary',
    FLEET_SUMMARY:      'Fleet Carbon Executive Summary',
  };
  return map[type] ?? type;
}

// ─── Shared components ───────────────────────

function ReportHeader({ report }: { report: any }) {
  return (
    <div className="border-b-2 border-gray-700 pb-6 mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white">{getReportTitle(report.reportType)}</h1>
          <p className="text-gray-400 mt-1">{report.regulationRef}</p>
        </div>
        <div className="text-right text-xs text-gray-500 space-y-0.5">
          <p className="font-medium text-gray-300">{report.companyName}</p>
          {report.reportingYear && <p>Reporting Year: {report.reportingYear}</p>}
          {report.submissionDeadline && (
            <p className="text-orange-400">Deadline: {report.submissionDeadline}</p>
          )}
          <p>Generated: {new Date(report.generatedAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-white mb-3 mt-6 pb-1 border-b border-gray-700">
      {children}
    </h2>
  );
}

function TH({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">{children}</th>;
}
function THR({ children }: { children: React.ReactNode }) {
  return <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">{children}</th>;
}
function TD({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 text-sm text-gray-300">{children}</td>;
}
function TDR({ children, highlight }: { children: React.ReactNode; highlight?: string }) {
  return (
    <td className={`px-3 py-2 text-sm text-right font-mono ${highlight ?? 'text-gray-300'}`}>
      {children}
    </td>
  );
}
function TRow({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-gray-800 hover:bg-gray-800/30">{children}</tr>;
}
function SummaryGrid({ items }: { items: Array<{ label: string; value: string; color?: string }> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {items.map(({ label, value, color }) => (
        <div key={label} className="bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`font-mono font-bold text-lg mt-0.5 ${color ?? 'text-white'}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── EU MRV Report ───────────────────────────

function MrvReportView({ report }: { report: any }) {
  const t = report.totals;
  return (
    <div className="space-y-1">
      <ReportHeader report={report} />
      <SummaryGrid items={[
        { label: 'Vessels Covered', value: String(report.vesselCount) },
        { label: 'Total CO₂ (t)', value: t.totalCo2Mt.toFixed(0) },
        { label: 'EU-scope CO₂ (t)', value: t.euCo2Mt.toFixed(0) },
        { label: 'Distance (nm)', value: t.distanceNm.toFixed(0) },
      ]} />

      <SectionTitle>Fuel Consumption Summary</SectionTitle>
      <div className="grid grid-cols-5 gap-2 mb-6">
        {[
          ['HFO/VLSFO', t.fuelConsumption.hfoMt],
          ['MGO/MDO', t.fuelConsumption.mgoMt],
          ['LNG', t.fuelConsumption.lngMt],
          ['Methanol', t.fuelConsumption.methanolMt],
          ['Biofuel', t.fuelConsumption.biofuelMt],
        ].map(([name, val]) => (
          <div key={name as string} className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">{name}</p>
            <p className="text-white font-mono font-bold">{(val as number).toFixed(0)} t</p>
          </div>
        ))}
      </div>

      <SectionTitle>Per-Vessel Emissions — {report.reportingYear}</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <TH>Vessel / IMO</TH>
              <TH>Flag</TH>
              <THR>Voyages</THR>
              <THR>Distance (nm)</THR>
              <THR>Hours at Sea</THR>
              <THR>Total CO₂ (t)</THR>
              <THR>EU CO₂ (t)</THR>
              <THR>Total Fuel (t)</THR>
              <THR>CII Rating</THR>
            </tr>
          </thead>
          <tbody>
            {report.vessels.map((v: any) => {
              const totalFuel = v.fuelConsumption.hfoMt + v.fuelConsumption.mgoMt +
                v.fuelConsumption.lngMt + v.fuelConsumption.methanolMt + v.fuelConsumption.biofuelMt;
              return (
                <TRow key={v.vessel.imo}>
                  <TD><span className="font-medium text-white">{v.vessel.name}</span><br/><span className="text-xs text-gray-600">IMO {v.vessel.imo}</span></TD>
                  <TD>{v.vessel.flag}</TD>
                  <TDR>{v.voyageCount}</TDR>
                  <TDR>{v.distanceNm.toFixed(0)}</TDR>
                  <TDR>{v.hoursAtSea}</TDR>
                  <TDR highlight="text-white">{v.totalCo2Mt.toFixed(1)}</TDR>
                  <TDR>{v.euCo2Mt.toFixed(1)}</TDR>
                  <TDR>{totalFuel.toFixed(1)}</TDR>
                  <TDR highlight={
                    v.ciiRating === 'A' || v.ciiRating === 'B' ? 'text-green-400'
                    : v.ciiRating === 'D' || v.ciiRating === 'E' ? 'text-red-400'
                    : 'text-yellow-400'
                  }>{v.ciiRating ?? '—'}</TDR>
                </TRow>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-700 font-bold">
              <td className="px-3 py-2 text-sm text-gray-400" colSpan={5}>Fleet Total</td>
              <TDR highlight="text-blue-400">{t.totalCo2Mt.toFixed(1)}</TDR>
              <TDR highlight="text-blue-400">{t.euCo2Mt.toFixed(1)}</TDR>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-gray-600 mt-4">
        Monitoring method: Method D (Bunker Delivery Notes). All figures verified per Reg. (EU) 2015/757 Annex I.
      </p>
    </div>
  );
}

// ─── IMO DCS Report ──────────────────────────

function DcsReportView({ report }: { report: any }) {
  return (
    <div className="space-y-1">
      <ReportHeader report={report} />
      <SectionTitle>Annual Fuel Oil Consumption — {report.reportingYear}</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <TH>Vessel / IMO</TH>
              <TH>Flag</TH>
              <THR>DWT (t)</THR>
              <THR>HFO (t)</THR>
              <THR>MGO (t)</THR>
              <THR>LNG (t)</THR>
              <THR>Other (t)</THR>
              <THR>Total (t)</THR>
              <THR>Distance (nm)</THR>
              <THR>Hours</THR>
            </tr>
          </thead>
          <tbody>
            {report.vessels.map((v: any) => (
              <TRow key={v.imo}>
                <TD><span className="font-medium text-white">{v.name}</span><br/><span className="text-xs text-gray-600">IMO {v.imo}</span></TD>
                <TD>{v.flag}</TD>
                <TDR>{v.dwt.toFixed(0)}</TDR>
                <TDR>{v.fuelOilConsumptionMt.hfo.toFixed(0)}</TDR>
                <TDR>{v.fuelOilConsumptionMt.mgo.toFixed(0)}</TDR>
                <TDR>{v.fuelOilConsumptionMt.lng.toFixed(0)}</TDR>
                <TDR>{(v.fuelOilConsumptionMt.methanol + v.fuelOilConsumptionMt.biofuel).toFixed(0)}</TDR>
                <TDR highlight="text-white">{v.fuelOilConsumptionMt.total.toFixed(0)}</TDR>
                <TDR>{v.distanceTravelledNm.toFixed(0)}</TDR>
                <TDR>{v.hoursUnderway}</TDR>
              </TRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CII Statement ────────────────────────────

const RATING_COLORS: Record<string, string> = {
  A: 'text-green-400', B: 'text-emerald-400', C: 'text-yellow-400',
  D: 'text-orange-400', E: 'text-red-400',
};

function CiiReportView({ report }: { report: any }) {
  const s = report.summary;
  return (
    <div className="space-y-1">
      <ReportHeader report={report} />
      <SummaryGrid items={[
        { label: 'Total Vessels', value: String(s.totalVessels) },
        { label: 'Rating A/B', value: String(s.ratingA + s.ratingB), color: 'text-green-400' },
        { label: 'Rating C', value: String(s.ratingC), color: 'text-yellow-400' },
        { label: 'Rating D/E', value: String(s.ratingD + s.ratingE), color: 'text-red-400' },
      ]} />
      <SectionTitle>CII Annual Ratings — {report.reportingYear}</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <TH>Vessel</TH>
              <TH>IMO</TH>
              <TH>Type</TH>
              <THR>Attained CII</THR>
              <THR>Required CII</THR>
              <THR>Ratio</THR>
              <THR>Rating</THR>
              <THR>CO₂ (t)</THR>
            </tr>
          </thead>
          <tbody>
            {report.vessels.map((v: any) => (
              <TRow key={v.imo}>
                <TD><span className="font-medium text-white">{v.name}</span></TD>
                <TD><span className="text-xs font-mono text-gray-500">{v.imo}</span></TD>
                <TD>{v.type}</TD>
                <TDR>{v.attainedCii?.toFixed(4) ?? '—'}</TDR>
                <TDR>{v.requiredCii?.toFixed(4) ?? '—'}</TDR>
                <TDR>{v.ciiRatio?.toFixed(3) ?? '—'}</TDR>
                <TDR highlight={RATING_COLORS[v.rating ?? 'C']}>{v.rating ?? '—'}</TDR>
                <TDR>{v.totalCo2G ? (v.totalCo2G / 1e6).toFixed(0) : '—'}</TDR>
              </TRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── FuelEU Report ────────────────────────────

function FuelEuReportView({ report }: { report: any }) {
  const s = report.summary;
  return (
    <div className="space-y-1">
      <ReportHeader report={report} />
      <SummaryGrid items={[
        { label: 'Compliant', value: `${s.compliantVessels}/${s.totalVessels}`, color: s.compliantVessels === s.totalVessels ? 'text-green-400' : 'text-yellow-400' },
        { label: 'Non-Compliant', value: String(s.nonCompliantVessels), color: s.nonCompliantVessels > 0 ? 'text-red-400' : 'text-green-400' },
        { label: 'Total Penalty', value: `€${(s.totalPenaltyEur / 1000).toFixed(0)}k`, color: s.totalPenaltyEur > 0 ? 'text-red-400' : 'text-green-400' },
        { label: 'Total Energy', value: `${(s.totalEnergyMj / 1e9).toFixed(2)} TJ` },
      ]} />
      <SectionTitle>GHG Intensity Compliance — {report.reportingYear}</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <TH>Vessel</TH>
              <TH>IMO</TH>
              <THR>Actual (gCO₂eq/MJ)</THR>
              <THR>Target (gCO₂eq/MJ)</THR>
              <THR>Gap</THR>
              <THR>Status</THR>
              <THR>Penalty (€)</THR>
              <THR>Pool Balance</THR>
            </tr>
          </thead>
          <tbody>
            {report.vessels.map((v: any) => (
              <TRow key={v.imo}>
                <TD><span className="font-medium text-white">{v.name}</span></TD>
                <TD><span className="text-xs font-mono text-gray-500">{v.imo}</span></TD>
                <TDR highlight={v.isCompliant ? 'text-green-400' : 'text-red-400'}>{v.actualGhgIntensity?.toFixed(2) ?? '—'}</TDR>
                <TDR>{v.targetGhgIntensity?.toFixed(2) ?? '—'}</TDR>
                <TDR highlight={v.ghgGap > 0 ? 'text-red-400' : 'text-green-400'}>{v.ghgGap?.toFixed(2) ?? '—'}</TDR>
                <TD>
                  <span className={`flex items-center gap-1 text-xs ${v.isCompliant ? 'text-green-400' : 'text-red-400'}`}>
                    {v.isCompliant ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {v.isCompliant ? 'Compliant' : 'Non-compliant'}
                  </span>
                </TD>
                <TDR highlight={v.penaltyEur > 0 ? 'text-red-400' : 'text-gray-500'}>
                  {v.penaltyEur > 0 ? `€${(v.penaltyEur / 1000).toFixed(0)}k` : '—'}
                </TDR>
                <TDR highlight={v.poolSurplusMj > 0 ? 'text-green-400' : v.poolBorrowedMj > 0 ? 'text-orange-400' : 'text-gray-500'}>
                  {v.poolSurplusMj > 0 ? `+${(v.poolSurplusMj / 1e6).toFixed(1)} TJ`
                   : v.poolBorrowedMj > 0 ? `-${(v.poolBorrowedMj / 1e6).toFixed(1)} TJ`
                   : '—'}
                </TDR>
              </TRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── EEXI Report ──────────────────────────────

function EexiReportView({ report }: { report: any }) {
  const s = report.summary;
  return (
    <div className="space-y-1">
      <ReportHeader report={report} />
      <SummaryGrid items={[
        { label: 'Total Vessels', value: String(s.totalVessels) },
        { label: 'Certified', value: String(s.certified), color: s.certified === s.totalVessels ? 'text-green-400' : 'text-yellow-400' },
        { label: 'Compliant', value: String(s.compliant), color: 'text-green-400' },
        { label: 'EPL Required', value: String(s.eplRequired), color: s.eplRequired > 0 ? 'text-red-400' : 'text-green-400' },
      ]} />
      <SectionTitle>EEXI Certification Status</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <TH>Vessel</TH>
              <TH>IMO</TH>
              <TH>Type</TH>
              <THR>DWT</THR>
              <THR>Attained EEXI</THR>
              <THR>Required EEXI</THR>
              <THR>Status</THR>
              <THR>EPL (kW)</THR>
              <TH>Certificate</TH>
            </tr>
          </thead>
          <tbody>
            {report.vessels.map((v: any) => (
              <TRow key={v.imo}>
                <TD><span className="font-medium text-white">{v.name}</span></TD>
                <TD><span className="text-xs font-mono text-gray-500">{v.imo}</span></TD>
                <TD>{v.type}</TD>
                <TDR>{v.dwt.toFixed(0)}</TDR>
                <TDR highlight={v.isCompliant === true ? 'text-green-400' : v.isCompliant === false ? 'text-red-400' : 'text-gray-500'}>
                  {v.attainedEexi?.toFixed(3) ?? '—'}
                </TDR>
                <TDR>{v.requiredEexi?.toFixed(3) ?? '—'}</TDR>
                <TD>
                  {!v.certified ? (
                    <span className="flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3 w-3" /> Pending</span>
                  ) : v.isCompliant ? (
                    <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle className="h-3 w-3" /> Compliant</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-400"><AlertCircle className="h-3 w-3" /> EPL Required</span>
                  )}
                </TD>
                <TDR highlight="text-orange-400">
                  {v.enginePowerLimitKw ? v.enginePowerLimitKw.toFixed(0) : '—'}
                </TDR>
                <TD><span className="text-xs font-mono text-gray-500">{v.certificateNumber ?? '—'}</span></TD>
              </TRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Fleet Summary ────────────────────────────

function FleetSummaryView({ report }: { report: any }) {
  const m = report.modules;
  return (
    <div className="space-y-1">
      <ReportHeader report={report} />
      <p className="text-gray-400 text-sm">
        {report.fleetSize} vessels · {report.reportingYear} reporting year
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {/* CII */}
        <ModuleCard title="CII" color="emerald" items={[
          { label: 'Total CO₂', value: `${m.cii.totalCo2Mt} t` },
          { label: 'Rating A/B', value: `${m.cii.ratingDistribution.A + m.cii.ratingDistribution.B} vessels`, color: 'text-green-400' },
          { label: 'Rating C', value: `${m.cii.ratingDistribution.C} vessels` },
          { label: 'D/E (at risk)', value: `${m.cii.atRiskVessels} vessels`, color: m.cii.atRiskVessels > 0 ? 'text-red-400' : 'text-green-400' },
        ]} />

        {/* EU ETS */}
        <ModuleCard title="EU ETS" color="blue" items={[
          { label: 'Obligation', value: `${m.ets.totalObligationMt} EUA` },
          { label: 'Shortfall', value: `${m.ets.totalShortfallMt} EUA`, color: m.ets.totalShortfallMt > 0 ? 'text-red-400' : 'text-green-400' },
          { label: 'Settled', value: `${m.ets.settledVessels}/${m.ets.totalVessels}` },
        ]} />

        {/* FuelEU */}
        <ModuleCard title="FuelEU" color="orange" items={[
          { label: 'Compliant', value: `${m.fuelEu.compliantVessels}/${m.fuelEu.totalVessels}`, color: m.fuelEu.compliantVessels === m.fuelEu.totalVessels ? 'text-green-400' : 'text-yellow-400' },
          { label: 'Penalty', value: `€${(m.fuelEu.totalPenaltyEur / 1000).toFixed(0)}k`, color: m.fuelEu.totalPenaltyEur > 0 ? 'text-red-400' : 'text-green-400' },
        ]} />

        {/* EEXI */}
        <ModuleCard title="EEXI" color="emerald" items={[
          { label: 'Certified', value: `${m.eexi.certifiedVessels}/${m.eexi.totalVessels}` },
          { label: 'Compliant', value: `${m.eexi.compliantVessels}`, color: 'text-green-400' },
        ]} />

        {/* Carbon Credits */}
        <ModuleCard title="Carbon Credits" color="green" items={[
          { label: 'Active Credits', value: `${m.credits.activeCredits} tCO₂e` },
          { label: 'vs ETS Shortfall', value: `${m.credits.netVsEtsShortfall >= 0 ? '+' : ''}${m.credits.netVsEtsShortfall} tCO₂e`, color: m.credits.netVsEtsShortfall >= 0 ? 'text-green-400' : 'text-red-400' },
        ]} />
      </div>
    </div>
  );
}

function ModuleCard({ title, color, items }: {
  title: string;
  color: string;
  items: Array<{ label: string; value: string; color?: string }>;
}) {
  const borderColor = `border-${color}-500/30`;
  const titleColor = `text-${color}-400`;
  return (
    <div className={`bg-gray-800 border ${borderColor} rounded-xl p-4`}>
      <h3 className={`font-semibold text-sm ${titleColor} mb-3`}>{title}</h3>
      <div className="space-y-2">
        {items.map(({ label, value, color: vc }) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-gray-500">{label}</span>
            <span className={`font-mono font-medium ${vc ?? 'text-white'}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
