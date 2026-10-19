"use client";
import dynamic from "next/dynamic";
import { ArrowDown, ArrowUpRight, MoveUpRight } from "lucide-react";
import { Component, type ReactNode } from "react";
const HomeScene = dynamic(() => import("./home-scene"), {
  ssr: false,
  loading: () => (
    <div className="home-scene-loading">
      Setting the scene
      <span />
    </div>
  ),
});
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="home-scene-loading">Your next space starts here.</div>
    ) : (
      this.props.children
    );
  }
}
export default function HomeHero({
  create,
}: {
  create: (name: string) => void;
}) {
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-atmosphere" aria-hidden="true" />
      <div className="home-scene">
        <SceneBoundary>
          <HomeScene />
        </SceneBoundary>
      </div>
      <div className="home-caption">
        <span className="home-live-dot" /> A LITTLE IMAGINATION. A SPACE OF YOUR
        OWN.
      </div>
      <div className="home-copy">
        <p className="home-eyebrow">YOUR WORLD, BY DESIGN</p>
        <h1 id="home-title">
          Make room
          <br />
          for <em>your ideas.</em>
        </h1>
        <p className="home-description">
          From the first wall to the finishing touch.
          <br />
          Build a home that feels like you, in 2D &amp; 3D.
        </p>
        <div className="home-actions">
          <button
            className="home-primary"
            onClick={() => create("Empty Room")}
            aria-label="New project"
          >
            Start building <ArrowUpRight size={19} />
          </button>
          <button
            className="home-secondary"
            onClick={() => create("Living Room")}
          >
            Explore a space <MoveUpRight size={16} />
          </button>
        </div>
      </div>
      <div className="home-model-note">
        <span>01 / THE GARDEN HOUSE</span>
        <p>A fresh perspective on everyday living.</p>
        <small>Drag to explore the model</small>
      </div>
      <a className="home-scroll" href="#your-projects">
        <span>
          Your next chapter
          <br />
          starts here
        </span>
        <ArrowDown size={19} />
      </a>
      <div className="home-bottom">
        <span>IMAGINE. ARRANGE. MAKE IT YOURS.</span>
        <span>A STUDIO WITHOUT LIMITS.</span>
      </div>
    </section>
  );
}
