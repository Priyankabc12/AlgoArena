import Link from "next/link";
import QuestionNav from "../../features/user-questions/question-nav";

export default function ContestsPage() {
  return <main className="rx-qpage">
    <QuestionNav />
    <section className="rx-qcontent rx-contests-content">
      <span className="rx-eyebrow">LIVE EVENTS</span>
      <h1>Contests <em>at AlgoArena.</em></h1>
      <div className="rx-contest-card rx-glass">
        <span className="rx-contest-mark">AA</span>
        <div><h2>No contests scheduled yet</h2><p>We’re preparing the first AlgoArena contest. In the meantime, the problem set is open for practice.</p><Link className="rx-btn rx-btn-primary" href="/questions">Browse problems <span>↗</span></Link></div>
      </div>
    </section>
  </main>;
}
