import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, type CSSProperties } from 'react';
import {
  Truck,
  Clock,
  Calendar,
  Building2,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Check,
  Star,
  BadgeCheck,
  Sparkles,
  Phone,
  Mail,
  MapPinned,
  PackageSearch,
  Package,
} from 'lucide-react';

const CONTACT = {
  phone: '+251 911 000 000',
  email: 'support@zemenexpress.com',
  address: 'Bole Road, Addis Ababa, Ethiopia',
};

export default function Landing() {
  const navigate = useNavigate();
  const [trackingId, setTrackingId] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [contactStatus, setContactStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [contactErrors, setContactErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (prefersReducedMotion) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleTrack = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = trackingId.trim();
    if (!trimmed) {
      setTrackingError('Please enter a tracking ID.');
      return;
    }
    setTrackingError('');
    setIsTracking(true);
    setTimeout(() => {
      navigate(`/tracking/${encodeURIComponent(trimmed)}`);
    }, 650);
  };

  const handleContactSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof contactErrors = {};
    if (!contactForm.name.trim()) nextErrors.name = 'Name is required.';
    if (!contactForm.email.trim()) nextErrors.email = 'Email is required.';
    if (!contactForm.message.trim()) nextErrors.message = 'Please add a short message.';
    setContactErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setContactStatus('loading');
    setTimeout(() => {
      setContactStatus('success');
    }, 900);
  };

  return (
    <div className="w-full bg-[#F7F7FB] text-slate-900">
      {/* Hero */}
      <section
        id="home"
        className="relative scroll-mt-24 overflow-hidden border-b border-slate-100 bg-[radial-gradient(circle_at_top,_rgba(42,27,122,0.08),_transparent_55%),radial-gradient(circle_at_80%_20%,_rgba(242,140,58,0.12),_transparent_45%),linear-gradient(180deg,#ffffff_0%,#F7F7FB_80%)]"
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <div className="space-y-6 reveal" data-reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2A1B7A]/15 bg-white/80 px-4 py-2 text-xs font-semibold text-[#2A1B7A] shadow-sm">
                <Sparkles className="h-4 w-4 text-[#F28C3A]" />
                Premium last-mile delivery for Addis Ababa
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#2A1B7A] leading-[1.05]">
                Deliver faster, safer,
                <span className="block text-[#F28C3A]">and with complete visibility.</span>
              </h1>
              <p className="text-base md:text-lg text-slate-600 max-w-xl">
                Zemen Express provides same-day and scheduled delivery with real-time tracking, vetted drivers, and professional handling for every parcel.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="btn-primary"
                >
                  Start delivery
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  className="btn-secondary"
                >
                  Get a quote
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#2A1B7A]" />
                  Insured shipments
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-[#2A1B7A]" />
                  Verified couriers
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#2A1B7A]" />
                  Live ETAs
                </div>
              </div>
            </div>

            <div className="relative reveal" data-reveal>
              <div className="absolute -top-6 -left-6 h-16 w-24 rounded-full bg-[#F28C3A]/20" />
              <div className="absolute -bottom-8 right-6 h-3 w-16 rounded-full bg-[#2A1B7A]/40" />
              <div className="rounded-[28px] border border-slate-100 bg-white/90 p-6 shadow-xl">
                <div className="rounded-3xl bg-gradient-to-br from-[#2A1B7A]/10 to-[#F28C3A]/15 p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#2A1B7A]">Delivery Live</p>
                    <span className="rounded-full bg-[#F28C3A]/20 px-3 py-1 text-xs font-semibold text-[#F28C3A]">In Transit</span>
                  </div>
                  <div className="mt-6 rounded-2xl border border-white/60 bg-white/80 p-5 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Order</p>
                        <p className="text-lg font-semibold text-[#2A1B7A]">ZED-2045</p>
                      </div>
                      <Truck className="h-8 w-8 text-[#F28C3A]" />
                    </div>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#2A1B7A]" />
                        Picked up in Bole, 12 mins ago
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#2A1B7A]" />
                        ETA 32 minutes
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {['Dispatch', 'On Route', 'Delivered'].map((step, index) => (
                      <div key={step} className="rounded-2xl border border-white bg-white/70 px-3 py-2 text-center text-xs font-semibold text-slate-500">
                        <span className={index < 2 ? 'text-[#2A1B7A]' : ''}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Strip */}
        <div className="border-t border-slate-100 bg-white/70">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
              <span className="font-semibold text-[#2A1B7A]">Trusted by teams across Addis Ababa</span>
              <div className="flex flex-wrap items-center gap-6">
                {['Retail', 'Restaurants', 'Healthcare', 'E-commerce', 'Offices'].map((label) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#F28C3A]/60" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="scroll-mt-24 py-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 reveal" data-reveal>
            <div>
              <p className="section-label">Services</p>
              <h2 className="section-title">Delivery options built for speed</h2>
              <p className="section-sub">
                Choose the right service level with transparent pricing, real-time tracking, and dedicated support.
              </p>
            </div>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#2A1B7A] hover:text-[#F28C3A] transition-colors"
            >
              Compare service levels
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {
              [
                {
                  icon: <Clock className="h-5 w-5" />,
                  title: 'Same-Day',
                  text: 'Priority dispatch with deliveries in hours across the city.',
                },
                {
                  icon: <Truck className="h-5 w-5" />,
                  title: 'Next-Day',
                  text: 'Reliable next-day arrival with optimal routing.',
                },
                {
                  icon: <Calendar className="h-5 w-5" />,
                  title: 'Scheduled',
                  text: 'Plan pickups in advance for predictable operations.',
                },
                {
                  icon: <Building2 className="h-5 w-5" />,
                  title: 'Business',
                  text: 'Dedicated account management and bulk pricing.',
                },
              ].map((service, index) => (
                <div
                  key={service.title}
                  className="card card-hover group flex h-full flex-col reveal"
                  data-reveal
                  data-stagger
                  style={{ '--stagger-delay': `${index * 80}ms` } as CSSProperties}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F28C3A]/15 text-[#F28C3A]">
                    {service.icon}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-[#2A1B7A]">{service.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 flex-1">{service.text}</p>
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2A1B7A] transition-colors group-hover:text-[#F28C3A]"
                  >
                    Learn more
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ))
            }
          </div>
        </div>
      </section>

      {/* Track */}
      <section id="track" className="scroll-mt-24 py-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-slate-100 bg-white p-8 md:p-10 shadow-sm reveal" data-reveal>
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
              <div>
                <p className="section-label">Track</p>
                <h2 className="section-title">Track every delivery in real time</h2>
                <p className="section-sub">
                  Enter your tracking ID to see live status updates, proof of pickup, and the driver&apos;s ETA.
                </p>
              </div>
              <form className="rounded-3xl bg-[#F7F7FB] p-6" onSubmit={handleTrack}>
                <label className="form-label" htmlFor="trackingId">
                  Tracking ID
                </label>
                <div className="mt-3 flex flex-col sm:flex-row gap-3">
                  <input
                    id="trackingId"
                    type="text"
                    value={trackingId}
                    onChange={(event) => setTrackingId(event.target.value)}
                    placeholder="e.g. ZED-2045"
                    className="input-field flex-1"
                    aria-invalid={Boolean(trackingError)}
                  />
                  <button
                    type="submit"
                    disabled={isTracking}
                    className={`btn-primary px-5 ${isTracking ? 'btn-disabled' : ''}`}
                  >
                    {isTracking ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Loading
                      </>
                    ) : (
                      'Track'
                    )}
                  </button>
                </div>
                {trackingError ? <p className="error-text">{trackingError}</p> : null}
                <div className="helper-text flex items-center gap-3">
                  <PackageSearch className="h-4 w-4 text-[#2A1B7A]" />
                  Tracking updates refresh every 30 seconds.
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 py-16 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto reveal" data-reveal>
            <p className="section-label">How it works</p>
            <h2 className="section-title">Delivery in four simple steps</h2>
            <p className="section-sub mx-auto">Designed for individuals and businesses that need predictable logistics.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {
              [
                {
                  title: 'Create a request',
                  text: 'Share pickup and drop-off details, package size, and preferences.',
                },
                {
                  title: 'Confirm a driver',
                  text: 'We assign the best courier and notify you instantly.',
                },
                {
                  title: 'Track the route',
                  text: 'Follow the courier live with ETA, stops, and proof of pickup.',
                },
                {
                  title: 'Delivered safely',
                  text: 'Receive confirmation, rating options, and delivery history.',
                },
              ].map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-3xl border border-slate-100 bg-[#F7F7FB] p-6 reveal"
                  data-reveal
                  data-stagger
                  style={{ '--stagger-delay': `${index * 80}ms` } as CSSProperties}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#2A1B7A]">Step {index + 1}</span>
                    <Check className="h-4 w-4 text-[#F28C3A]" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#2A1B7A]">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">{step.text}</p>
                </div>
              ))
            }
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-24 py-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 reveal" data-reveal>
            <div>
              <p className="section-label">Pricing</p>
              <h2 className="section-title">Flexible plans for every scale</h2>
              <p className="section-sub">Transparent rates with no hidden fees, tailored for both individuals and growing teams.</p>
            </div>
            <button
              type="button"
              className="btn-secondary px-6"
            >
              Download price sheet
            </button>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Starter',
                price: 'From 85 ETB',
                desc: 'For one-off deliveries and personal packages.',
                features: ['Same-day delivery', 'Live tracking', 'Standard support'],
              },
              {
                name: 'Growth',
                price: 'From 65 ETB',
                desc: 'Best for small businesses with daily routes.',
                features: ['Priority dispatch', 'Bulk pricing', 'Dedicated support'],
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                desc: 'Tailored logistics for high-volume operations.',
                features: ['SLA coverage', 'Integration support', 'Account manager'],
              },
            ].map((tier, index) => (
              <div
                key={tier.name}
                className={`rounded-3xl border ${tier.highlight ? 'border-[#F28C3A]/40 bg-white shadow-lg' : 'border-slate-100 bg-white'} p-6 flex h-full flex-col reveal`}
                data-reveal
                data-stagger
                style={{ '--stagger-delay': `${index * 90}ms` } as CSSProperties}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-[#2A1B7A]">{tier.name}</h3>
                  {tier.highlight && (
                    <span className="rounded-full bg-[#F28C3A]/15 px-3 py-1 text-xs font-semibold text-[#F28C3A]">Popular</span>
                  )}
                </div>
                <p className="mt-4 text-2xl font-bold text-[#2A1B7A]">{tier.price}</p>
                <p className="mt-2 text-sm text-slate-500">{tier.desc}</p>
                <ul className="mt-5 space-y-2 text-sm text-slate-600 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#F28C3A]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`mt-6 w-full ${tier.highlight ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Start delivery
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage + Stats */}
      <section id="coverage" className="scroll-mt-24 py-16 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-10">
            <div className="reveal" data-reveal>
              <p className="section-label">Coverage</p>
              <h2 className="section-title">All Addis Ababa, every sub-city</h2>
              <p className="section-sub">
                We operate across all major districts with a reliable courier network and localized dispatching.
              </p>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-slate-600">
                {['Bole', 'Kazanchis', 'Piazza', 'Mexico', 'Merkato', 'Sarbet', 'CMC', 'Ayat', 'Gerji', 'Summit', '4 Kilo', '6 Kilo'].map((place) => (
                  <div key={place} className="flex items-center gap-2">
                    <MapPinned className="h-4 w-4 text-[#F28C3A]" />
                    {place}
                  </div>
                ))}
              </div>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#2A1B7A]/20 px-4 py-2 text-sm font-semibold text-[#2A1B7A]">
                <MapPin className="h-4 w-4 text-[#F28C3A]" />
                Full city coverage
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '350K+', label: 'Deliveries completed' },
                  { value: '4.9/5', label: 'Customer rating' },
                  { value: '15-30 min', label: 'Average pickup time' },
                  { value: '24/7', label: 'Operational support' },
                ].map((stat, index) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-100 bg-[#F7F7FB] p-4 reveal"
                    data-reveal
                    data-stagger
                    style={{ '--stagger-delay': `${index * 70}ms` } as CSSProperties}
                  >
                    <div className="text-xl font-bold text-[#2A1B7A]">{stat.value}</div>
                    <div className="mt-1 text-xs text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="card reveal" data-reveal>
                <h3 className="text-lg font-semibold text-[#2A1B7A]">Service guarantees</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  {['Real-time driver tracking', 'Photo proof of delivery', 'Dedicated city dispatch team'].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#F28C3A]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto reveal" data-reveal>
            <p className="section-label">Testimonials</p>
            <h2 className="section-title">Loved by teams and families</h2>
            <p className="section-sub mx-auto">Consistent, reliable delivery experiences across the city.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: 'Fast delivery from Bole to Summit in under an hour. Clear tracking all the way.',
                name: 'Abebe K.',
                role: 'Retail Manager',
              },
              {
                quote: 'The business plan keeps our daily deliveries on schedule. Couriers are professional.',
                name: 'Meron T.',
                role: 'Operations Lead',
              },
              {
                quote: 'Perfect for sending documents to clients. Notifications are always on time.',
                name: 'Dawit H.',
                role: 'Legal Consultant',
              },
            ].map((review, index) => (
              <div
                key={review.name}
                className="card card-hover reveal h-full flex flex-col"
                data-reveal
                data-stagger
                style={{ '--stagger-delay': `${index * 80}ms` } as CSSProperties}
              >
                <div className="flex items-center gap-1 text-[#F28C3A]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4" />
                  ))}
                </div>
                <p className="mt-4 text-sm text-slate-600 flex-1">“{review.quote}”</p>
                <div className="mt-4 text-sm font-semibold text-[#2A1B7A]">{review.name}</div>
                <div className="text-xs text-slate-400">{review.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[36px] bg-[#2A1B7A] text-white px-8 py-12 md:px-12 md:py-14 relative overflow-hidden reveal" data-reveal>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(242,140,58,0.35),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.18),transparent_45%)]" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold">Ready to deliver with confidence?</h2>
                <p className="mt-3 text-white/80">
                  Start your first shipment today or connect with our team for a tailored logistics plan.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  className="btn-secondary bg-white text-[#2A1B7A] border-white/70 hover:bg-white"
                >
                  Call {CONTACT.phone}
                </button>
                <Link
                  to="/register"
                  className="btn-primary px-6"
                >
                  Start delivery
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-24 py-16 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-10">
            <div className="reveal" data-reveal>
              <p className="section-label">Contact</p>
              <h2 className="section-title">Let&apos;s plan your next delivery</h2>
              <p className="section-sub">
                Share your details and our team will respond within one business day.
              </p>
              <form className="mt-6 space-y-4" onSubmit={handleContactSubmit}>
                <div>
                  <label className="form-label" htmlFor="contactName">Name</label>
                  <input
                    id="contactName"
                    type="text"
                    placeholder="Your name"
                    className="input-field"
                    value={contactForm.name}
                    onChange={(event) => setContactForm((prev) => ({ ...prev, name: event.target.value }))}
                    aria-invalid={Boolean(contactErrors.name)}
                    disabled={contactStatus === 'loading'}
                  />
                  {contactErrors.name ? <p className="error-text">{contactErrors.name}</p> : null}
                </div>
                <div>
                  <label className="form-label" htmlFor="contactEmail">Email</label>
                  <input
                    id="contactEmail"
                    type="email"
                    placeholder="you@example.com"
                    className="input-field"
                    value={contactForm.email}
                    onChange={(event) => setContactForm((prev) => ({ ...prev, email: event.target.value }))}
                    aria-invalid={Boolean(contactErrors.email)}
                    disabled={contactStatus === 'loading'}
                  />
                  {contactErrors.email ? <p className="error-text">{contactErrors.email}</p> : null}
                </div>
                <div>
                  <label className="form-label" htmlFor="contactMessage">Message</label>
                  <textarea
                    id="contactMessage"
                    rows={4}
                    placeholder="Tell us about your delivery needs"
                    className="input-field"
                    value={contactForm.message}
                    onChange={(event) => setContactForm((prev) => ({ ...prev, message: event.target.value }))}
                    aria-invalid={Boolean(contactErrors.message)}
                    disabled={contactStatus === 'loading'}
                  />
                  {contactErrors.message ? <p className="error-text">{contactErrors.message}</p> : null}
                </div>
                <button
                  type="submit"
                  disabled={contactStatus === 'loading' || contactStatus === 'success'}
                  className={`btn-primary ${contactStatus !== 'idle' ? 'btn-disabled' : ''}`}
                >
                  {contactStatus === 'loading' ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Sending
                    </>
                  ) : contactStatus === 'success' ? (
                    <>
                      Message sent
                      <Check className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Send message
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                {contactStatus === 'success' ? (
                  <p className="helper-text text-emerald-600">Thanks! Our team will reach out shortly.</p>
                ) : null}
              </form>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-100 bg-[#F7F7FB] p-6 reveal" data-reveal>
                <h3 className="text-xl font-semibold text-[#2A1B7A]">Contact details</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-[#F28C3A]" />
                    {CONTACT.phone}
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-[#F28C3A]" />
                    {CONTACT.email}
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-[#F28C3A]" />
                    {CONTACT.address}
                  </div>
                </div>
              </div>
              <div className="card reveal" data-reveal>
                <h3 className="text-lg font-semibold text-[#2A1B7A]">Support hours</h3>
                <p className="mt-3 text-sm text-slate-500">Monday - Sunday, 7:00 AM - 9:00 PM</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#2A1B7A]/20 px-4 py-2 text-xs font-semibold text-[#2A1B7A]">
                  Average response time: 30 minutes
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
