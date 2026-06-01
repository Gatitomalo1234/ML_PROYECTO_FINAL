"use client";

import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // Cache SVG elements once — never query inside tick loop
    const mainCircle = ring.querySelector<SVGCircleElement>(".r-main");
    const ticksGroup = ring.querySelector<SVGGElement>(".r-ticks");
    const outerArc   = ring.querySelector<SVGCircleElement>(".r-outer");

    // ── Mutable state (plain vars, no React state = zero re-renders) ─────
    let mx = -300, my = -300;          // raw mouse
    let rx = -300, ry = -300;          // ring position (smoothed)
    let dotS   = 1.0, ringS = 1.0;    // current scales
    let isPtr  = false;                // hovering interactive element
    let isDown = false;                // mouse pressed

    // ── Event handlers ────────────────────────────────────────────────────
    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      const el = e.target as HTMLElement | null;
      isPtr = !!(el && (
        el.closest("button, a, [role='button']") ||
        window.getComputedStyle(el).cursor === "pointer"
      ));
    };
    const onDown  = () => { isDown = true; };
    const onUp    = () => { isDown = false; };
    const onLeave = () => { dot.style.opacity = "0"; ring.style.opacity = "0"; };
    const onEnter = () => { dot.style.opacity = "1"; ring.style.opacity = "1"; };

    document.addEventListener("mousemove",  onMove,  { passive: true });
    document.addEventListener("mousedown",  onDown);
    document.addEventListener("mouseup",    onUp);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    // ── Render loop ───────────────────────────────────────────────────────
    let rafId: number;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const t = now * 0.001; // seconds

      // Ring position — soft follow (lerp 0.13 ≈ 0.25s settle)
      rx += (mx - rx) * 0.13;
      ry += (my - ry) * 0.13;

      // Target scales
      const dotTarget  = isDown ? 0.50 : isPtr ? 1.60 : 1.00;
      const ringTarget = isPtr  ? 1.52 : 1.00;

      // Smooth transitions (lerp per frame)
      dotS  += (dotTarget  - dotS)  * 0.20;
      ringS += (ringTarget - ringS) * 0.15;

      // Breathing — idle only, fades away on hover
      const breathe = isPtr ? 0 : Math.sin(t * 1.6) * 0.045;
      const rs = ringS + breathe;

      // ── Dot ──────────────────────────────────────────────────────────
      dot.style.transform = `translate(${mx}px, ${my}px) scale(${dotS.toFixed(3)})`;

      // Dot glow: white on hover, cyan when idle
      dot.style.boxShadow = isPtr
        ? "0 0 0 1.5px rgba(255,255,255,0.20), 0 0 8px 2px rgba(255,255,255,0.55), 0 0 18px 4px rgba(88,184,200,0.35)"
        : "0 0 0 1px rgba(88,184,200,0.20), 0 0 6px 1px rgba(88,184,200,0.80), 0 0 14px 3px rgba(88,184,200,0.30)";

      // ── Ring ─────────────────────────────────────────────────────────
      ring.style.transform = `translate(${rx}px, ${ry}px)`;

      if (mainCircle) {
        const r = (12 * rs).toFixed(2);
        mainCircle.setAttribute("r", r);
        // Ring color + weight on hover
        mainCircle.setAttribute("stroke",
          isPtr ? "rgba(255,255,255,0.90)" : "rgba(88,184,200,0.72)");
        mainCircle.setAttribute("stroke-width", isPtr ? "1.6" : "1.2");
      }

      // Outer subtle arc — pulses opposite phase to ring
      if (outerArc) {
        const ro = (16.5 * rs).toFixed(2);
        outerArc.setAttribute("r", ro);
        outerArc.setAttribute("opacity", isPtr ? "0" : String((0.18 + Math.sin(t * 1.6 + Math.PI) * 0.08).toFixed(3)));
      }

      // Tick marks — fade on hover
      if (ticksGroup) {
        ticksGroup.setAttribute("opacity", isPtr ? "0" : "1");
      }

      // Glow filter
      ring.style.filter = isPtr
        ? "drop-shadow(0 0 7px rgba(255,255,255,0.60)) drop-shadow(0 0 14px rgba(88,184,200,0.40))"
        : "drop-shadow(0 0 4px rgba(88,184,200,0.55)) drop-shadow(0 0 9px rgba(88,184,200,0.22))";
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("mousemove",  onMove);
      document.removeEventListener("mousedown",  onDown);
      document.removeEventListener("mouseup",    onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      {/* ── Dot — snaps precisely to cursor ─────────────────────────────── */}
      <div
        ref={dotRef}
        style={{
          position:        "fixed",
          top:             0,
          left:            0,
          width:           5,
          height:          5,
          marginLeft:      -2.5,
          marginTop:       -2.5,
          borderRadius:    "50%",
          background:      "rgba(255,255,255,0.96)",
          pointerEvents:   "none",
          zIndex:          99999,
          opacity:         1,
          willChange:      "transform, box-shadow",
          transformOrigin: "2.5px 2.5px",
        }}
      />

      {/* ── Ring SVG — follows with lag ──────────────────────────────────── */}
      <svg
        ref={ringRef}
        width="48"
        height="48"
        viewBox="-24 -24 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position:      "fixed",
          top:           0,
          left:          0,
          marginLeft:    -24,
          marginTop:     -24,
          pointerEvents: "none",
          zIndex:        99998,
          opacity:       1,
          willChange:    "transform, filter",
        }}
      >
        {/* Outer ghost arc — breathes at opposite phase */}
        <circle
          className="r-outer"
          cx="0" cy="0" r="16.5"
          stroke="rgba(88,184,200,0.25)"
          strokeWidth="0.6"
          strokeDasharray="3 5"
          fill="none"
        />

        {/* Main targeting ring */}
        <circle
          className="r-main"
          cx="0" cy="0" r="12"
          stroke="rgba(88,184,200,0.72)"
          strokeWidth="1.2"
          fill="none"
        />

        {/* Tick marks — 4 cardinal points, outside the ring */}
        <g className="r-ticks">
          <line x1="0"   y1="-16" x2="0"   y2="-14" stroke="rgba(88,184,200,0.55)" strokeWidth="1.2" />
          <line x1="0"   y1="14"  x2="0"   y2="16"  stroke="rgba(88,184,200,0.55)" strokeWidth="1.2" />
          <line x1="-16" y1="0"   x2="-14" y2="0"   stroke="rgba(88,184,200,0.55)" strokeWidth="1.2" />
          <line x1="14"  y1="0"   x2="16"  y2="0"   stroke="rgba(88,184,200,0.55)" strokeWidth="1.2" />
        </g>
      </svg>
    </>
  );
}
