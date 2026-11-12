"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Compass, MessageCircle, ShieldCheck } from "lucide-react";

const steps = [
  {
    icon: MessageCircle,
    number: "01",
    label: "TELL US",
    title: "Start with a thought.",
    description:
      "A need, a budget, a favorite color. Your pal does the searching.",
  },
  {
    icon: Compass,
    number: "02",
    label: "FIND YOUR FIT",
    title: "Consider the good ones.",
    description:
      "A few thoughtful matches. Clear prices. No endless scrolling.",
  },
  {
    icon: ShieldCheck,
    number: "03",
    label: "MAKE IT YOURS",
    title: "You have the final say.",
    description:
      "Review every detail. Approve your choice. Pay with PayPal sandbox.",
  },
];
export function ClosingSection() {
  const container = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (
      !container.current ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="closing-section" ref={container} data-entered={entered}>
      <div className="closing-inner">
        <section
          className="how-section"
          id="how-it-works"
          aria-labelledby="how-title"
        >
          <div className="how-intro closing-reveal">
            <span className="eyebrow">A LITTLE LESS FRICTION</span>
            <h2 id="how-title">
              Good shopping.
              <br />
              <em>On your terms.</em>
            </h2>
            <span className="how-accent" aria-hidden="true" />
          </div>
          {steps.map(({ icon: Icon, number, label, title, description }) => (
            <div className="how-step closing-reveal" key={number}>
              <div className="how-icon">
                <Icon size={24} aria-hidden="true" />
              </div>
              <span>
                {number} / {label}
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </section>
        <footer className="site-footer closing-reveal">
          <Link className="brand" href="/">
            shopipal<span>.</span>
          </Link>
          <p>A little help goes a long way.</p>
          <span>
            PayPal demo · Sandbox only.
            <br />
            Book store · Shopify checkout.
          </span>
          <a
            href="https://www.exchangerate-api.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Rates By Exchange Rate API
          </a>
        </footer>
      </div>
    </div>
  );
}
