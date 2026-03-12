import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { landingFeatures } from '../data/landingFeatures';

const kpis = [
  { label: 'Active businesses', value: '50+' },
  { label: 'Invoices processed', value: '1000+' },
  { label: 'Time saved', value: '10hrs/week' },
  { label: 'Uptime', value: '99.9%' },
];

const pillars = [
  {
    title: 'One workspace for your business finances',
    body: 'Run invoicing, expense tracking, and client management in one dashboard.',
  },
  {
    title: 'Built for owners and their teams',
    body: 'Simple daily workflows with deeper insights for smarter business decisions.',
  },
  {
    title: 'Ready to grow with your business',
    body: 'Start lean and scale to multiple branches without changing how you work.',
  },
];

const workflow = [
  {
    step: '01',
    title: 'Set up your company',
    text: 'Create your workspace in minutes. Add your business details and start organizing.',
  },
  {
    step: '02',
    title: 'Add clients and invoices',
    text: 'Start billing your customers. Track who has paid and who hasn\'t.',
  },
  {
    step: '03',
    title: 'Track and improve',
    text: 'Record expenses, see cash flow forecasts, and make better business decisions.',
  },
];
const industries = [
  { name: 'Tour Operators', image: '/landing/operator.png' },
  { name: 'Hotels & Lodges', image: '/landing/hotel.png' },
  { name: 'Safari & Excursions', image: '/landing/safari.png' },
  { name: 'Car Rental', image: '/landing/carrental.png' },
  { name: 'Event Planners', image: '/landing/event.png' },
  { name: 'Consulting Firms', image: '/landing/consulting.png' },
];

const faqs = [
  {
    q: 'Do I need accounting experience?',
    a: 'No. FiinFlow is built for business owners. Simple interface, clear numbers, no training needed.',
  },
  {
    q: 'Can I use my company branding?',
    a: 'Yes. Your logo and business details appear on invoices and documents automatically.',
  },
  {
    q: 'Is FiinFlow secure?',
    a: 'Yes. Passwords are hashed, data is encrypted, and each company sees only their own information.',
  },
];

const armyGreen = '#4B5320';
const armyGreenHover = '#3A401F';

const Landing = () => {
  const featuresRef = useRef<HTMLElement | null>(null);
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const node = featuresRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFeaturesVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-pro-bg min-h-screen text-slate-900">
      <header className="mx-auto flex w-full max-w-[108rem] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 lg:flex-nowrap lg:px-8 xl:px-10 2xl:px-12">
        <div className="flex items-center gap-2">
          <span />
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>
            FiinFlow
          </span>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">
          <a href="#features" className="hover:text-slate-900">Features</a>
          <a href="#workflow" className="hover:text-slate-900">How it works</a>
          <a href="#industries" className="hover:text-slate-900">Industries</a>
          <a href="#faq" className="hover:text-slate-900">FAQ</a>
        </nav>

        <div className="flex w-full items-center justify-end gap-2 sm:gap-3 lg:w-auto">
          <Link to="/login" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 sm:px-4">
            Log in
          </Link>
          <Link 
            to="/setup/company" 
            className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors sm:px-4" 
            style={{ backgroundColor: armyGreen }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = armyGreenHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = armyGreen}
          >
            Get started
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-[108rem] gap-8 px-4 pb-12 pt-6 sm:gap-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:px-8 xl:px-10 2xl:gap-16 2xl:px-12 2xl:pb-20 2xl:pt-10">
          <div className="animate-fade-up">
      
            <h1 className="mt-4 max-w-2xl text-[clamp(2rem,5vw,4.25rem)] font-bold leading-tight text-slate-950 2xl:max-w-4xl" style={{ fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>
              Run your business smarter with FiinFlow
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base lg:text-lg 2xl:max-w-2xl 2xl:text-xl">
              Stop juggling notebooks and spreadsheets. FiinFlow brings invoicing, expense tracking, 
              and financial insights into one simple workspace.
            </p>
          
            <div className="mt-7 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {kpis.map((item) => (
                <div key={item.label} className="kpi-badge">
                  <div>
                    <p className="kpi-value">{item.value}</p>
                    <p className="kpi-label">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 2xl:rounded-2xl">
              <img
                src="/landing/finflow-dashboard.png"
                alt="FinFlow dashboard preview"
                className="h-auto w-full object-contain 2xl:max-h-[36rem]"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = '/landing/hero-operations-preview.svg';
                }}
              />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[108rem] px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8 xl:px-10 2xl:px-12 2xl:pb-20">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {pillars.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-100 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="features" ref={featuresRef} className="mx-auto w-full max-w-[108rem] px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8 xl:px-10 2xl:px-12 2xl:pb-20">
          <div className="max-w-3xl">
            <h2 className="mt-3 text-3xl font-bold text-slate-950" style={{ fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>
              Everything you need to run your finances
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Click any feature to open a detailed page with full workflow context, use cases, and implementation highlights.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {landingFeatures.map((item, index) => (
              <Link
                key={item.title}
                to={`/features/${item.slug}`}
                style={{ transitionDelay: `${index * 80}ms` }}
                className={`group relative block rounded-3xl border border-slate-100 bg-white p-0 transition-transform duration-500 hover:-translate-y-2 ${
                  featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
              >
                <div className="overflow-hidden rounded-t-3xl bg-slate-100">
                  <img
                    src={item.image}
                    alt={`${item.title} visual`}
                    className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/600x400/f3f4f6/9ca3af?text=' + item.title;
                    }}
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
                  <div className="mt-4 inline-flex items-center text-xs font-semibold uppercase tracking-[0.14em] text-[#4B5320]">
                    Learn more
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="workflow" className="mx-auto w-full max-w-[108rem] px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8 xl:px-10 2xl:px-12 2xl:pb-20">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">How it works</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950" style={{ fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>
              Get started in minutes
            </h2>

            <div className="mt-8 hidden md:block">
              <div className="relative">
                <div className="absolute left-0 right-0 top-5 h-1 rounded-full bg-slate-200" />
                <div className="absolute left-0 top-5 h-1 w-2/3 rounded-full" style={{ backgroundColor: armyGreen }} />
                <div className="relative grid grid-cols-3 gap-4">
                  {workflow.map((item, index) => (
                    <div key={`tracker-${item.step}`} className="text-center">
                      <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        index < 2 ? 'text-white' : 'bg-white text-slate-700 border border-slate-300'
                      }`} style={index < 2 ? { backgroundColor: armyGreen } : {}}>
                        {item.step}
                      </div>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Step {item.step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {workflow.map((item, index) => (
                <article key={item.step} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Step {item.step}</p>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full"
                      style={{ 
                        width: `${(index + 1) * 33}%`,
                        backgroundColor: armyGreen 
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="industries" className="mx-auto w-full max-w-[108rem] px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8 xl:px-10 2xl:px-12 2xl:pb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Industries</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950" style={{ fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>
            Built for service businesses
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 2xl:gap-6">
            {industries.map((item) => (
              <div key={item.name} className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                <div className="aspect-[3/2] overflow-hidden bg-slate-100 rounded-t-2xl">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/600x400/f3f4f6/9ca3af?text=' + item.name;
                    }}
                  />
                </div>
                <div className="px-4 py-3 text-sm font-semibold text-slate-700">
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto w-full max-w-[108rem] px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8 xl:px-10 2xl:px-12 2xl:pb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">FAQ</p>
          <div className="mt-6 space-y-4">
            {faqs.map((item, idx) => (
              <div key={item.q} className="rounded-2xl border border-slate-100 bg-white">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenFaq(openFaq === idx ? null : idx); } }}
                  aria-expanded={openFaq === idx}
                  aria-controls={`faq-panel-${idx}`}
                  id={`faq-${idx}`}
                  className="faq-button w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-slate-900">{item.q}</span>
                  <span className="text-slate-500" aria-hidden>{openFaq === idx ? '−' : '+'}</span>
                </button>
                {openFaq === idx && (
                  <div id={`faq-panel-${idx}`} role="region" aria-labelledby={`faq-${idx}`} className="px-5 pb-5 pt-0 text-sm leading-6 text-slate-600">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA box */}
        <section className="mx-auto w-full max-w-[108rem] px-4 pb-14 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <div className="rounded-2xl border border-slate-100 bg-white p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Ready to simplify your financial operations?</h3>
                <p className="mt-2 text-sm text-slate-600">Create your workspace, invite your team, and start managing invoices, expenses, and reports in one place.</p>
              </div>
              <div className="mt-4 flex gap-3 sm:mt-0">
                <Link
                  to="/setup/company"
                  className="pill-btn hero-cta-primary"
                >
                  Create Account
                </Link>
                <Link to="/login" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  Login
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="site-footer-dark">
        <div className="mx-auto grid w-full max-w-[108rem] gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8 xl:px-10 2xl:px-12">
          <div>
            <h3 className="text-2xl font-bold footer-lead" style={{ fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>FiinFlow</h3>
            <p className="mt-3 text-sm footer-small">
              Financial operations workspace for growing businesses.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold footer-lead">Quick Links</p>
            <div className="mt-3 space-y-2 text-sm footer-small">
              <a href="#features" className="block hover:underline">Features</a>
              <a href="#workflow" className="block hover:underline">How it works</a>
              <a href="#industries" className="block hover:underline">Industries</a>
              <a href="#faq" className="block hover:underline">FAQ</a>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold footer-lead">Contact Us</p>
            <div className="mt-3 space-y-2 text-sm footer-small">
              <div>Email: fiinflow@gmail.com</div>
              <div>Phone: +250 788 123 456</div>
              <div>Kigali, Rwanda</div>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200">
          <div className="mx-auto w-full max-w-[108rem] px-4 py-4 text-xs footer-small sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
            (c) {new Date().getFullYear()} FiinFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
