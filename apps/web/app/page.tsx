import Link from "next/link";

export default function Home() {
  return (
    <main id="main-content" className="rx-shell arena-home" tabIndex={-1}>
      <section className="arena-home-hero">
        <div>
          <h1>Get better at<br /><em>solving problems.</em></h1>
          <p>Build your coding practice one problem at a time. Run your solution on sample cases, submit it for judging, and revisit your attempts.</p>
          <div className="arena-action-row">
            <Link className="rx-btn rx-btn-primary" href="/questions">Browse problems</Link>
            <Link className="rx-btn rx-btn-secondary" href="/playground">Open playground</Link>
          </div>
        </div>
        <figure className="arena-home-example">
          <figcaption><span>Practice example</span><span>Python</span></figcaption>
          <pre><code>{'nums = input().split()\nnums = map(int, nums)\nprint(sum(nums))'}</code></pre>
          <div>
            <p><span>Sample input</span><code>2 3 5</code></p>
            <p><span>Expected output</span><code>10</code></p>
          </div>
        </figure>
      </section>
      <footer className="arena-home-footer">
        <span>AlgoArena</span>
        <Link className="arena-link" href="/profile">View your practice history</Link>
      </footer>
    </main>
  );
}
