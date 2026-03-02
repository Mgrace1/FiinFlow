import React from 'react';
import { Link, useParams } from 'react-router-dom';
import NotFound from './NotFound';
import { landingFeatures } from '../data/landingFeatures';

const FeatureDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const feature = landingFeatures.find((item) => item.slug === slug);

  if (!feature) {
    return <NotFound />;
  }

  return (
    <div className="landing-pro-bg min-h-screen text-slate-900">
      <header className="mx-auto flex w-full max-w-[92rem] items-center justify-between px-6 py-6 lg:px-8 2xl:px-12">
        <Link
          to="/"
          className="text-xl font-bold tracking-tight text-slate-900"
          style={{ fontFamily: "'Sora', 'Segoe UI', sans-serif" }}
        >
          FiinFlow
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400">
            Log in
          </Link>
          <Link to="/setup/company" className="rounded-lg bg-[#4B5320] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3A401F]">
            Get started
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-[92rem] gap-10 px-6 pb-14 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 2xl:px-12">
          <div>
            <Link
              to="/#features"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Back to features
            </Link>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Feature Deep Dive</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-slate-950 sm:text-5xl" style={{ fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>
              {feature.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {feature.overview}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {feature.highlights.slice(0, 4).map((item) => (
                <div key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm font-medium text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <img
              src={feature.image}
              alt={`${feature.title} visual`}
              className="h-full min-h-[19rem] w-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = `https://placehold.co/900x600/f3f4f6/9ca3af?text=${feature.title}`;
              }}
            />
          </div>
        </section>

        <section className="mx-auto w-full max-w-[92rem] px-6 pb-16 lg:px-8 2xl:px-12 2xl:pb-20">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-900">Why it matters</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                This feature reduces manual work, improves data accuracy, and gives your team a clearer decision-making process.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-900">How teams use it</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Most teams use this in their daily operations to keep financial records up to date and avoid delays in reporting.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-900">Operational clarity</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Clear workflows and structured records make audits, reconciliations, and team handovers far easier.
              </p>
            </article>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[92rem] px-6 pb-16 lg:px-8 2xl:px-12 2xl:pb-20">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">What this includes</p>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {feature.highlights.map((item) => (
                <li key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[92rem] flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center lg:px-8 2xl:px-12">
          <div>
            <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>
              Want to see this in action?
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Start your workspace and explore {feature.title.toLowerCase()} with your own business data.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/setup/company" className="rounded-lg bg-[#4B5320] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3A401F]">
              Create account
            </Link>
            <Link to="/#features" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              More features
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FeatureDetail;
