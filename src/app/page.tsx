"use client";

import { useEffect, useMemo, useState } from "react";

type Doctor = {
  id: string;
  name: string;
  spec: string;
  clinic: string;
  loc: string;
  score: number;
  potential: "High" | "Medium" | "Low";
  dist: string;
};

const patches = [
  ["Veera Desai", 19], ["Vile Parle", 25], ["Versova", 21],
  ["Andheri Station", 18], ["Oshiwara", 15], ["Lokhandwala", 16],
  ["Jogeshwari (W)", 14]
] as const;

const specialties = ["All", "Cardiologist", "Diabetologist", "General Physician", "Orthopedic", "Gynecologist"];

const nav = [
  ["explorer", "◉", "Doctor Explorer"], ["potential", "↗", "Doctor Potential"],
  ["ai", "✦", "AI Support"], ["stockist", "▣", "Stockist Data"]
] as const;

const execution = [
  ["plan", "▣", "My Plan"], ["calls", "☎", "My Calls"], ["samples", "□", "Samples"],
  ["targets", "▤", "Targets"], ["reports", "▤", "Reports"], ["notifications", "◉", "Notifications"]
] as const;

const writingPatterns = {
  "This Month": {
    categories: [["Pain Relievers",45],["Antibiotics",20],["Gastro Medicines",16],["Vitamins / Supplements",12],["Others",7]],
    molecules: [["Aceclofenac + Paracetamol","30%"],["Paracetamol","15%"],["Etoricoxib","11%"],["Amoxicillin + Clavulanate","9%"],["Pantoprazole","8%"],["Vitamin D3","6%"],["Others","21%"]],
    insight: "Pain Relievers jumped to 45% this month due to seasonal joint flare-ups."
  },
  "Last 3 Months": {
    categories: [["Pain Relievers",42],["Antibiotics",22],["Gastro Medicines",15],["Vitamins / Supplements",12],["Others",9]],
    molecules: [["Aceclofenac + Paracetamol","28%"],["Paracetamol","14%"],["Etoricoxib","12%"],["Amoxicillin + Clavulanate","10%"],["Pantoprazole","8%"],["Vitamin D3","5%"],["Others","23%"]],
    insight: "Doctor prescribes Pain Relievers most frequently (42%). Focus on Pain Management products."
  }
} as const;

export default function Home() {
  const [section, setSection] = useState("explorer");
  const [patch, setPatch] = useState("Veera Desai");
  const [specialty, setSpecialty] = useState("All");
  const [sort, setSort] = useState("score");
  const [query, setQuery] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [period, setPeriod] = useState<"This Month" | "Last 3 Months">("Last 3 Months");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [callOpen, setCallOpen] = useState(false);
  const [callOutcome, setCallOutcome] = useState("Positive on product discussion");
  const [callNotes, setCallNotes] = useState("");
  const [callSaving, setCallSaving] = useState(false);
  const [callMessage, setCallMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch("/api/doctors?" + new URLSearchParams({ patch, specialty, q: query, sort }), { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Unable to load doctors");
        return r.json() as Promise<Doctor[]>;
      })
      .then((data) => {
        if (cancelled) return;
        setDoctors(data);
        setSelected((current) => current && data.some((d) => d.id === current.id) ? current : data[0] ?? null);
      })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load doctors"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patch, specialty, sort, query]);

  const writing = writingPatterns[period];
  const selectedDoctor = selected ?? doctors[0] ?? null;

  const mapPoints = useMemo(() => doctors.map((doctor, index) => ({
    doctor,
    left: 10 + ((index * 17) % 78),
    top: 15 + ((index * 23) % 68)
  })), [doctors]);

  return (
    <div className="h-screen overflow-hidden flex bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 select-none">
        <div>
          <div className="p-5 border-b border-slate-800">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-base">MR</span> 3.0
            </h1>
            <p className="text-xs text-blue-400 font-medium mt-1">Smarter. Faster. Better.</p>
          </div>
          <nav className="p-3 space-y-1 text-sm font-medium">
            {nav.map(([id, icon, label]) => (
              <button key={id} onClick={() => setSection(id)}
                className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left " + (section === id ? "bg-blue-800 text-white border-l-4 border-blue-400" : "hover:bg-slate-800")}>
                <span className="w-5 text-center">{icon}</span>{label}
              </button>
            ))}
            <div className="pt-4 pb-2 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-bold">Execution</div>
            {execution.map(([id, icon, label]) => (
              <button key={id} onClick={() => setSection(id)}
                className={"w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-slate-800 " + (section === id ? "text-white" : "")}>
                <span className="w-5 text-center">{icon}</span>{label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <button className="text-slate-500 hover:text-slate-800 text-lg">☰</button>
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-2.5 text-slate-400">⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search doctor by name, specialty, brand, molecule..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-transparent rounded-full text-sm outline-none focus:bg-white focus:border-blue-500 transition-all" />
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={() => setSection("ai")} className="text-slate-600 hover:text-blue-600 relative">♧
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">2</span>
            </button>
            <div className="border-l border-slate-200 pl-4">
              <div className="text-sm font-bold text-slate-900">Amit Rawat</div>
              <div className="text-xs text-slate-500">Territory Manager</div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {section === "explorer" && (
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div><h2 className="text-2xl font-black text-slate-900">Doctor Explorer</h2><p className="text-sm text-slate-500">Find doctors by location, patch & specialty</p></div>
                <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                  <select className="text-xs font-semibold bg-slate-100 px-3 py-2 rounded-lg border-none" defaultValue="Maharashtra (Mumbai)"><option>Maharashtra (Mumbai)</option><option>Delhi</option><option>Karnataka</option><option>Gujarat</option><option>Tamil Nadu</option></select>
                  <span className="text-slate-300">/</span>
                  <select className="text-xs font-semibold bg-slate-100 px-3 py-2 rounded-lg border-none" defaultValue="Andheri Region"><option>Andheri Region</option><option>Bandra Region</option><option>Khar Region</option><option>Matunga Region</option></select>
                  <span className="text-slate-300">/</span>
                  <select value={patch} onChange={(e) => setPatch(e.target.value)} className="text-xs font-semibold bg-blue-50 text-blue-800 px-3 py-2 rounded-lg border-none">
                    {patches.map(([name]) => <option key={name}>{name}</option>)}
                  </select>
                  <span className="text-slate-300">/</span>
                  <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="text-xs font-semibold bg-slate-100 px-3 py-2 rounded-lg border-none">
                    {specialties.map((name) => <option key={name}>{name === "All" ? "All Specialties" : name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Patches in Region</h3>
                  <div className="space-y-1.5">
                    {patches.map(([name, count]) => <button key={name} onClick={() => setPatch(name)}
                      className={"w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold " + (patch === name ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-100 text-slate-700")}>
                      <span>{name}</span><span className={(patch === name ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600") + " px-2 py-0.5 rounded-full text-[11px]"}>{count}</span>
                    </button>)}
                  </div>
                </div>

                <div className="xl:col-span-7 space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div><h3 className="font-bold text-slate-800">Doctors in {patch} Patch ({doctors.length})</h3><p className="text-xs text-slate-500">Click row to open comprehensive profile & writing pattern</p></div>
                      <div className="flex items-center gap-2"><span className="text-xs text-slate-500">Sort by:</span>
                        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-xs bg-slate-100 px-2.5 py-1.5 rounded-lg font-medium"><option value="score">Potential Score (High to Low)</option><option value="distance">Distance (Nearest first)</option></select>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead><tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                          <th className="py-3 px-4">Doctor Name</th><th className="py-3 px-4">Specialty</th><th className="py-3 px-4">Clinic / Hospital</th><th className="py-3 px-4">Location</th><th className="py-3 px-4">Potential</th><th className="py-3 px-4 text-right">Distance</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {loading && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading doctors…</td></tr>}
                          {!loading && error && <tr><td colSpan={6} className="p-8 text-center text-red-600">{error}</td></tr>}
                          {!loading && !error && doctors.map((doctor) => <tr key={doctor.id} onClick={() => { setSelected(doctor); setSection("potential"); }} className="hover:bg-blue-50/50 cursor-pointer transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900">{doctor.name}</td>
                            <td className="py-3.5 px-4"><span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold">{doctor.spec}</span></td>
                            <td className="py-3.5 px-4 text-slate-600">{doctor.clinic}</td><td className="py-3.5 px-4 text-slate-600">{doctor.loc}</td>
                            <td className="py-3.5 px-4"><span className={(doctor.potential === "High" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800") + " font-bold px-2.5 py-1 rounded-lg text-xs"}>{doctor.score}</span></td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-600">{doctor.dist}</td>
                          </tr>)}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-slate-800">📍 Doctor Location Map — {patch}</h3><span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold">Live GPS Simulation</span></div>
                    <div className="relative h-64 bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                      <div className="absolute inset-0 opacity-20" style={{backgroundImage:"radial-gradient(#60a5fa 1px, transparent 1px)",backgroundSize:"24px 24px"}} />
                      {mapPoints.map(({doctor,left,top}) => <button key={doctor.id} onClick={() => {setSelected(doctor);setSection("potential");}} style={{left:left+"%",top:top+"%"}}
                        className={"absolute flex items-center justify-center w-7 h-7 rounded-full shadow-lg border-2 border-white text-xs font-black " + (selectedDoctor?.id===doctor.id ? "bg-blue-600 text-white" : "bg-red-600 text-white")}>●</button>)}
                      <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-lg">MR Current Position: <span className="text-emerald-400 font-bold">Andheri Station Hub</span></div>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3"><div><h3 className="font-bold text-slate-900">Writing Pattern — {selectedDoctor?.name ?? "Dr. Ankit Rawal"}</h3><p className="text-xs text-slate-500">Therapeutic category share</p></div>
                    <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} className="text-xs bg-slate-100 px-2.5 py-1.5 rounded-lg font-semibold"><option>This Month</option><option>Last 3 Months</option></select>
                  </div>
                  <div><div className="text-xs font-semibold text-slate-500 mb-2">What does doctor prescribe most?</div><div className="space-y-2">{writing.categories.map(([name,share]) => <div key={name}><div className="flex justify-between text-xs mb-1"><span>{name}</span><b>{share}%</b></div><div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-blue-600 h-full rounded-full" style={{width:share+"%"}} /></div></div>)}</div></div>
                  <div className="border-t border-slate-100 pt-4"><div className="text-xs font-semibold text-slate-500 mb-2">Top Molecules Prescribed</div><div className="space-y-2 text-xs">{writing.molecules.map(([name,share]) => <div key={name} className="flex justify-between py-1 border-b border-slate-100"><span>{name}</span><b>{share}</b></div>)}</div></div>
                  <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-xl"><div className="text-xs font-bold text-blue-900 mb-1">💡 Insight</div><p className="text-xs text-blue-800 leading-relaxed font-medium">{writing.insight}</p></div>
                  <button onClick={() => setSection("potential")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs">View Detailed Analytics →</button>
                </div>
              </div>
            </section>
          )}

          {section === "potential" && selectedDoctor && (
            <section className="space-y-6">
              <div className="flex items-center justify-between"><div><h2 className="text-2xl font-black text-slate-900">Doctor Potential & Deep Profile</h2><p className="text-sm text-slate-500">Detailed performance & prescribing insights</p></div><div className="flex gap-2"><button className="bg-blue-50 text-blue-700 font-semibold px-4 py-2 rounded-xl text-xs">＋ Add to Plan</button><button onClick={() => { setCallMessage(""); setCallNotes(""); setCallOpen(true); }} className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-xl text-xs">☎ Log Call</button></div></div>
              <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-6 rounded-2xl shadow-md"><h3 className="text-xl font-black">{selectedDoctor.name}<span className="ml-3 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] uppercase font-bold px-2 py-1 rounded-full">{selectedDoctor.potential} Potential</span></h3><p className="text-blue-200 text-sm mt-1">{selectedDoctor.spec} · {selectedDoctor.clinic}</p><p className="text-xs text-slate-300 mt-2">📍 {selectedDoctor.loc} · {selectedDoctor.dist}</p></div>
              <div className="grid xl:grid-cols-12 gap-5">
                <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"><div className="flex gap-5 border-b border-slate-100 pb-4 mb-5"><button className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-3 text-sm">Overview</button><button className="text-slate-500 text-sm pb-3">Prescribing</button><button className="text-slate-500 text-sm pb-3">History</button><button className="text-slate-500 text-sm pb-3">Insights</button></div><div className="grid grid-cols-3 gap-3">{[["Potential Score",selectedDoctor.score+"/100"],["Monthly Scripts","185"],["Conversion","18.2%"]].map(([a,b])=><div key={a} className="bg-slate-50 rounded-xl p-4"><div className="text-xs uppercase tracking-wider text-slate-400">{a}</div><div className="text-2xl font-black mt-1">{b}</div></div>)}</div><div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900"><b>🎯 Next Best Action</b><p className="mt-1">Pitch High-Intensity statin combination on Thursday.</p></div></div>
                <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"><div className="flex justify-between border-b border-slate-100 pb-3"><h3 className="font-bold">Doctor Availability</h3><span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-bold">Verified Schedule</span></div><div className="bg-blue-50 border border-blue-100 p-3.5 rounded-xl mt-4"><div className="text-xs uppercase text-blue-700 font-bold">Best Time to Visit</div><div className="text-base font-black text-blue-900 mt-1">10:30 AM – 12:30 PM</div><div className="text-xs text-blue-700">Mon–Sat</div></div><div className="border-t border-slate-100 mt-4 pt-4"><h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Primary Chemist Link</h4><div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100"><div><b className="text-sm">Noble Pharmacy</b><div className="text-xs text-slate-500">Veera Desai Rd · 185 scripts/mo</div></div><span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-lg">In Stock</span></div></div></div>
              </div>
            </section>
          )}

          {section === "ai" && (
            <section className="space-y-6"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-black text-slate-900">AI Support</h2><p className="text-sm text-slate-500">Your AI assistant for any query</p></div><span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-3 py-1.5 rounded-xl border border-indigo-100">Model: MR3-Clinical-v4</span></div>
              <div className="grid xl:grid-cols-12 gap-6"><div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200 flex flex-col h-[600px] shadow-sm"><div className="flex-1 overflow-y-auto p-5"><div className="flex items-start gap-3"><div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">AI</div><div className="bg-slate-100 rounded-2xl rounded-tl-none p-4 max-w-xl text-sm"><b>Hi Amit! 👋</b><p className="mt-1">I'm MR 3.0 AI Assistant. I can help you find the best products, understand doctor preferences and more.</p></div></div></div><div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">{["Top 10 cardiologists in Andheri","Highest potential in Veera Desai","Antibiotics in territory","Promote to Dr. Ankit Rawal"].map(x=><button key={x} className="text-xs bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 px-3 py-1.5 rounded-full">{x}</button>)}</div><div className="p-4 border-t border-slate-200 flex gap-3"><input placeholder="Ask me anything..." className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-5 py-3 text-sm outline-none focus:bg-white focus:border-blue-500"/><button className="bg-blue-600 hover:bg-blue-700 text-white w-11 h-11 rounded-full">➤</button></div></div><div className="xl:col-span-4 space-y-5"><div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm"><h3 className="font-bold">✦ AI Recommendation</h3><div className="mt-4 space-y-2 text-xs"><div className="bg-white/10 rounded-xl p-3.5 flex justify-between"><b>CardiaPain Plus</b><span>Match 98%</span></div><div className="bg-white/10 rounded-xl p-3.5 flex justify-between"><b>CardiaRelief</b><span>Alternative</span></div><div className="bg-white/10 rounded-xl p-3.5 flex justify-between"><b>CardiaMove</b><span>Alternative</span></div></div></div><div className="bg-white rounded-2xl border border-slate-200 p-5"><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Previous Discussion</h4><div className="bg-slate-50 border-l-4 border-blue-600 p-3.5 rounded-r-xl text-xs mt-3"><b>Doctor showed interest in pain-management products during the previous call.</b><div className="text-slate-400 mt-1">Logged 12 May · Mr. Amit Rawat</div></div></div></div></div>
            </section>
          )}

          {section === "stockist" && (
            <section className="space-y-6"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-black text-slate-900">Stockist Data</h2><p className="text-sm text-slate-500">Real-time stockist performance & availability</p></div><div className="flex gap-2"><select className="text-xs font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl"><option>Mumbai</option><option>Delhi</option></select><select className="text-xs font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl"><option>Andheri Region</option><option>Bandra Region</option></select></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[["Total Stockists","48"],["In Stock","41"],["Low Stock","5"],["Out of Stock","2"]].map(([a,b])=><div key={a} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"><div className="text-xs uppercase tracking-wider font-semibold text-slate-400">{a}</div><div className="text-2xl font-black text-slate-900 mt-1">{b}</div></div>)}</div><div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"><div className="px-5 py-4 border-b border-slate-100 font-bold">Aceclofenac + Paracetamol Availability</div><table className="w-full text-sm"><thead className="bg-slate-50 text-xs text-slate-500 uppercase"><tr><th className="p-3 text-left">Stockist</th><th className="p-3 text-left">Location</th><th className="p-3 text-left">Quantity</th><th className="p-3 text-left">Updated</th><th className="p-3 text-left">Status</th></tr></thead><tbody>{[["Shree Sai Medicals","Veera Desai Rd","480 strips","2 hrs ago","Good"],["HealthCare Distributors","Versova","320 strips","5 hrs ago","Good"],["Andheri Medico","Andheri Station","110 strips","1 day ago","Average"],["Lokhandwala Pharma","Lokhandwala","25 strips","2 days ago","Low"]].map(row=><tr key={row[0]} className="border-t border-slate-100"><td className="p-3 font-bold">{row[0]}</td><td className="p-3">{row[1]}</td><td className="p-3 font-mono">{row[2]}</td><td className="p-3 text-slate-500">{row[3]}</td><td className="p-3"><span className={(row[4]==="Good"?"bg-emerald-100 text-emerald-800":row[4]==="Average"?"bg-amber-100 text-amber-800":"bg-red-100 text-red-800")+" text-xs font-bold px-2.5 py-1 rounded-full"}>{row[4]}</span></td></tr>)}</tbody></table></div></section>
          )}

          {!["explorer","potential","ai","stockist"].includes(section) && (
            <section className="space-y-4"><h2 className="text-2xl font-black text-slate-900">{execution.find(x => x[0] === section)?.[2]}</h2><p className="text-sm text-slate-500">Module boundary established; persistent workflow is next.</p><div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">This module is intentionally being connected to the production data model instead of remaining an alert placeholder.</div></section>
          )}

          {callOpen && selectedDoctor && (
            <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="call-dialog-title">
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
                  <div><h3 id="call-dialog-title" className="text-lg font-black text-slate-900">Log Call</h3><p className="text-xs text-slate-500 mt-1">{selectedDoctor.name} · {selectedDoctor.clinic}</p></div>
                  <button onClick={() => setCallOpen(false)} disabled={callSaving} className="text-slate-400 hover:text-slate-700 text-xl" aria-label="Close">×</button>
                </div>
                <form className="p-6 space-y-4" onSubmit={async (event) => {
                  event.preventDefault();
                  setCallSaving(true); setCallMessage("");
                  try {
                    const response = await fetch("/api/calls", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ doctorId: selectedDoctor.id, outcome: callOutcome, notes: callNotes, status: "COMPLETED" })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || "Unable to log call");
                    setCallMessage("Call logged successfully and added to the audit trail.");
                    setTimeout(() => setCallOpen(false), 900);
                  } catch (e) {
                    setCallMessage(e instanceof Error ? e.message : "Unable to log call");
                  } finally { setCallSaving(false); }
                }}>
                  <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Outcome</label><select value={callOutcome} onChange={(e) => setCallOutcome(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white"><option>Positive on product discussion</option><option>Requested follow-up</option><option>Samples requested</option><option>Not interested</option><option>Doctor unavailable</option></select></div>
                  <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Notes</label><textarea value={callNotes} onChange={(e) => setCallNotes(e.target.value)} maxLength={5000} rows={5} placeholder="Record the key discussion, objection or next action..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none outline-none focus:border-blue-500" /></div>
                  {callMessage && <div className={"rounded-xl px-3 py-2.5 text-xs font-semibold " + (callMessage.startsWith("Call logged") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{callMessage}</div>}
                  <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setCallOpen(false)} disabled={callSaving} className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700">Cancel</button><button type="submit" disabled={callSaving} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white disabled:opacity-60">{callSaving ? "Saving…" : "Save Call"}</button></div>
                </form>
              </div>
            </div>
          )}

          <footer className="mt-8 bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm"><div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-600"><span>Total Doctors: <b className="text-slate-900">1,243</b></span><span>High Potential: <b className="text-emerald-600">312 (25.1%)</b></span><span>Total Calls: <b className="text-slate-900">156</b></span><span>Samples: <b className="text-slate-900">320</b></span><span>Conversion Rate: <b className="text-blue-600">18.2%</b></span><span>Top Specialty: <b className="text-slate-900">Cardiologists (42%)</b></span><span>Top Molecule: <b className="text-slate-900">Aceclofenac + Paracetamol</b></span></div><button onClick={() => setSection("plan")} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl">Go to My Plan →</button></footer>
        </div>
      </main>
    </div>
  );
}
