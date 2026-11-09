// Two-panel layout shared by Login and Register: blue hero on the left, form card on the right
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <section className="auth-hero" aria-hidden="true">
        <div className="hero-shape shape-large" />
        <div className="hero-shape shape-medium" />
        <div className="hero-shape shape-small" />
        <div className="hero-content">
          <div className="brand">
            <img src="/logo.svg" alt="" />
            <span>Sweety</span>
          </div>
          <p className="hero-kicker">Blood Glucose Tracker</p>
          <h1>Track every reading, every day</h1>
          <p className="hero-text">
            Log up to four readings a day across fasting, breakfast, lunch and dinner, then review your
            daily, month-to-date and monthly trends.
          </p>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-card">
          <h2>{title}</h2>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </section>
    </div>
  );
}
