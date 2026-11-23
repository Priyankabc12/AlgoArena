import Link from "next/link";

export default function ContestsPage() {
  return <main id="main-content" className="arena-page" tabIndex={-1}>
    <div className="arena-container">
      <header className="arena-page-heading"><h1>Contests</h1></header>
      <section className="arena-state">
        <h2>No contests scheduled</h2>
        <p>While you wait for the next contest, pick a problem from the practice catalog.</p>
        <Link className="rx-btn rx-btn-primary" href="/questions">Browse problems</Link>
      </section>
    </div>
  </main>;
}
