export default function AccessPendingPage() {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <span className="eyebrow tag-on-light">Account Access</span>
        <h1>Your account is awaiting access.</h1>
        <p>Your email is verified, but an ORDS administrator still needs to assign your portal role. No private portal information is available yet.</p>
        <form action="/auth/signout" method="post">
          <button className="inline-btn auth-submit" type="submit">Sign Out</button>
        </form>
      </section>
    </main>
  );
}
