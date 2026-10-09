"use client";

import { useEffect, useMemo, useState } from "react";
import { UserMenu } from "./components/user-menu";
import { StockistPanel } from "./components/stockist-panel";

type Product = { id: string; name: string; molecule: string | null; category: string | null };

type SampleIssue = {
  id: string; doctorId: string; doctorName: string; specialty: string;
  productId: string; productName: string; molecule: string; quantity: number;
  status: "ISSUED" | "RETURNED" | "CANCELLED"; issuedAt: string;
};

type TargetData = {
  period: { start: string; end: string };
  target: { id: string; targetCalls: number; targetSamples: number; targetConversions: number } | null;
  actual: { completedCalls: number; sampleUnits: number; conversions: number | null };
  conversionTracking: { available: boolean; message: string };
};

type ReportData = {
  period: { start: string; end: string };
  calls: { total: number; completed: number; planned: number; missed: number; cancelled: number };
  samples: { issues: number; unitsIssued: number };
  plans: { total: number; planned: number; completed: number; missed: number; cancelled: number };
  target: { targetCalls: number; targetSamples: number; targetConversions: number } | null;
  topDoctors: { doctorId: string; doctorName: string; specialty: string; completedCalls: number }[];
  topProducts: { productId: string | null; productName: string; molecule: string | null; unitsIssued: number }[];
  conversionTracking: { available: boolean; message: string };
};

type NotificationItem = {
  id: string; type: string; title: string; message: string;
  actionUrl: string | null; isRead: boolean; createdAt: string;
};

type Plan = {
  id: string; doctorId: string; doctorName: string; clinic: string; location: string; specialty: string;
  score: number; potential: "HIGH" | "MEDIUM" | "LOW"; plannedFor: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"; objective: string;
  status: "PLANNED" | "COMPLETED" | "MISSED" | "CANCELLED"; notes: string;
};

type Doctor = {
  id: string;
  name: string;
  spec: string;
  clinic: string;
  loc: string;
  score: number;
  potential: "High" | "Medium" | "Low";
  dist: string;
  coords: { x: number; y: number } | null;
  exactLocation: { latitude: number; longitude: number } | null;
};

type DoctorProfile = {
  doctor: {
    id: string;
    name: string;
    specialty: { id: string; name: string } | null;
    clinic: string;
    location: string;
    score: number;
    potential: string;
    distanceKm: string | null;
    mapCoordinates: { x: number; y: number } | null;
    patches: { id: string; name: string; doctorCount: number }[];
  };
  activity: {
    completedCalls: number;
    totalCalls: number;
    issuedSampleUnits: number;
    sampleIssues: number;
    plans: number;
    lastActivity: string | null;
  };
  calls: {
    id: string;
    status: string;
    outcome: string | null;
    notes: string | null;
    calledAt: string;
    product: { id: string; name: string; molecule: string | null } | null;
  }[];
  samples: {
    id: string;
    quantity: number;
    status: string;
    issuedAt: string;
    product: { id: string; name: string; molecule: string | null } | null;
  }[];
  plans: {
    id: string;
    plannedFor: string;
    priority: string;
    objective: string;
    status: string;
    notes: string;
  }[];
  writingPattern: WritingPattern | null;
};

type AiMessage = {
  role: "user" | "assistant";
  content: string;
};

type WritingPattern = {
  period: "This Month" | "Last 3 Months";
  categories: [string, number][];
  molecules: [string, string][];
  insight: string;
  sourceLabel: string;
  doctorSpecific: boolean;
};

type DashboardSummary = {
  doctors: number;
  highPotential: number;
  highPotentialPercent: number;
  calls: number;
  sampleUnits: number;
  conversionRate: number | null;
  topSpecialty: string | null;
  topSpecialtyCount: number;
  topMolecule: string | null;
};

const nav = [
  ["explorer", "◉", "Doctor Explorer"], ["potential", "↗", "Doctor Potential"],
  ["ai", "✦", "AI Support"], ["stockist", "▣", "Stockist Data"]
] as const;

const execution = [
  ["plan", "▣", "My Plan"], ["calls", "☎", "My Calls"], ["samples", "□", "Samples"],
  ["targets", "▤", "Targets"], ["reports", "▤", "Reports"], ["notifications", "◉", "Notifications"]
] as const;

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
};

export default function Home() {
  const [section, setSection] = useState("explorer");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [state, setState] = useState("Maharashtra");
  const [region, setRegion] = useState("Andheri Region");
  const [patch, setPatch] = useState("Veera Desai");
  const [specialty, setSpecialty] = useState("All");
  const [locations, setLocations] = useState<{ state: string; regions: { name: string; patches: { id: string; name: string; doctorCount: number }[] }[] }[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [patches, setPatches] = useState<{ id: string; name: string; doctorCount: number }[]>([]);
  const [specialties, setSpecialties] = useState<string[]>(["All"]);
  const [sort, setSort] = useState("score");
  const [query, setQuery] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [doctorProfileLoading, setDoctorProfileLoading] = useState(false);
  const [doctorProfileError, setDoctorProfileError] = useState("");
  const [doctorProfileTab, setDoctorProfileTab] = useState<"Overview" | "Prescribing" | "History" | "Insights">("Overview");
  const [period, setPeriod] = useState<"This Month" | "Last 3 Months">("Last 3 Months");
  const [writingPattern, setWritingPattern] = useState<WritingPattern | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [callOpen, setCallOpen] = useState(false);
  const [callOutcome, setCallOutcome] = useState("Positive on product discussion");
  const [callNotes, setCallNotes] = useState("");
  const [callSaving, setCallSaving] = useState(false);
  const [callMessage, setCallMessage] = useState("");
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [callFilter, setCallFilter] = useState("ALL");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [planMessage, setPlanMessage] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [planTime, setPlanTime] = useState("10:30");
  const [planPriority, setPlanPriority] = useState<Plan["priority"]>("NORMAL");
  const [planObjective, setPlanObjective] = useState("");
  const [planNotes, setPlanNotes] = useState("");
  const [samples, setSamples] = useState<SampleIssue[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [sampleSaving, setSampleSaving] = useState(false);
  const [sampleMessage, setSampleMessage] = useState("");
  const [sampleProductId, setSampleProductId] = useState("");
  const [sampleQuantity, setSampleQuantity] = useState(5);
  const [sampleFilter, setSampleFilter] = useState("ALL");
  const [targetPeriodStart, setTargetPeriodStart] = useState(() => {
    const d = new Date();
    return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [targetPeriodEnd, setTargetPeriodEnd] = useState(() => {
    const d = new Date();
    return formatLocalDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  });
  const [targetData, setTargetData] = useState<TargetData | null>(null);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [targetSaving, setTargetSaving] = useState(false);
  const [targetMessage, setTargetMessage] = useState("");
  const [reportPeriodStart, setReportPeriodStart] = useState(() => {
    const d = new Date();
    return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [reportPeriodEnd, setReportPeriodEnd] = useState(() => {
    const d = new Date();
    return formatLocalDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const selectedDoctor = selected ?? doctors[0] ?? null;

  const sectionMeta: Record<string, { title: string; description: string }> = {
    explorer: { title: "Doctor Explorer", description: "Discover and prioritize doctors using persisted field intelligence." },
    potential: { title: "Doctor Potential", description: "Review doctor activity, history, and available insights." },
    ai: { title: "AI Support", description: "Ask about doctors, products, stockists, activity, and field planning." },
    stockist: { title: "Stockist Data", description: "Monitor inventory availability from persisted stockist data." },
    plan: { title: "My Plan", description: "Plan and manage your upcoming field visits." },
    calls: { title: "My Calls", description: "Review your persisted call activity and outcomes." },
    samples: { title: "Samples", description: "Issue and review sample activity using live inventory data." },
    targets: { title: "Targets", description: "Manage period targets and compare them with actual activity." },
    reports: { title: "Reports", description: "Review performance metrics calculated from persisted activity." },
    notifications: { title: "Notifications", description: "Stay on top of workflow updates and actions." }
  };
  const currentSection = sectionMeta[section] ?? sectionMeta.explorer;
  const navigate = (nextSection: string) => {
    setSection(nextSection);
    setMobileNavOpen(false);
  };

  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    {
      role: "assistant",
      content: "Hi! 👋 I’m MR 3.0 AI Support. Ask about doctors, products, stockists, recent activity, or your upcoming plan."
    }
  ]);

  useEffect(() => {
    let cancelled = false;
    setLocationsLoading(true);

    fetch("/api/metadata", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load Explorer metadata");
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;

        const nextLocations = Array.isArray(data.locations) ? data.locations : [];
        const nextPatches = Array.isArray(data.patches) ? data.patches : [];
        const nextSpecialties = Array.isArray(data.specialties) ? data.specialties : [];

        setLocations(nextLocations);
        setPatches(nextPatches);
        setSpecialties(["All", ...nextSpecialties.map((item: { name: string }) => item.name)]);

        if (nextLocations.length > 0) {
          const firstState = nextLocations[0];
          const firstRegion = firstState.regions[0];
          const firstPatch = firstRegion?.patches[0];

          setState((current) => nextLocations.some((item: { state: string }) => item.state === current) ? current : firstState.state);
          setRegion((current) =>
            firstState.regions.some((item: { name: string }) => item.name === current)
              ? current
              : (firstRegion?.name ?? "")
          );
          setPatch((current) =>
            firstRegion?.patches.some((item: { name: string }) => item.name === current)
              ? current
              : (firstPatch?.name ?? "")
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLocations([]);
          setPatches([]);
          setSpecialties(["All"]);
        }
      })
      .finally(() => {
        if (!cancelled) setLocationsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics/writing-pattern?period=" + encodeURIComponent(period), { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Unable to load writing pattern");
        return response.json();
      })
      .then((data: WritingPattern) => { if (!cancelled) setWritingPattern(data); })
      .catch(() => { if (!cancelled) setWritingPattern(null); })
    return () => { cancelled = true; };
  }, [period]);

  useEffect(() => {
    fetch("/api/dashboard/summary", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Unable to load dashboard summary");
        return response.json();
      })
      .then((data: DashboardSummary) => setDashboardSummary(data))
      .catch(() => setDashboardSummary(null));
  }, []);

  useEffect(() => {
    if (!selectedDoctor) {
      setDoctorProfile(null);
      return;
    }

    let cancelled = false;
    setDoctorProfileLoading(true);
    setDoctorProfileError("");

    fetch("/api/doctors/" + selectedDoctor.id + "/profile", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Unable to load doctor profile");
        return data as DoctorProfile;
      })
      .then((data) => {
        if (!cancelled) setDoctorProfile(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setDoctorProfile(null);
          setDoctorProfileError(error instanceof Error ? error.message : "Unable to load doctor profile");
        }
      })
      .finally(() => {
        if (!cancelled) setDoctorProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDoctor]);

  useEffect(() => {
    if (!selectedDoctor) return;
    setDoctorProfileTab("Overview");
  }, [selectedDoctor?.id]);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then(r => r.json())
      .then(data => setProducts(data.products || []))
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (section !== "samples") return;
    let cancelled = false;
    setSamplesLoading(true);
    fetch("/api/samples?limit=100" + (sampleFilter !== "ALL" ? "&status=" + sampleFilter : ""), { cache: "no-store" })
      .then(async r => { if (!r.ok) throw new Error("Unable to load samples"); return r.json(); })
      .then(data => { if (!cancelled) setSamples(data.samples || []); })
      .catch(() => { if (!cancelled) setSamples([]); })
      .finally(() => { if (!cancelled) setSamplesLoading(false); });
    return () => { cancelled = true; };
  }, [section, sampleFilter]);

  const openSampleDialog = (doctor: Doctor) => {
    setSelected(doctor);
    setSampleProductId(products[0]?.id || "");
    setSampleQuantity(5);
    setSampleMessage("");
    setSampleOpen(true);
  };

  const saveSample = async () => {
    if (!selectedDoctor || !sampleProductId || sampleQuantity < 1) return;
    setSampleSaving(true); setSampleMessage("");
    try {
      const response = await fetch("/api/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: selectedDoctor.id, productId: sampleProductId, quantity: sampleQuantity })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to issue samples");
      setSampleOpen(false);
      setSection("samples");
    } catch (e) {
      setSampleMessage(e instanceof Error ? e.message : "Unable to issue samples");
    } finally {
      setSampleSaving(false);
    }
  };

  const updateSampleStatus = async (id: string, status: SampleIssue["status"]) => {
    const response = await fetch("/api/samples", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status })
    });
    if (!response.ok) return;
    setSamples(current => current.map(sample => sample.id === id ? { ...sample, status } : sample));
  };


  useEffect(() => {
    if (section !== "targets" || !targetPeriodStart || !targetPeriodEnd) return;
    let cancelled = false;
    setTargetsLoading(true);
    setTargetMessage("");
    fetch("/api/targets?from=" + targetPeriodStart + "&to=" + targetPeriodEnd, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load targets");
        return response.json();
      })
      .then((data: TargetData) => {
        if (cancelled) return;
        setTargetData(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setTargetData(null);
          setTargetMessage(error instanceof Error ? error.message : "Unable to load targets");
        }
      })
      .finally(() => { if (!cancelled) setTargetsLoading(false); });
    return () => { cancelled = true; };
  }, [section, targetPeriodStart, targetPeriodEnd]);

  const saveTarget = async () => {
    setTargetSaving(true);
    setTargetMessage("");
    try {
      const response = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: targetPeriodStart,
          periodEnd: targetPeriodEnd,
          targetCalls: targetData?.target?.targetCalls ?? 0,
          targetSamples: targetData?.target?.targetSamples ?? 0,
          targetConversions: targetData?.target?.targetConversions ?? 0
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save target");
      setTargetMessage("Target saved.");
      setTargetData((current) => current ? {
        ...current,
        target: {
          id: data.id,
          targetCalls: data.targetCalls,
          targetSamples: data.targetSamples,
          targetConversions: data.targetConversions
        }
      } : current);
    } catch (error) {
      setTargetMessage(error instanceof Error ? error.message : "Unable to save target");
    } finally {
      setTargetSaving(false);
    }
  };

  const updateTargetValue = (field: "targetCalls" | "targetSamples" | "targetConversions", value: number) => {
    setTargetData((current) => {
      if (!current) return current;
      const target = current.target ?? {
        id: "",
        targetCalls: 0,
        targetSamples: 0,
        targetConversions: 0
      };
      return { ...current, target: { ...target, [field]: Math.max(0, Math.floor(value) || 0) } };
    });
  };

  useEffect(() => {
    if (section !== "reports" || !reportPeriodStart || !reportPeriodEnd) return;
    let cancelled = false;
    setReportsLoading(true);
    setReportMessage("");
    fetch("/api/reports?from=" + reportPeriodStart + "&to=" + reportPeriodEnd, { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Unable to load report");
        return response.json();
      })
      .then((data: ReportData) => { if (!cancelled) setReportData(data); })
      .catch(error => {
        if (!cancelled) {
          setReportData(null);
          setReportMessage(error instanceof Error ? error.message : "Unable to load report");
        }
      })
      .finally(() => { if (!cancelled) setReportsLoading(false); });
    return () => { cancelled = true; };
  }, [section, reportPeriodStart, reportPeriodEnd]);

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load notifications");
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadNotifications(data.unreadCount || 0);
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (section === "notifications") loadNotifications();
  }, [section]);

  useEffect(() => {
    if (!notificationOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".mr-notification-wrap")) {
        setNotificationOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotificationOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [notificationOpen]);

  const markNotificationRead = async (notification: NotificationItem) => {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notification.id })
    });
    if (!response.ok) return;
    setNotifications(current => current.map(item => item.id === notification.id ? { ...item, isRead: true } : item));
    setUnreadNotifications(current => Math.max(0, current - (notification.isRead ? 0 : 1)));
    if (notification.actionUrl?.includes("section=")) {
      const nextSection = new URLSearchParams(notification.actionUrl.split("?")[1]).get("section");
      if (nextSection) setSection(nextSection);
    }
  };

  const markAllNotificationsRead = async () => {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true })
    });
    if (!response.ok) return;
    setNotifications(current => current.map(item => ({ ...item, isRead: true })));
    setUnreadNotifications(0);
  };

  useEffect(() => {
    if (section !== "plan") return;
    let cancelled = false;
    setPlansLoading(true);
    fetch("/api/plans", { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("Unable to load My Plan"); return response.json(); })
      .then((data) => { if (!cancelled) setPlans(data.plans || []); })
      .catch(() => { if (!cancelled) setPlans([]); })
      .finally(() => { if (!cancelled) setPlansLoading(false); });
    return () => { cancelled = true; };
  }, [section]);

  const openPlanDialog = (doctor: Doctor) => {
    const next = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const localDate = new Date(next.getTime() - next.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    setSelected(doctor); setPlanDate(localDate); setPlanTime("10:30");
    setPlanPriority(doctor.potential === "High" ? "HIGH" : "NORMAL");
    setPlanObjective("Follow up on previous discussion and identify next best action.");
    setPlanNotes(""); setPlanMessage(""); setPlanOpen(true);
  };

  const savePlan = async () => {
    if (!selectedDoctor || !planDate || !planTime) return;
    setPlanSaving(true); setPlanMessage("");
    try {
      const response = await fetch("/api/plans", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: selectedDoctor.id, plannedFor: new Date(planDate + "T" + planTime).toISOString(), priority: planPriority, objective: planObjective, notes: planNotes })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to add doctor to plan");
      setPlanOpen(false); setPlanMessage("Doctor added to My Plan."); setSection("plan");
    } catch (e) { setPlanMessage(e instanceof Error ? e.message : "Unable to add doctor to plan"); }
    finally { setPlanSaving(false); }
  };

  const updatePlanStatus = async (id: string, status: Plan["status"]) => {
    const response = await fetch("/api/plans", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (!response.ok) return;
    setPlans((current) => current.map((plan) => plan.id === id ? { ...plan, status } : plan));
  };

  const selectedState = locations.find((item) => item.state === state);
  const selectedRegion = selectedState?.regions.find((item) => item.name === region);
  const visiblePatches = selectedRegion?.patches ?? [];

  useEffect(() => {
    if (locationsLoading || !state || !region || !patch) {
      setDoctors([]);
      setSelected(null);
      setLoading(locationsLoading);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    fetch("/api/doctors?" + new URLSearchParams({ state, region, patch, specialty, q: query, sort }), { cache: "no-store" })
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
  }, [locationsLoading, state, region, patch, specialty, sort, query]);

  useEffect(() => {
    if (section !== "calls") return;
    let cancelled = false;
    setCallsLoading(true);
    fetch("/api/calls?limit=100" + (callFilter !== "ALL" ? "&status=" + callFilter : ""), { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load call history");
        return response.json();
      })
      .then((data) => { if (!cancelled) setCallHistory(data.calls || []); })
      .catch(() => { if (!cancelled) setCallHistory([]); })
      .finally(() => { if (!cancelled) setCallsLoading(false); });
    return () => { cancelled = true; };
  }, [section, callFilter]);

  const askAi = async (question?: string) => {
    const text = (question ?? aiInput).trim();
    if (!text || aiLoading) return;

    setAiInput("");
    setAiMessages((messages) => [...messages, { role: "user", content: text }]);
    setAiLoading(true);

    try {
      const response = await fetch("/api/ai/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text })
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Unable to reach AI Support.");
      }

      setAiMessages((messages) => [
        ...messages,
        { role: "assistant", content: data.answer || "No answer was returned." }
      ]);
    } catch (error) {
      setAiMessages((messages) => [
        ...messages,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "AI Support is temporarily unavailable."
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const writing = writingPattern ?? { categories: [], molecules: [], insight: "Writing pattern data is unavailable.", sourceLabel: "UNAVAILABLE", doctorSpecific: false };
  const selectedMapQuery = selectedDoctor
    ? [selectedDoctor.clinic, selectedDoctor.loc, patch, region, state, "India"].filter(Boolean).join(", ")
    : [patch, region, state, "India"].filter(Boolean).join(", ");
  const selectedExactLocation = selectedDoctor?.exactLocation ?? null;
  const googleMapsSearchUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(
    selectedExactLocation
      ? selectedExactLocation.latitude + "," + selectedExactLocation.longitude
      : selectedMapQuery
  );
  const googleMapsEmbedUrl = "https://maps.google.com/maps?q=" + encodeURIComponent(
    selectedExactLocation
      ? selectedExactLocation.latitude + "," + selectedExactLocation.longitude
      : selectedMapQuery
  ) + "&output=embed";

  return (
    <div className="mr-app-shell h-screen overflow-hidden flex bg-slate-50">
      {mobileNavOpen && (
        <button type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] md:hidden" />
      )}
      <aside className={"mr-sidebar w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 select-none" + (mobileNavOpen ? " mr-sidebar-open" : "")}>
        <div>
          <div className="p-5 border-b border-slate-800">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-base">MR</span> 3.0
            </h1>
            <p className="text-xs text-blue-400 font-medium mt-1">Smarter. Faster. Better.</p>
          </div>
          <nav className="p-3 space-y-1 text-sm font-medium">
            {nav.map(([id, icon, label]) => (
              <button key={id} onClick={() => navigate(id)}
                className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left " + (section === id ? "bg-blue-800 text-white border-l-4 border-blue-400" : "hover:bg-slate-800")}>
                <span className="w-5 text-center">{icon}</span>{label}
              </button>
            ))}
            <div className="pt-4 pb-2 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-bold">Execution</div>
            {execution.map(([id, icon, label]) => (
              <button key={id} onClick={() => navigate(id)}
                className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-800 " + (section === id ? "text-white" : "")}>
                <span className="w-5 text-center">{icon}</span>{label}
              </button>
            ))}
          </nav>
          <div className="mt-3 mx-3 mb-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span>Data connection</span>
              <span className="text-emerald-400 font-bold">Live</span>
            </div>
            <div className="mt-1 text-slate-500">Persisted MR 3.0 workspace</div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="mr-topbar bg-white border-b border-slate-200 px-4 lg:px-6 shrink-0">
          <div className="mr-header-inner">
            <div className="mr-header-leading">
              <button type="button" aria-label="Open navigation" aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen(true)}
                className="mr-menu-button h-10 w-10 shrink-0 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900">☰</button>

              <div className="mr-header-title min-w-0">
                <div className="text-sm font-black text-slate-900 truncate">{currentSection.title}</div>
                <div className="text-[11px] text-slate-400 truncate">{currentSection.description}</div>
              </div>

              <div className="mr-header-search relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search doctor, specialty, brand or molecule..."
                  aria-label="Search doctors, specialties, brands or molecules"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-transparent rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all" />
              </div>
            </div>

            <div className="mr-header-actions">
              <div className="mr-notification-wrap relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationOpen((open) => !open);
                    if (!notificationOpen) loadNotifications();
                  }}
                  className={"mr-header-notifications h-10 w-10 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-blue-600 relative" + (notificationOpen ? " bg-slate-50 border-slate-200 text-blue-600" : "")}
                  aria-label="Notifications"
                  aria-expanded={notificationOpen}
                  aria-haspopup="dialog"
                >
                  <svg className="mr-bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                    <path d="M10 21h4" />
                  </svg>
                  {unreadNotifications > 0 && (
                    <span className="mr-notification-badge">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>
                  )}
                </button>

                {notificationOpen && (
                  <div className="mr-notification-popover" role="dialog" aria-label="Notifications">
                    <div className="mr-notification-popover-head">
                      <div>
                        <div className="font-black text-slate-900">Notifications</div>
                        <div className="text-[11px] text-slate-500">
                          {unreadNotifications > 0 ? unreadNotifications + " unread" : "You're all caught up"}
                        </div>
                      </div>
                      {unreadNotifications > 0 && (
                        <button type="button" onClick={markAllNotificationsRead} className="text-[11px] font-bold text-blue-700 hover:text-blue-800">
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="mr-notification-list">
                      {notificationsLoading ? (
                        <div className="p-6 text-center text-xs text-slate-500">Loading…</div>
                      ) : notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">No notifications yet.</div>
                      ) : (
                        notifications.slice(0, 6).map((notification) => (
                          <button
                            type="button"
                            key={notification.id}
                            onClick={async () => {
                              await markNotificationRead(notification);
                              setNotificationOpen(false);
                              if (notification.actionUrl?.includes("section=")) {
                                const nextSection = new URLSearchParams(notification.actionUrl.split("?")[1]).get("section");
                                if (nextSection) navigate(nextSection);
                              }
                            }}
                            className={"mr-notification-item" + (notification.isRead ? "" : " is-unread")}
                          >
                            <span className="mr-notification-dot" aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-bold text-slate-900 truncate">{notification.title}</span>
                              <span className="block text-[11px] leading-4 text-slate-500 line-clamp-2">{notification.message}</span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>

                    <button type="button" onClick={() => { setNotificationOpen(false); navigate("notifications"); }} className="mr-notification-view-all">
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
              <div className="mr-header-divider" />
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="mr-main-content flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          {section === "explorer" && (
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div><h2 className="text-2xl font-black text-slate-900">Doctor Explorer</h2><p className="text-sm text-slate-500">Find doctors by location, patch & specialty</p></div>
                <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                  <select value={state} onChange={(e) => {
                    const nextState = e.target.value;
                    const nextStateData = locations.find((item) => item.state === nextState);
                    const nextRegion = nextStateData?.regions[0];
                    const nextPatch = nextRegion?.patches[0];
                    setState(nextState);
                    setRegion(nextRegion?.name ?? "");
                    setPatch(nextPatch?.name ?? "");
                  }} className="text-xs font-semibold bg-slate-100 px-3 py-2 rounded-lg border-none">
                    {locations.map((item) => <option key={item.state} value={item.state}>{item.state}</option>)}
                  </select>
                  <span className="text-slate-300">/</span>
                  <select value={region} onChange={(e) => {
                    const nextRegion = e.target.value;
                    const nextRegionData = selectedState?.regions.find((item) => item.name === nextRegion);
                    setRegion(nextRegion);
                    setPatch(nextRegionData?.patches[0]?.name ?? "");
                  }} disabled={!selectedState || selectedState.regions.length === 0} className="text-xs font-semibold bg-slate-100 px-3 py-2 rounded-lg border-none disabled:opacity-50">
                    {selectedState?.regions.length
                      ? selectedState.regions.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)
                      : <option value="">No regions available</option>}
                  </select>
                  <span className="text-slate-300">/</span>
                  <select value={patch} onChange={(e) => setPatch(e.target.value)} disabled={visiblePatches.length === 0} className="text-xs font-semibold bg-blue-50 text-blue-800 px-3 py-2 rounded-lg border-none disabled:opacity-50">
                    {visiblePatches.length
                      ? visiblePatches.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)
                      : <option value="">No patches available</option>}
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
                    {visiblePatches.map((item) => <button key={item.id} onClick={() => setPatch(item.name)}
                      className={"w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold " + (patch === item.name ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-100 text-slate-700")}>
                      <span>{item.name}</span><span className={(patch === item.name ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600") + " px-2 py-0.5 rounded-full text-[11px]"}>{item.doctorCount}</span>
                    </button>)}
                  </div>
                </div>

                <div className="xl:col-span-7 space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="mr-doctor-table-header px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                      <div className="mr-doctor-table-heading min-w-0">
                        <h3 className="font-bold text-slate-800">Doctors in {patch} Patch ({doctors.length})</h3>
                        <p className="text-xs text-slate-500">Click row to open comprehensive profile & writing pattern</p>
                      </div>
                      <div className="mr-doctor-sort flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-500">Sort by:</span>
                        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-xs bg-slate-100 px-2.5 py-1.5 rounded-lg font-medium">
                          <option value="score">Potential Score (High to Low)</option>
                          <option value="distance">Distance (Nearest first)</option>
                        </select>
                      </div>
                    </div>
                    <div className="mr-desktop-table overflow-x-auto">
                      <table className="mr-responsive-table w-full text-left border-collapse">
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
                    <div className="mr-mobile-doctor-cards p-3 space-y-3">
                      {loading && <div className="p-6 text-center text-sm text-slate-500">Loading doctors…</div>}
                      {!loading && error && <div className="p-4 rounded-xl bg-red-50 text-sm text-red-700">{error}</div>}
                      {!loading && !error && doctors.map((doctor) => (
                        <button key={doctor.id} type="button" onClick={() => { setSelected(doctor); setSection("potential"); }}
                          className="w-full text-left rounded-2xl border border-slate-200 bg-slate-50 p-4 active:scale-[.99]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-black text-slate-900 truncate">{doctor.name}</div>
                              <div className="text-xs text-slate-500 mt-1">{doctor.spec}</div>
                            </div>
                            <span className={(doctor.potential === "High" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800") + " shrink-0 font-black px-2.5 py-1 rounded-lg text-xs"}>{doctor.score}</span>
                          </div>
                          <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
                            <div className="flex items-center gap-2 text-slate-600"><span className="text-slate-400">Clinic</span><span className="font-semibold truncate">{doctor.clinic}</span></div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-600 truncate">{doctor.loc}</span>
                              <span className="font-mono text-slate-500 shrink-0">{doctor.dist}</span>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-200 text-xs font-bold text-blue-700">Open doctor profile →</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-bold text-slate-800">📍 Google Maps — {selectedDoctor?.name ?? patch}</h3>
                        <p className="text-xs text-slate-500 mt-1">{selectedDoctor ? selectedDoctor.clinic + " · " + selectedDoctor.loc : patch + " · " + region}</p>
                      <span className={"mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold " + (selectedExactLocation ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                        {selectedExactLocation ? "Coordinates saved in doctor record" : "Location not verified — searching by clinic text"}
                      </span>
                      </div>
                      <a href={googleMapsSearchUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">
                        Open in Google Maps ↗
                      </a>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <iframe
                        key={selectedDoctor?.id ?? patch}
                        title={"Google Maps search for " + (selectedDoctor?.name ?? patch)}
                        src={googleMapsEmbedUrl}
                        className="block h-72 sm:h-80 w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                      />
                    </div>
                    <p className="mt-3 text-[11px] leading-5 text-slate-500">
                      {selectedExactLocation
                        ? "Map centered on the latitude/longitude saved in this doctor record. Verify that the coordinates point to the intended clinic before using them operationally."
                        : "This demo record has no verified GPS coordinates. Google Maps is searching the clinic and locality text, which may return a similarly named place. Do not treat the result as the exact clinic until its coordinates are verified and saved."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {doctors.map((doctor) => (
                        <button key={doctor.id} type="button"
                          onClick={() => setSelected(doctor)}
                          className={"rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " + (selectedDoctor?.id === doctor.id ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300")}>
                          {doctor.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3"><div><h3 className="font-bold text-slate-900">Writing Pattern — {selectedDoctor?.name ?? "Dr. Ankit Rawal"}</h3><p className="text-xs text-slate-500">Therapeutic category share · {writing.doctorSpecific ? "doctor-specific" : "prototype source snapshot"}</p></div>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Doctor Potential & Deep Profile</h2>
                  <p className="text-sm text-slate-500">Detailed performance & prescribing insights</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openPlanDialog(selectedDoctor)} className="bg-blue-50 text-blue-700 font-semibold px-4 py-2 rounded-xl text-xs">＋ Add to Plan</button>
                    <button onClick={() => openSampleDialog(selectedDoctor)} className="bg-white border border-blue-200 text-blue-700 font-semibold px-4 py-2 rounded-xl text-xs">□ Issue Samples</button>
                  </div>
                  <button onClick={() => { setCallMessage(""); setCallNotes(""); setCallOpen(true); }} className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-xl text-xs">☎ Log Call</button>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-6 rounded-2xl shadow-md">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black leading-tight">{selectedDoctor.name}
                      <span className="ml-2 sm:ml-3 inline-block mt-2 sm:mt-0 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] uppercase font-bold px-2 py-1 rounded-full">{selectedDoctor.potential} Potential</span>
                    </h3>
                    <p className="text-blue-200 text-sm mt-1">{selectedDoctor.spec} · {selectedDoctor.clinic}</p>
                    <p className="text-xs text-slate-300 mt-2">📍 {selectedDoctor.loc} · {selectedDoctor.dist}</p>
                  </div>
                  <div className="text-xs text-blue-200">
                    {doctorProfile?.doctor.patches.length ? doctorProfile.doctor.patches.map((item) => item.name).join(" · ") : "Patch membership unavailable"}
                  </div>
                </div>
              </div>

              {doctorProfileLoading && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500 shadow-sm">Loading persisted doctor activity…</div>
              )}

              {doctorProfileError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">{doctorProfileError}</div>
              )}

              <div className="grid xl:grid-cols-12 gap-5">
                <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex gap-5 border-b border-slate-100 pb-4 mb-5 overflow-x-auto">
                    {(["Overview", "Prescribing", "History", "Insights"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setDoctorProfileTab(tab)}
                        className={(doctorProfileTab === tab ? "text-blue-600 font-semibold border-b-2 border-blue-600" : "text-slate-500") + " pb-3 text-sm whitespace-nowrap"}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {doctorProfileTab === "Overview" && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          ["Potential Score", selectedDoctor.score + "/100"],
                          ["Completed Calls", String(doctorProfile?.activity.completedCalls ?? 0)],
                          ["Sample Units", String(doctorProfile?.activity.issuedSampleUnits ?? 0)],
                          ["Planned Visits", String(doctorProfile?.activity.plans ?? 0)]
                        ].map(([label, value]) => (
                          <div key={label} className="bg-slate-50 rounded-xl p-4">
                            <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
                            <div className="text-2xl font-black mt-1">{value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
                        <b>🎯 Next Best Action</b>
                        <p className="mt-1">No next-best-action rule is currently persisted. Use the recorded calls, samples and plan activity below for field execution.</p>
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-sm">Recent Call History</h4>
                          <button onClick={() => setSection("calls")} className="text-xs text-blue-600 font-bold">View all →</button>
                        </div>
                        {doctorProfile?.calls.slice(0, 3).map((call) => (
                          <div key={call.id} className="border border-slate-100 rounded-xl p-3 mb-2">
                            <div className="flex justify-between gap-3">
                              <span className="text-xs font-bold text-slate-800">{call.outcome || "No outcome recorded"}</span>
                              <span className="text-[10px] text-slate-400">{new Date(call.calledAt).toLocaleDateString()}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{call.notes || "No notes recorded"}{call.product?.name ? " · " + call.product.name : ""}</div>
                          </div>
                        ))}
                        {!doctorProfileLoading && (doctorProfile?.calls.length ?? 0) === 0 && <p className="text-xs text-slate-400">No calls recorded for this doctor by the current user.</p>}
                      </div>
                    </>
                  )}

                  {doctorProfileTab === "Prescribing" && (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                        <b>Prototype-source analytics</b>
                        <p className="mt-1">The following writing-pattern data comes from the supplied prototype and is not doctor-specific. It must not be interpreted as this doctor's prescribing history.</p>
                      </div>
                      {doctorProfile?.writingPattern ? (
                        <>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="border border-slate-100 rounded-xl p-4">
                              <h4 className="font-bold text-sm mb-3">Categories — {doctorProfile.writingPattern.period}</h4>
                              <div className="space-y-2 text-xs">
                                {doctorProfile.writingPattern.categories.map(([name, share]) => (
                                  <div key={name} className="flex justify-between border-b border-slate-100 py-1"><span>{name}</span><b>{share}%</b></div>
                                ))}
                              </div>
                            </div>
                            <div className="border border-slate-100 rounded-xl p-4">
                              <h4 className="font-bold text-sm mb-3">Top Molecules</h4>
                              <div className="space-y-2 text-xs">
                                {doctorProfile.writingPattern.molecules.map(([name, share]) => (
                                  <div key={name} className="flex justify-between border-b border-slate-100 py-1"><span>{name}</span><b>{share}</b></div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-900">{doctorProfile.writingPattern.insight}</div>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">No prototype writing-pattern snapshot is available.</p>
                      )}
                    </div>
                  )}

                  {doctorProfileTab === "History" && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="font-bold text-sm mb-3">Calls</h4>
                        {doctorProfile?.calls.map((call) => (
                          <div key={call.id} className="border border-slate-100 rounded-xl p-3 mb-2 text-xs">
                            <div className="flex justify-between"><b>{call.status}</b><span className="text-slate-400">{new Date(call.calledAt).toLocaleString()}</span></div>
                            <div className="text-slate-600 mt-1">{call.outcome || "No outcome recorded"}{call.product?.name ? " · " + call.product.name : ""}</div>
                            {call.notes && <div className="text-slate-500 mt-1">{call.notes}</div>}
                          </div>
                        ))}
                        {!doctorProfileLoading && (doctorProfile?.calls.length ?? 0) === 0 && <p className="text-xs text-slate-400">No call history recorded.</p>}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm mb-3">Samples</h4>
                        {doctorProfile?.samples.map((sample) => (
                          <div key={sample.id} className="border border-slate-100 rounded-xl p-3 mb-2 text-xs flex justify-between gap-3">
                            <div><b>{sample.product?.name || "Product not recorded"}</b><div className="text-slate-500 mt-1">{sample.quantity} units · {sample.status}</div></div>
                            <span className="text-slate-400">{new Date(sample.issuedAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                        {!doctorProfileLoading && (doctorProfile?.samples.length ?? 0) === 0 && <p className="text-xs text-slate-400">No sample issues recorded.</p>}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm mb-3">Plans</h4>
                        {doctorProfile?.plans.map((plan) => (
                          <div key={plan.id} className="border border-slate-100 rounded-xl p-3 mb-2 text-xs">
                            <div className="flex justify-between"><b>{plan.status}</b><span className="text-slate-400">{new Date(plan.plannedFor).toLocaleString()}</span></div>
                            <div className="text-slate-600 mt-1">{plan.priority} · {plan.objective || "Field visit"}</div>
                            {plan.notes && <div className="text-slate-500 mt-1">{plan.notes}</div>}
                          </div>
                        ))}
                        {!doctorProfileLoading && (doctorProfile?.plans.length ?? 0) === 0 && <p className="text-xs text-slate-400">No plans recorded.</p>}
                      </div>
                    </div>
                  )}

                  {doctorProfileTab === "Insights" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          ["Total Calls", String(doctorProfile?.activity.totalCalls ?? 0)],
                          ["Sample Issues", String(doctorProfile?.activity.sampleIssues ?? 0)],
                          ["Issued Units", String(doctorProfile?.activity.issuedSampleUnits ?? 0)]
                        ].map(([label, value]) => (
                          <div key={label} className="bg-slate-50 rounded-xl p-4">
                            <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
                            <div className="text-2xl font-black mt-1">{value}</div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
                        <b>Persisted activity signal</b>
                        <p className="mt-1">{doctorProfile?.activity.lastActivity ? "Last recorded activity: " + new Date(doctorProfile.activity.lastActivity).toLocaleString() + "." : "No persisted activity is available for this doctor."}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
                        Conversion, doctor availability and doctor-to-chemist relationships are not modeled in the current database, so no live claim is displayed for them.
                      </div>
                    </div>
                  )}
                </div>

                <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold">Doctor Availability</h3>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold">Not tracked</span>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-xl mt-4">
                    <div className="text-xs uppercase text-blue-700 font-bold">Best Time to Visit</div>
                    <div className="text-base font-black text-blue-900 mt-1">Not available</div>
                    <div className="text-xs text-blue-700">Schedule data is not persisted yet.</div>
                  </div>
                  <div className="border-t border-slate-100 mt-4 pt-4">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Primary Chemist Link</h4>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-500">Stockist relationships are available in Stockist Data; a doctor-to-chemist relationship is not currently modeled.</div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {section === "ai" && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">AI Support</h2>
                  <p className="text-sm text-slate-500">Ask about doctors, products, stockists, activity, and field planning.</p>
                </div>
                <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-3 py-1.5 rounded-xl border border-blue-100">
                  Data-grounded
                </span>
              </div>

              <div className="grid xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <div className="font-bold">MR 3.0 Assistant</div>
                    <div className="text-xs text-slate-500 mt-1">Answers are restricted to authenticated MR 3.0 operational data.</div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-3 max-h-[520px] overflow-y-auto">
                    {aiMessages.map((message, index) => (
                      <div key={index} className={"flex " + (message.role === "user" ? "justify-end" : "justify-start")}>
                        <div className={
                          message.role === "user"
                            ? "max-w-[88%] rounded-2xl rounded-br-md bg-blue-600 text-white px-4 py-3 text-sm leading-6"
                            : "max-w-[88%] rounded-2xl rounded-bl-md bg-slate-100 text-slate-800 px-4 py-3 text-sm leading-6"
                        }>
                          {message.content}
                        </div>
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex justify-start">
                        <div className="rounded-2xl rounded-bl-md bg-slate-100 text-slate-500 px-4 py-3 text-sm">
                          Thinking…
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-4 sm:px-5 py-4 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[
                        "Which doctors should I prioritize?",
                        "Show low-stock products.",
                        "Summarize my recent activity.",
                        "What should I prepare for my next visit?"
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          disabled={aiLoading}
                          onClick={() => askAi(prompt)}
                          className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 disabled:opacity-50 px-3 py-2 rounded-xl"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        askAi();
                      }}
                      className="flex items-end gap-2"
                    >
                      <textarea
                        value={aiInput}
                        onChange={(event) => setAiInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            askAi();
                          }
                        }}
                        rows={2}
                        maxLength={1200}
                        disabled={aiLoading}
                        placeholder="Ask a field question…"
                        className="flex-1 resize-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400"
                      />
                      <button
                        type="submit"
                        disabled={aiLoading || !aiInput.trim()}
                        className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-3 rounded-xl"
                      >
                        {aiLoading ? "…" : "Ask"}
                      </button>
                    </form>
                    <div className="text-[10px] text-slate-400 mt-2">Enter to send · Shift+Enter for a new line · 1,200 character limit</div>
                  </div>
                </div>

                <div className="xl:col-span-4 space-y-5">
                  <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold">What AI can use</h3>
                    <div className="mt-4 space-y-2 text-xs">
                      {[
                        "Authenticated doctor and territory data",
                        "Products and molecule information",
                        "Stockist inventory",
                        "Calls, samples, and visit plans"
                      ].map((item) => (
                        <div key={item} className="bg-white/10 rounded-xl p-3.5">{item}</div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operational guardrails</h4>
                    <div className="mt-3 space-y-2 text-xs text-slate-600">
                      <div>• No invented operational facts.</div>
                      <div>• AI responses are grounded in supplied MR 3.0 data.</div>
                      <div>• Clinical diagnosis and prescribing are out of scope.</div>
                      <div>• AI requests are rate-limited and audited server-side.</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {section === "stockist" && <StockistPanel />}

          {section === "calls" && (
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div><h2 className="text-2xl font-black text-slate-900">My Calls</h2><p className="text-sm text-slate-500">Recent field activity recorded in MR 3.0</p></div>
                <div className="flex items-center gap-2">
                  <select value={callFilter} onChange={async (e) => {
                    const next=e.target.value; setCallFilter(next); setCallsLoading(true);
                    try { const r=await fetch("/api/calls?limit=100"+(next!=="ALL"?"&status="+next:""),{cache:"no-store"}); const d=await r.json(); setCallHistory(d.calls||[]); } finally { setCallsLoading(false); }
                  }} className="text-xs font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl">
                    <option value="ALL">All statuses</option><option value="COMPLETED">Completed</option><option value="PLANNED">Planned</option><option value="MISSED">Missed</option><option value="CANCELLED">Cancelled</option>
                  </select>
                  <button onClick={async()=>{setCallsLoading(true);try{const r=await fetch("/api/calls?limit=100"+(callFilter!=="ALL"?"&status="+callFilter:""),{cache:"no-store"});const d=await r.json();setCallHistory(d.calls||[])}finally{setCallsLoading(false)}}} className="bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl">↻ Refresh</button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[["Total Calls",callHistory.length],["Completed",callHistory.filter(c=>c.status==="COMPLETED").length],["Follow-ups",callHistory.filter(c=>/follow-up/i.test(c.outcome)).length],["Doctors Covered",new Set(callHistory.map(c=>c.doctorName)).size]].map(([label,value])=><div key={String(label)} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"><div className="text-xs uppercase tracking-wider font-semibold text-slate-400">{label}</div><div className="text-2xl font-black mt-1">{value}</div></div>)}
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold">Call History</h3><p className="text-xs text-slate-500 mt-1">Every saved call is persisted and auditable.</p></div>
                {callsLoading ? <div className="p-10 text-center text-sm text-slate-500">Loading call history…</div> :
                  callHistory.length===0 ? <div className="p-10 text-center text-sm text-slate-500">No calls found. Log a call from a doctor profile to get started.</div> :
                  <div>
                    <div className="mr-desktop-table overflow-x-auto"><table className="mr-responsive-table w-full text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Doctor</th><th className="p-3">Product</th><th className="p-3">Outcome</th><th className="p-3">Notes</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead><tbody className="divide-y divide-slate-100">{callHistory.map(call=><tr key={call.id} className="hover:bg-slate-50"><td className="p-3"><b>{call.doctorName}</b><div className="text-xs text-slate-500">{call.specialty}</div></td><td className="p-3 text-slate-600">{call.productName||"—"}</td><td className="p-3 text-slate-700">{call.outcome}</td><td className="p-3 text-slate-500 max-w-xs">{call.notes||"—"}</td><td className="p-3"><span className={(call.status==="COMPLETED"?"bg-emerald-100 text-emerald-800":"bg-amber-100 text-amber-800")+" text-xs font-bold px-2 py-1 rounded-full"}>{call.status}</span></td><td className="p-3 whitespace-nowrap text-xs text-slate-500">{new Date(call.calledAt).toLocaleString()}</td></tr>)}</tbody></table></div>
                    <div className="mr-mobile-record-cards">{callHistory.map(call=><article key={call.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-black text-slate-900 truncate">{call.doctorName}</div><div className="text-xs text-slate-500 mt-1">{call.specialty}</div></div><span className={(call.status==="COMPLETED"?"bg-emerald-100 text-emerald-800":"bg-amber-100 text-amber-800")+" shrink-0 text-[11px] font-black px-2.5 py-1 rounded-lg"}>{call.status}</span></div><div className="mt-3 space-y-2 text-xs"><div><span className="text-slate-400">Product</span><div className="font-semibold text-slate-700">{call.productName||"—"}</div></div><div><span className="text-slate-400">Outcome</span><div className="font-semibold text-slate-700">{call.outcome||"—"}</div></div><div><span className="text-slate-400">Notes</span><div className="text-slate-600">{call.notes||"—"}</div></div></div><div className="mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-500">{new Date(call.calledAt).toLocaleString()}</div></article>)}</div>
                  </div>}
              </div>
            </section>
          )}

          {section === "plan" && (
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4"><div><h2 className="text-2xl font-black text-slate-900">My Plan</h2><p className="text-sm text-slate-500">Planned doctor visits and field priorities</p></div><div className="flex items-center gap-2"><span className="text-xs bg-blue-50 text-blue-700 font-semibold px-3 py-2 rounded-xl">{plans.filter(p => p.status === "PLANNED").length} planned visits</span><button onClick={() => setSection("explorer")} className="bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl">＋ Add Doctor</button></div></div>
              {planMessage && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold px-4 py-3 rounded-xl">{planMessage}</div>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[["Planned",plans.filter(p=>p.status==="PLANNED").length],["Completed",plans.filter(p=>p.status==="COMPLETED").length],["High Priority",plans.filter(p=>p.priority==="HIGH"||p.priority==="URGENT").length],["Doctors",new Set(plans.map(p=>p.doctorId)).size]].map(([label,value])=><div key={String(label)} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"><div className="text-xs uppercase tracking-wider font-semibold text-slate-400">{label}</div><div className="text-2xl font-black mt-1">{value}</div></div>)}</div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"><div><h3 className="font-bold">Visit Plan</h3><p className="text-xs text-slate-500 mt-1">Each visit is persisted and auditable.</p></div><button onClick={()=>{setPlansLoading(true);fetch("/api/plans",{cache:"no-store"}).then(r=>r.json()).then(d=>setPlans(d.plans||[])).finally(()=>setPlansLoading(false));}} className="text-xs text-blue-600 font-bold">↻ Refresh</button></div>
              {plansLoading?<div className="p-10 text-center text-sm text-slate-500">Loading your plan…</div>:plans.length===0?<div className="p-10 text-center text-sm text-slate-500">No visits planned yet. Add a doctor from Doctor Potential.</div>:<div className="divide-y divide-slate-100">{plans.map(plan=><div key={plan.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50"><div className="flex items-start gap-4"><div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">{new Date(plan.plannedFor).getDate()}</div><div><div className="flex items-center gap-2"><button onClick={()=>{const d=doctors.find(x=>x.id===plan.doctorId);if(d){setSelected(d);setSection("potential");}}} className="font-bold text-slate-900 hover:text-blue-600">{plan.doctorName}</button><span className={(plan.priority==="URGENT"?"bg-red-100 text-red-800":plan.priority==="HIGH"?"bg-orange-100 text-orange-800":"bg-slate-100 text-slate-700")+" text-[10px] font-bold px-2 py-1 rounded-full"}>{plan.priority}</span></div><div className="text-xs text-slate-500 mt-1">{plan.specialty} · {plan.clinic} · {plan.location}</div><div className="text-xs text-slate-700 mt-2"><b>{new Date(plan.plannedFor).toLocaleDateString()}</b> at <b>{new Date(plan.plannedFor).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</b> · {plan.objective||"Field visit"}</div>{plan.notes&&<div className="text-xs text-slate-500 mt-1">{plan.notes}</div>}</div></div><div className="flex items-center gap-2"><span className={(plan.status==="COMPLETED"?"bg-emerald-100 text-emerald-800":plan.status==="CANCELLED"?"bg-slate-100 text-slate-600":plan.status==="MISSED"?"bg-red-100 text-red-800":"bg-blue-100 text-blue-800")+" text-xs font-bold px-2.5 py-1.5 rounded-lg"}>{plan.status}</span>{plan.status==="PLANNED"&&<><button onClick={()=>updatePlanStatus(plan.id,"COMPLETED")} className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">Complete</button><button onClick={()=>updatePlanStatus(plan.id,"CANCELLED")} className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-2 rounded-lg">Cancel</button></>}</div></div>)}</div>}</div>
            </section>
          )}

          {section === "samples" && (
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4"><div><h2 className="text-2xl font-black text-slate-900">Samples</h2><p className="text-sm text-slate-500">Track product samples issued to doctors</p></div><div className="flex gap-2"><select value={sampleFilter} onChange={e=>setSampleFilter(e.target.value)} className="text-xs font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl"><option value="ALL">All statuses</option><option value="ISSUED">Issued</option><option value="RETURNED">Returned</option><option value="CANCELLED">Cancelled</option></select><button onClick={()=>setSection("explorer")} className="bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl">＋ Issue Sample</button></div></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[["Issued",samples.filter(s=>s.status==="ISSUED").length],["Units Issued",samples.filter(s=>s.status==="ISSUED").reduce((n,s)=>n+s.quantity,0)],["Returned",samples.filter(s=>s.status==="RETURNED").length],["Doctors",new Set(samples.map(s=>s.doctorId)).size]].map(([label,value])=><div key={String(label)} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"><div className="text-xs uppercase tracking-wider font-semibold text-slate-400">{label}</div><div className="text-2xl font-black mt-1">{value}</div></div>)}</div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"><div><h3 className="font-bold">Sample Issues</h3><p className="text-xs text-slate-500 mt-1">Every issue is persisted and auditable.</p></div><button onClick={()=>setSampleFilter(sampleFilter)} className="text-xs text-blue-600 font-bold">↻ Refresh</button></div>
              {samplesLoading?<div className="p-10 text-center text-sm text-slate-500">Loading sample history…</div>:samples.length===0?<div className="p-10 text-center text-sm text-slate-500">No sample issues found.</div>:<><div className="mr-desktop-table overflow-x-auto"><table className="mr-responsive-table w-full text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Doctor</th><th className="p-3">Product</th><th className="p-3">Quantity</th><th className="p-3">Status</th><th className="p-3">Issued</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{samples.map(sample=><tr key={sample.id} className="hover:bg-slate-50"><td className="p-3"><b>{sample.doctorName}</b><div className="text-xs text-slate-500">{sample.specialty}</div></td><td className="p-3"><b>{sample.productName}</b><div className="text-xs text-slate-500">{sample.molecule}</div></td><td className="p-3 font-mono">{sample.quantity}</td><td className="p-3"><span className={(sample.status==="ISSUED"?"bg-blue-100 text-blue-800":sample.status==="RETURNED"?"bg-emerald-100 text-emerald-800":"bg-slate-100 text-slate-700")+" text-xs font-bold px-2 py-1 rounded-full"}>{sample.status}</span></td><td className="p-3 whitespace-nowrap text-xs text-slate-500">{new Date(sample.issuedAt).toLocaleString()}</td><td className="p-3">{sample.status==="ISSUED"&&<><button onClick={()=>updateSampleStatus(sample.id,"RETURNED")} className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg mr-1">Return</button><button onClick={()=>updateSampleStatus(sample.id,"CANCELLED")} className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg">Cancel</button></>}</td></tr>)}</tbody></table></div>
              <div className="mr-mobile-record-cards">{samples.map(sample=><article key={sample.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-black text-slate-900 truncate">{sample.doctorName}</div><div className="text-xs text-slate-500 mt-1">{sample.specialty}</div></div><span className={(sample.status==="ISSUED"?"bg-blue-100 text-blue-800":sample.status==="RETURNED"?"bg-emerald-100 text-emerald-800":"bg-slate-100 text-slate-700")+" shrink-0 text-[11px] font-black px-2.5 py-1 rounded-lg"}>{sample.status}</span></div><div className="mt-3 flex items-center justify-between gap-3"><div className="min-w-0"><div className="font-bold text-slate-800 truncate">{sample.productName}</div><div className="text-xs text-slate-500">{sample.molecule}</div></div><div className="shrink-0 text-right"><div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Qty</div><div className="font-mono font-black text-slate-900">{sample.quantity}</div></div></div><div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between gap-3"><span className="text-[11px] text-slate-500">{new Date(sample.issuedAt).toLocaleDateString()}</span>{sample.status==="ISSUED"&&<div className="flex gap-2"><button onClick={()=>updateSampleStatus(sample.id,"RETURNED")} className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">Return</button><button onClick={()=>updateSampleStatus(sample.id,"CANCELLED")} className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-2 rounded-lg">Cancel</button></div>}</div></article>)}</div></>}
              </div>
            </section>
          )}


          {section === "targets" && (
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Targets</h2>
                  <p className="text-sm text-slate-500">Set field targets and track progress from persisted activity.</p>
                </div>
                <div className="flex flex-wrap gap-2 items-end">
                  <label className="text-[11px] font-bold text-slate-500">From<input type="date" value={targetPeriodStart} onChange={e=>setTargetPeriodStart(e.target.value)} className="mt-1 block text-xs font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl"/></label>
                  <label className="text-[11px] font-bold text-slate-500">To<input type="date" value={targetPeriodEnd} onChange={e=>setTargetPeriodEnd(e.target.value)} className="mt-1 block text-xs font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl"/></label>
                </div>
              </div>

              {targetsLoading ? <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500 shadow-sm">Loading target performance…</div> : targetData && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      ["Completed Calls", targetData.actual.completedCalls, targetData.target?.targetCalls ?? 0, "targetCalls"],
                      ["Sample Units", targetData.actual.sampleUnits, targetData.target?.targetSamples ?? 0, "targetSamples"],
                      ["Conversions", targetData.actual.conversions, targetData.target?.targetConversions ?? 0, "targetConversions"]
                    ].map(([label, actual, target, field]) => {
                      const actualNumber = typeof actual === "number" ? actual : 0;
                      const targetNumber = Number(target);
                      const progress = targetNumber > 0 ? Math.min(100, Math.round(actualNumber / targetNumber * 100)) : 0;
                      return <div key={String(field)} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">{label}</div>
                          <div className="text-xs font-bold text-slate-500">{targetNumber > 0 ? progress + "%" : "Not set"}</div>
                        </div>
                        <div className="text-2xl font-black mt-2">{typeof actual === "number" ? actual : "—"} <span className="text-sm font-semibold text-slate-400">/ {targetNumber}</span></div>
                        <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-600 rounded-full" style={{width: progress + "%"}} /></div>
                        {field === "targetConversions" && <div className="text-[11px] text-slate-400 mt-2">Conversion tracking is not yet modeled.</div>}
                      </div>;
                    })}
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div><h3 className="font-bold">Target Configuration</h3><p className="text-xs text-slate-500 mt-1">{targetPeriodStart} to {targetPeriodEnd}</p></div>
                      {targetMessage && <span className="text-xs font-semibold text-emerald-700">{targetMessage}</span>}
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        ["Call Target", "targetCalls"],
                        ["Sample Unit Target", "targetSamples"],
                        ["Conversion Target", "targetConversions"]
                      ].map(([label, field]) => <label key={field} className="text-xs font-bold text-slate-600">{label}
                        <input type="number" min={0} value={targetData.target?.[field as "targetCalls" | "targetSamples" | "targetConversions"] ?? 0}
                          onChange={e=>updateTargetValue(field as "targetCalls" | "targetSamples" | "targetConversions", Number(e.target.value))}
                          className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"/>
                      </label>)}
                    </div>
                    <div className="px-5 pb-5 flex justify-end">
                      <button disabled={targetSaving} onClick={saveTarget} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl">{targetSaving ? "Saving…" : "Save Targets"}</button>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {section === "reports" && (
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div><h2 className="text-2xl font-black text-slate-900">Reports</h2><p className="text-sm text-slate-500">Performance summary calculated from persisted MR 3.0 activity.</p></div>
                <div className="flex flex-wrap gap-2 items-end">
                  <label className="text-[11px] font-bold text-slate-500">From<input type="date" value={reportPeriodStart} onChange={e=>setReportPeriodStart(e.target.value)} className="mt-1 block text-xs font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl"/></label>
                  <label className="text-[11px] font-bold text-slate-500">To<input type="date" value={reportPeriodEnd} onChange={e=>setReportPeriodEnd(e.target.value)} className="mt-1 block text-xs font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl"/></label>
                </div>
              </div>
              {reportMessage && <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-3 rounded-xl">{reportMessage}</div>}
              {reportsLoading ? <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500 shadow-sm">Generating report…</div> : reportData && <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    ["Completed Calls", reportData.calls.completed],
                    ["Sample Units", reportData.samples.unitsIssued],
                    ["Planned Visits", reportData.plans.planned],
                    ["Completed Visits", reportData.plans.completed]
                  ].map(([label,value])=><div key={String(label)} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><div className="text-xs uppercase tracking-wider font-semibold text-slate-400">{label}</div><div className="text-2xl font-black mt-1">{value}</div></div>)}
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold">Call Activity</h3><p className="text-xs text-slate-500 mt-1">{reportData.period.start} to {reportData.period.end}</p></div>
                    <div className="p-5 grid grid-cols-2 gap-3">{[
                      ["Total",reportData.calls.total],["Completed",reportData.calls.completed],["Planned",reportData.calls.planned],["Missed",reportData.calls.missed],["Cancelled",reportData.calls.cancelled]
                    ].map(([label,value])=><div key={String(label)} className="bg-slate-50 rounded-xl p-3"><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-black mt-1">{value}</div></div>)}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold">Sample & Plan Activity</h3></div>
                    <div className="p-5 grid grid-cols-2 gap-3">
                      {[["Sample Issues",reportData.samples.issues],["Units Issued",reportData.samples.unitsIssued],["Plans",reportData.plans.total],["Plans Completed",reportData.plans.completed]].map(([label,value])=><div key={String(label)} className="bg-slate-50 rounded-xl p-3"><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-black mt-1">{value}</div></div>)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold">Top Doctors by Completed Calls</h3></div>
                    <div className="divide-y divide-slate-100">{reportData.topDoctors.length===0?<div className="p-6 text-sm text-slate-500">No completed calls in this period.</div>:reportData.topDoctors.map((doctor,index)=><div key={doctor.doctorId} className="p-4 flex items-center justify-between"><div><span className="text-xs font-black text-slate-400 mr-3">#{index+1}</span><span className="font-bold">{doctor.doctorName}</span><div className="text-xs text-slate-500 ml-7">{doctor.specialty}</div></div><span className="text-sm font-black text-blue-700">{doctor.completedCalls}</span></div>)}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold">Top Products by Sample Units</h3></div>
                    <div className="divide-y divide-slate-100">{reportData.topProducts.length===0?<div className="p-6 text-sm text-slate-500">No issued samples in this period.</div>:reportData.topProducts.map((product,index)=><div key={product.productId ?? String(index)} className="p-4 flex items-center justify-between"><div><span className="text-xs font-black text-slate-400 mr-3">#{index+1}</span><span className="font-bold">{product.productName}</span>{product.molecule&&<div className="text-xs text-slate-500 ml-7">{product.molecule}</div>}</div><span className="text-sm font-black text-blue-700">{product.unitsIssued}</span></div>)}</div>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900"><b>Data note:</b> {reportData.conversionTracking.message}</div>
              </>}
            </section>
          )}

          {section === "notifications" && (
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div><h2 className="text-2xl font-black text-slate-900">Notifications</h2><p className="text-sm text-slate-500">Activity updates generated from your MR 3.0 workflows.</p></div>
                {unreadNotifications > 0 && <button onClick={markAllNotificationsRead} className="text-xs font-bold text-blue-700 bg-blue-50 px-4 py-2.5 rounded-xl">Mark all as read</button>}
              </div>
              {notificationsLoading ? <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">Loading notifications…</div> : notifications.length===0 ? <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500 shadow-sm">No notifications yet. Actions such as logging a call, planning a visit or issuing samples will appear here.</div> : <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                {notifications.map(notification=><button key={notification.id} onClick={()=>markNotificationRead(notification)} className={"w-full text-left p-5 hover:bg-slate-50 flex items-start gap-4 "+(notification.isRead?"":"bg-blue-50/40")}>
                  <div className={"w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black "+(notification.isRead?"bg-slate-100 text-slate-500":"bg-blue-100 text-blue-700")}>◉</div>
                  <div className="flex-1 min-w-0"><div className="flex items-center justify-between gap-3"><span className="font-bold text-slate-900">{notification.title}</span><span className="text-[11px] text-slate-400 whitespace-nowrap">{new Date(notification.createdAt).toLocaleString()}</span></div><p className="text-sm text-slate-600 mt-1">{notification.message}</p>{!notification.isRead&&<span className="inline-block mt-2 text-[10px] font-black uppercase tracking-wider text-blue-700">Unread</span>}</div>
                </button>)}
              </div>}
            </section>
          )}

          {!["explorer","potential","ai","stockist","calls","plan","samples","targets","reports","notifications"].includes(section) && (
            <section className="space-y-4"><h2 className="text-2xl font-black text-slate-900">{execution.find(x => x[0] === section)?.[2]}</h2><p className="text-sm text-slate-500">Module boundary established; persistent workflow is next.</p><div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">This module is intentionally being connected to the production data model instead of remaining an alert placeholder.</div></section>
          )}

          {planOpen && selectedDoctor && (
            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between"><div><h3 className="font-black text-slate-900">Add to My Plan</h3><p className="text-xs text-slate-500 mt-1">{selectedDoctor.name} · {selectedDoctor.clinic}</p></div><button onClick={()=>setPlanOpen(false)} className="text-slate-400 hover:text-slate-700 text-xl">×</button></div>
              <div className="p-5 space-y-4"><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-600">Visit Date<input type="date" value={planDate} onChange={e=>setPlanDate(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"/></label><label className="text-xs font-bold text-slate-600">Visit Time<input type="time" value={planTime} onChange={e=>setPlanTime(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"/></label></div><label className="block text-xs font-bold text-slate-600">Priority<select value={planPriority} onChange={e=>setPlanPriority(e.target.value as Plan["priority"])} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></label><label className="block text-xs font-bold text-slate-600">Visit Objective<input value={planObjective} onChange={e=>setPlanObjective(e.target.value)} maxLength={500} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" placeholder="What should this visit achieve?"/></label><label className="block text-xs font-bold text-slate-600">Notes<textarea value={planNotes} onChange={e=>setPlanNotes(e.target.value)} maxLength={5000} rows={3} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none" placeholder="Optional preparation notes"/></label>{planMessage&&<div className="text-xs font-semibold text-red-600">{planMessage}</div>}</div>
              <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2"><button onClick={()=>setPlanOpen(false)} className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button><button disabled={planSaving} onClick={savePlan} className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl">{planSaving?"Saving…":"Add to Plan"}</button></div>
            </div></div>
          )}

          {sampleOpen && selectedDoctor && (
            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between"><div><h3 className="font-black text-slate-900">Issue Samples</h3><p className="text-xs text-slate-500 mt-1">{selectedDoctor.name} · {selectedDoctor.clinic}</p></div><button onClick={()=>setSampleOpen(false)} className="text-slate-400 text-xl">×</button></div>
              <div className="p-5 space-y-4"><label className="block text-xs font-bold text-slate-600">Product<select value={sampleProductId} onChange={e=>setSampleProductId(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"><option value="">Select product</option>{products.map(product=><option key={product.id} value={product.id}>{product.name}{product.molecule?" · "+product.molecule:""}</option>)}</select></label><label className="block text-xs font-bold text-slate-600">Quantity<input type="number" min={1} max={1000} value={sampleQuantity} onChange={e=>setSampleQuantity(Math.max(1,Math.min(1000,Number(e.target.value)||1)))} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"/></label>{sampleMessage&&<div className="text-xs font-semibold text-red-600">{sampleMessage}</div>}</div>
              <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2"><button onClick={()=>setSampleOpen(false)} className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button><button disabled={sampleSaving||!sampleProductId} onClick={saveSample} className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 disabled:opacity-50 rounded-xl">{sampleSaving?"Saving…":"Issue Samples"}</button></div>
            </div></div>
          )}

          <footer className="mt-8 bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm"><div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-600"><span>Doctors: <b className="text-slate-900">{dashboardSummary?.doctors ?? "—"}</b></span><span>High Potential: <b className="text-emerald-600">{dashboardSummary ? dashboardSummary.highPotential + " (" + dashboardSummary.highPotentialPercent + "%)" : "—"}</b></span><span>Your Calls: <b className="text-slate-900">{dashboardSummary?.calls ?? "—"}</b></span><span>Your Sample Units: <b className="text-slate-900">{dashboardSummary?.sampleUnits ?? "—"}</b></span><span>Conversion Rate: <b className="text-blue-600">{dashboardSummary?.conversionRate == null ? "Not tracked" : dashboardSummary.conversionRate + "%"}</b></span><span>Top Specialty: <b className="text-slate-900">{dashboardSummary?.topSpecialty ? dashboardSummary.topSpecialty + " (" + dashboardSummary.topSpecialtyCount + ")" : "—"}</b></span><span>Top Molecule: <b className="text-slate-900">{dashboardSummary?.topMolecule ?? "—"}</b></span></div><button onClick={() => navigate("plan")} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl">Go to My Plan →</button></footer>
        </div>
      </main>
    </div>
  );
}
