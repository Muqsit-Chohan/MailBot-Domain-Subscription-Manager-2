import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useTheme } from '../context/ThemeContext';
import {
  Globe, Server, Shield, Mail, Layers, BarChart3,
  Clock, CheckCircle, ArrowRight, Star, ChevronDown,
  Activity, Lock, RefreshCw, Sparkles, Users, TrendingUp,
  Cpu, HardDrive, BellRing, Database, Sun, Moon
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

function FadeIn({ children, delay = 0, direction = 'up', className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const variants = {
    hidden: {
      opacity: 0,
      y: direction === 'up' ? 35 : direction === 'down' ? -35 : 0,
      x: direction === 'left' ? 35 : direction === 'right' ? -35 : 0,
    },
    visible: { opacity: 1, y: 0, x: 0, transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] } },
  };
  return (
    <motion.div ref={ref} variants={variants} initial="hidden" animate={inView ? 'visible' : 'hidden'} className={className}>
      {children}
    </motion.div>
  );
}

function Counter({ end, suffix = '', duration = 2 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: end, duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = Math.round(obj.val).toLocaleString() + suffix;
      },
    });
  }, [inView, end, duration, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

const trackingCategories = [
  {
    icon: Globe,
    title: 'Domains (Primary)',
    desc: 'Track registrar details, nameservers, whois info, and expiry countdowns for .com, .io, .space, .net, and any TLD.',
    badge: 'Core Focus',
    color: 'indigo'
  },
  {
    icon: Server,
    title: 'Web & Cloud Hosting',
    desc: 'Monitor VPS servers, shared hosting (Hostinger, Bluehost, cPanel), AWS, DigitalOcean, and dedicated servers.',
    badge: 'Infrastructure',
    color: 'sky'
  },
  {
    icon: Shield,
    title: 'SSL / TLS Certificates',
    desc: "Auto-detect Let's Encrypt, Sectigo, DigiCert certificates and renewal dates to avoid browser security warnings.",
    badge: 'Security',
    color: 'emerald'
  },
  {
    icon: Mail,
    title: 'Business Email & Workspace',
    desc: 'Keep track of Google Workspace, Microsoft 365, Zoho Mail, and transactional SMTP subscription renewal terms.',
    badge: 'Communication',
    color: 'violet'
  },
  {
    icon: Layers,
    title: 'SaaS & Software Tools',
    desc: 'Centralize recurring billing for Figma, GitHub, Adobe Creative Cloud, plugins, and agency tool subscriptions.',
    badge: 'SaaS Billing',
    color: 'amber'
  },
  {
    icon: Database,
    title: 'Database & API Addons',
    desc: 'Track cloud databases (MongoDB Atlas, Supabase), Redis clusters, CDN services (Cloudflare), and custom APIs.',
    badge: 'Cloud Services',
    color: 'rose'
  },
];

const features = [
  { icon: Globe, title: 'Centralized Asset Hub', desc: 'Manage all digital assets across 50+ clients from a single high-speed dashboard.', color: 'indigo' },
  { icon: BellRing, title: 'Smart Expiry Reminders', desc: 'Customizable multi-tier email alerts (30d, 15d, 7d, 3d, 1d) triggered before renewal deadlines.', color: 'violet' },
  { icon: Shield, title: 'Zero-Downtime SSL Shield', desc: 'Real-time HTTPS certificate checking so client sites never trigger scary privacy errors.', color: 'emerald' },
  { icon: Mail, title: 'Custom Handlebars Templates', desc: 'Send branded, client-specific renewal invoices and reminders with auto-injected dynamic variables.', color: 'sky' },
  { icon: BarChart3, title: 'Cost Forecasting & Analytics', desc: 'Monthly recurring burn rate, annual spend projections, and categorized cost breakdowns.', color: 'amber' },
  { icon: Clock, title: 'Autonomous Cron Engine', desc: 'Runs daily at 8:00 AM UTC in the background to audit renewal dates and dispatch alerts automatically.', color: 'rose' },
];

const stats = [
  { label: 'Domains & Assets Tracked', value: 15000, suffix: '+' },
  { label: 'Renewal Alerts Dispatched', value: 65000, suffix: '+' },
  { label: 'Outages Prevented', value: 3200, suffix: '+' },
  { label: 'System Uptime', value: 99.9, suffix: '%' },
];

const steps = [
  { step: '01', title: 'Add Domains, Hosting & Assets', desc: 'Add domain names, hosting packages, SSL certificates, email licenses, or software tools with provider info and renewal cycle.' },
  { step: '02', title: 'Set Custom Alert Intervals', desc: 'Configure reminder timelines (e.g. 30 days before for domains, 7 days before for SSL) tailored to each asset and client.' },
  { step: '03', title: 'Automated Peace of Mind', desc: 'MailBot monitors expiry dates 24/7 and delivers automated email notifications directly to you and your clients.' },
];

const colorMap = {
  indigo:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-600 dark:text-indigo-400',  border: 'border-indigo-500/20'  },
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-600 dark:text-violet-400',  border: 'border-violet-500/20'  },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  sky:     { bg: 'bg-sky-500/10',     text: 'text-sky-600 dark:text-sky-400',     border: 'border-sky-500/20'     },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',   border: 'border-amber-500/20'   },
  rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-600 dark:text-rose-400',    border: 'border-rose-500/20'    },
};

function Navbar() {
  const { dark, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      animate={{
        top: scrolled ? 12 : 0,
        width: scrolled ? 'min(92vw, 80rem)' : '100%',
        borderRadius: scrolled ? 16 : 0,
      }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed left-1/2 -translate-x-1/2 z-50 border transition-[background-color,box-shadow,border-color,backdrop-filter] duration-700 ease-out will-change-[top,width,border-radius] ${
        scrolled
          ? 'bg-white/85 dark:bg-[#0a0a0a]/90 border-[#dde1e9] dark:border-white/[0.12] shadow-lg shadow-black/5 backdrop-blur-md dark:shadow-black/40'
          : 'bg-transparent border-transparent shadow-none backdrop-blur-0'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          className="flex items-center gap-1">
          <Link to="/" aria-label="MailBot home">
            <img src="/mailbotLogo.svg" alt="MailBot logo" className="w-9 h-9 object-contain" />
          </Link>
          <span className="font-bold text-[#111827] dark:text-white text-[17px] tracking-tight">MailBot</span>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="hidden md:flex items-center gap-7 text-sm text-[#4b5563] dark:text-white/55 font-medium">
          {[['What We Track', '#tracking'], ['Features', '#features'], ['How It Works', '#how'], ['Stats', '#stats']].map(([l, h]) => (
            <a key={l} href={h} className="hover:text-[#111827] dark:hover:text-white transition-colors duration-200">{l}</a>
          ))}
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggle}
            aria-label="Toggle Theme"
            className="p-2 rounded-xl border border-[#dde1e9] dark:border-white/10 bg-[#f0f2f5] dark:bg-[#141414] text-[#4b5563] dark:text-white/70 hover:text-[#111827] dark:hover:text-white transition-all shadow-sm"
          >
            {dark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-600" />}
          </button>
          <Link to="/login" className="text-sm text-[#4b5563] dark:text-white/60 hover:text-[#111827] dark:hover:text-white transition-colors px-3 py-2 font-medium">
            Sign In
          </Link>
          <Link to="/login" className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-[1.02]">
            Get Started
          </Link>
        </motion.div>
      </div>
    </motion.nav>
  );
}

function Orbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-500/15 dark:bg-indigo-600/20 blur-[120px]" />
      <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -top-20 -right-40 w-[500px] h-[500px] rounded-full bg-violet-500/15 dark:bg-violet-600/18 blur-[120px]" />
      <motion.div animate={{ scale: [1, 1.12, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-sky-500/10 dark:bg-sky-600/10 blur-[100px]" />
    </div>
  );
}

function HeroCard() {
  const items = [
    { type: 'Domain', name: 'arowai.space', provider: 'Hostinger UAB', days: '273d left', status: 'Active', ssl: '🔒 SSL Valid', cost: '$12/yr', icon: Globe, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10' },
    { type: 'Hosting', name: 'vps-node-01.de', provider: 'Hetzner Cloud 8GB', days: '18d left', status: 'Active', ssl: '⚡ 99.99%', cost: '$24/mo', icon: Server, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10' },
    { type: 'SSL Cert', name: '*.techflow.io', provider: 'Sectigo Wildcard', days: '7d left', status: 'Expiring', ssl: '⚠️ Needs Renewal', cost: '$49/yr', icon: Shield, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
    { type: 'Email', name: 'Google Workspace (10 seats)', provider: 'Google Cloud', days: '42d left', status: 'Active', ssl: '✉️ 10 Mailboxes', cost: '$60/mo', icon: Mail, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto max-w-xl mt-14">
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        className="bg-white dark:bg-[#141414] border border-[#dde1e9] dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/5 dark:shadow-black/80">
        
        {/* Top bar with live status lights */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#dde1e9] dark:border-white/[0.07] bg-[#f8f9fb] dark:bg-[#0f0f0f]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-xs text-[#6b7280] dark:text-white/40 font-mono">mailbot — live asset monitor</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Live Sync
          </div>
        </div>

        {/* Dashboard summary stats */}
        <div className="p-5 space-y-3.5">
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: 'Domains', val: '24', color: 'text-indigo-600 dark:text-indigo-400' },
              { label: 'Hosting', val: '8', color: 'text-sky-600 dark:text-sky-400' },
              { label: 'SSL Certs', val: '31', color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Expiring', val: '2', color: 'text-amber-600 dark:text-amber-400' },
            ].map((k, i) => (
              <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85 + i * 0.08 }}
                className="bg-[#f8f9fb] dark:bg-white/[0.03] border border-[#dde1e9] dark:border-white/[0.06] rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-[#6b7280] dark:text-white/40 mb-0.5">{k.label}</p>
                <p className={`text-base font-bold ${k.color}`}>{k.val}</p>
              </motion.div>
            ))}
          </div>

          {/* Multi-asset list */}
          <div className="space-y-2">
            {items.map((row, i) => {
              const Icon = row.icon;
              return (
                <motion.div key={row.name} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.1 }}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#f8f9fb] dark:bg-white/[0.025] border border-[#dde1e9] dark:border-white/[0.05] hover:bg-[#f0f2f5] dark:hover:bg-white/[0.05] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${row.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={14} className={row.color} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-[#111827] dark:text-white/90">{row.name}</p>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-200 dark:bg-white/5 text-[#4b5563] dark:text-white/50 border border-gray-300 dark:border-white/5 font-mono">{row.type}</span>
                      </div>
                      <p className="text-[10px] text-[#6b7280] dark:text-white/40">{row.provider} • <span className="text-[#374151] dark:text-white/60">{row.ssl}</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      row.status === 'Active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' :
                      'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'}`}>{row.days}</span>
                    <p className="text-[10px] text-[#6b7280] dark:text-white/40 mt-0.5">{row.cost}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Live notification pill */}
          <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2.5, repeat: Infinity }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-left">
            <BellRing size={13} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <p className="text-[11px] text-indigo-800 dark:text-indigo-300 flex-1 truncate">
              Alert: <span className="font-semibold text-[#111827] dark:text-white">*.techflow.io SSL</span> expires in 7 days — notification emailed.
            </p>
            <CheckCircle size={12} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          </motion.div>
        </div>
      </motion.div>
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-indigo-600/10 dark:bg-indigo-600/15 blur-2xl rounded-full" />
    </motion.div>
  );
}

export default function LandingPage() {
  const rootRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      gsap.utils.toArray('.step-card').forEach((card, i) => {
        gsap.fromTo(card,
          { opacity: 0, x: i % 2 === 0 ? -50 : 50 },
          { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none reverse' } }
        );
      });
      gsap.fromTo('.category-card',
        { opacity: 0, y: 40, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, stagger: 0.08, duration: 0.65, ease: 'power3.out',
          scrollTrigger: { trigger: '.categories-grid', start: 'top 82%' } }
      );
      gsap.fromTo('.feature-card',
        { opacity: 0, y: 40, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, stagger: 0.08, duration: 0.65, ease: 'power3.out',
          scrollTrigger: { trigger: '.features-grid', start: 'top 82%' } }
      );
      gsap.fromTo('.stat-item',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: 'power2.out',
          scrollTrigger: { trigger: '.stats-row', start: 'top 85%' } }
      );
    }, rootRef);

    return () => {
      lenis.destroy();
      ctx.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen bg-[#f0f2f5] dark:bg-[#0a0a0a] text-[#111827] dark:text-white overflow-x-hidden transition-colors duration-300">
      <Navbar />

      {/* ════════════ HERO ════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16">
        <Orbs />
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6 shadow-sm">
            <Sparkles size={12} /> All-in-One Asset & Subscription Manager
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6 text-[#111827] dark:text-white">
            Track <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 dark:from-indigo-400 dark:via-violet-400 dark:to-sky-400 bg-clip-text text-transparent">Domains</span>, Hosting, SSL & Subscriptions
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg md:text-xl text-[#4b5563] dark:text-white/50 max-w-2xl mx-auto mb-8 leading-relaxed">
            MailBot is the ultimate control center for developers and agencies. Track domain expiries, web hosting renewals, SSL certificates, business email, and SaaS licenses — with automated reminders before anything goes offline.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Link to="/login"
              className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-3.5 rounded-2xl font-semibold text-sm transition-all shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-100">
              Start Free Trial <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#tracking"
              className="flex items-center gap-2 text-sm text-[#4b5563] dark:text-white/50 hover:text-[#111827] dark:hover:text-white/80 px-5 py-3.5 rounded-2xl border border-[#dde1e9] dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20 bg-white/50 dark:bg-transparent transition-all">
              <Layers size={15} /> What We Track
            </a>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-5 text-xs text-[#6b7280] dark:text-white/30 font-medium">
            {['Domains & DNS Expiry', 'Hosting & Servers', 'SSL Certificate Shield', 'Email & SaaS Tools'].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle size={11} className="text-emerald-600 dark:text-emerald-500" /> {t}</span>
            ))}
          </motion.div>

          <HeroCard />
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-gray-400 dark:text-white/20">
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <ChevronDown size={22} />
          </motion.div>
        </motion.div>
      </section>

      {/* ════════════ STATS ════════════ */}
      <section id="stats" className="relative py-20 border-y border-[#dde1e9] dark:border-white/[0.05] bg-white/60 dark:bg-white/[0.015]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="stats-row grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="stat-item text-center">
                <p className="text-4xl md:text-5xl font-extrabold text-[#111827] dark:text-white mb-2">
                  <Counter end={s.value} suffix={s.suffix} />
                </p>
                <p className="text-sm text-[#6b7280] dark:text-white/40 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ WHAT WE TRACK ════════════ */}
      <section id="tracking" className="relative py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-5">
              <Globe size={11} /> Unified Digital Inventory
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-[#111827] dark:text-white">Everything Your Digital Stack Depends On</h2>
            <p className="text-[#4b5563] dark:text-white/45 text-lg max-w-2xl mx-auto">
              Mainly engineered for <strong>domain portfolios</strong>, plus full coverage for your hosting servers, SSL security certificates, and recurring software subscriptions.
            </p>
          </FadeIn>

          <div className="categories-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {trackingCategories.map((c) => {
              const Icon = c.icon;
              const clr = colorMap[c.color];
              return (
                <div key={c.title} className="category-card group bg-white dark:bg-[#141414] border border-[#dde1e9] dark:border-white/[0.08] rounded-2xl p-6 hover:border-indigo-300 dark:hover:border-white/20 transition-all duration-300 shadow-sm dark:shadow-none relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl ${clr.bg} border ${clr.border} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={20} className={clr.text} />
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.05] text-[#4b5563] dark:text-white/60 border border-gray-200 dark:border-white/5">
                      {c.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-[#111827] dark:text-white text-base mb-2 flex items-center gap-2">
                    {c.title}
                  </h3>
                  <p className="text-sm text-[#6b7280] dark:text-white/45 leading-relaxed">{c.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════ FEATURES ════════════ */}
      <section id="features" className="relative py-28 px-6 bg-white/60 dark:bg-white/[0.012] border-y border-[#dde1e9] dark:border-white/[0.05]">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-semibold mb-5">
              <Sparkles size={11} /> Powerful Automation
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-[#111827] dark:text-white">Built For Agencies, IT Teams & Creators</h2>
            <p className="text-[#4b5563] dark:text-white/45 text-lg max-w-xl mx-auto">From auto-fetching SSL certificates to multi-tier automated email notifications, everything works seamlessly.</p>
          </FadeIn>

          <div className="features-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => {
              const Icon = f.icon;
              const c = colorMap[f.color];
              return (
                <div key={f.title} className="feature-card group bg-white dark:bg-[#141414] border border-[#dde1e9] dark:border-white/[0.08] rounded-2xl p-6 hover:border-indigo-300 dark:hover:border-white/15 transition-all duration-300 shadow-sm dark:shadow-none cursor-default">
                  <div className={`w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={20} className={c.text} />
                  </div>
                  <h3 className="font-bold text-[#111827] dark:text-white text-[15px] mb-2">{f.title}</h3>
                  <p className="text-sm text-[#6b7280] dark:text-white/45 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section id="how" className="relative py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-20">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-semibold mb-5">
              <RefreshCw size={11} /> Quick 3-Minute Setup
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-[#111827] dark:text-white">How MailBot Works</h2>
            <p className="text-[#4b5563] dark:text-white/45 text-lg">Three straightforward steps to complete peace of mind.</p>
          </FadeIn>
          <div className="space-y-10">
            {steps.map((s, i) => (
              <div key={s.step} className={`step-card flex items-start gap-7 ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200 dark:border-indigo-500/25 flex items-center justify-center shadow-sm">
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{s.step}</span>
                  </div>
                </div>
                <div className={`flex-1 bg-white dark:bg-[#141414] border border-[#dde1e9] dark:border-white/[0.08] rounded-2xl p-6 shadow-sm dark:shadow-none ${i % 2 !== 0 ? 'md:text-right' : ''}`}>
                  <h3 className="text-xl font-bold text-[#111827] dark:text-white mb-2">{s.title}</h3>
                  <p className="text-[#4b5563] dark:text-white/45 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ TRUST / SECURITY ════════════ */}
      <section className="py-24 px-6 bg-white/60 dark:bg-white/[0.012] border-y border-[#dde1e9] dark:border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-12">
            <p className="text-gray-400 dark:text-white/30 text-xs font-bold uppercase tracking-widest mb-3">Enterprise Grade Reliability</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#111827] dark:text-white">Why Teams Choose MailBot</h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Lock, label: 'Encrypted SMTP Settings', desc: 'Use your own Gmail App Password or custom SMTP server. Passwords encrypted in DB.', color: 'emerald' },
              { icon: Users, label: 'Client-Specific Portfolios', desc: 'Assign domains & hosting to distinct client owners for customized renewal invoicing.', color: 'indigo' },
              { icon: TrendingUp, label: 'Smart Spend Analytics', desc: 'Complete 6-month financial forecast, monthly spend burn rate, and annual projections.', color: 'violet' },
            ].map((item, i) => {
              const Icon = item.icon;
              const c = colorMap[item.color];
              return (
                <FadeIn key={item.label} delay={i * 0.13}>
                  <div className="h-full text-center p-7 rounded-2xl bg-white dark:bg-[#141414] border border-[#dde1e9] dark:border-white/[0.08] hover:border-indigo-300 dark:hover:border-white/15 transition-all shadow-sm dark:shadow-none">
                    <div className={`w-12 h-12 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center mx-auto mb-4`}>
                      <Icon size={21} className={c.text} />
                    </div>
                    <h3 className="font-bold text-[#111827] dark:text-white mb-2">{item.label}</h3>
                    <p className="text-sm text-[#6b7280] dark:text-white/40 leading-relaxed">{item.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════ CTA ════════════ */}
      <section className="relative py-28 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/5 dark:from-indigo-600/8 dark:to-violet-600/8" />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[280px] bg-indigo-500/10 dark:bg-indigo-600/12 blur-[80px] rounded-full" />
        </div>
        <FadeIn className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6">
            <Star size={12} className="fill-indigo-500 dark:fill-indigo-400 text-indigo-500 dark:text-indigo-400" /> Never lose a client site again
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-[#111827] dark:text-white">Protect Your Complete Digital Stack</h2>
          <p className="text-[#4b5563] dark:text-white/45 text-lg mb-10">Start tracking your domains, hosting servers, SSL certificates, and subscriptions today.</p>
          <Link to="/login"
            className="group inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-base transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02]">
            Get Started Free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </FadeIn>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="border-t border-[#dde1e9] dark:border-white/[0.06] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#6b7280] dark:text-white/30">
          <div className="flex items-center gap-2.5">
            <Link to="/" aria-label="MailBot home">
              <img src="/mailbotLogo.svg" alt="MailBot logo" className="w-7 h-7 object-contain" />
            </Link>
            <span className="font-bold text-[#111827] dark:text-white/60">MailBot</span>
            <span>— Domain, Hosting & Subscription Asset Manager</span>
          </div>
          <p>© {new Date().getFullYear()} MailBot. Built with care for web professionals.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2 md:mt-0">
            <Link to="/privacy-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-and-conditions" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
