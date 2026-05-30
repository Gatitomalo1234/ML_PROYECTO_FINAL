"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { useExperienceStore } from "@/state/experienceStore";
import { loadDashboardExports } from "@/systems/data/loadDashboardExports";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { useMouseParallax } from "@/hooks/useMouseParallax";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";
import type { ExperienceMode } from "@/state/experienceTypes";

export default function ExperienceController() {
  const initialized = useExperienceStore((s) => s.initialized);
  const setInitialized = useExperienceStore((s) => s.setInitialized);
  const setMode = useExperienceStore((s) => s.setMode);
  const setCinematicT = useExperienceStore((s) => s.setCinematicT);
  const setAllowUserOrbit = useExperienceStore((s) => s.setAllowUserOrbit);
  const hydrate = useExperienceStore((s) => s.hydrateFromExports);
  const setDataStatus = useExperienceStore((s) => s.setDataStatus);
  const setDataError = useExperienceStore((s) => s.setDataError);
  const setScroll = useExperienceStore((s) => s.setScrollProgress);
  const setMouse = useExperienceStore((s) => s.setMouse);
  const missileActive = useExperienceStore((s) => s.missileActive);
  const mode          = useExperienceStore((s) => s.mode);

  const scroll = useScrollProgress(initialized);
  const mouse = useMouseParallax(true);
  useAmbientAudio(mode);

  useEffect(() => {
    setMouse(mouse);
  }, [mouse, setMouse]);

  useEffect(() => {
    loadDashboardExports()
      .then((payload) => {
        hydrate(payload);
        setDataStatus("OK");
      })
      .catch((err: unknown) => {
        setDataStatus("MOCK");
        setDataError(err instanceof Error ? err.message : "Failed to load pipeline data");
      });
  }, [hydrate, setDataStatus, setDataError]);

  // Block all native scroll — navigation is wheel-driven, not scroll-position-driven
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Scroll-driven: only active after initialization + any bridge tween completes.
  // Frozen while missile is active — cinematicT stays locked at CONFLICT_LOCK.
  useEffect(() => {
    setScroll(scroll);
    if (!initialized || missileActive) return;
    const { mode, t, orbit } = mapScrollToState(scroll);
    setMode(mode);
    setCinematicT(t);
    setAllowUserOrbit(orbit);
  }, [scroll, initialized, missileActive, setMode, setCinematicT, setScroll, setAllowUserOrbit]);

  useEffect(() => {
    // Prevent the browser from restoring scroll position on reload — always start at top.
    if (typeof window !== "undefined") {
      history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
    }

    setMode("BOOT");
    setAllowUserOrbit(false);
    setCinematicT(0);

    const driver = { p: 0 };
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    tl.to(driver, {
      duration: 3.0,
      p: 1,
      onUpdate() {
        setCinematicT(gsap.utils.mapRange(0, 1, 0, 0.12, driver.p));
      },
    });
    tl.to({}, { duration: 0.4 });

    // FIX: bridge tween from boot end-value (0.12) to wherever scroll landed during boot.
    // Without this, cinematicT would snap instantly on the first scroll event post-boot.
    tl.call(() => {
      const currentScroll = useExperienceStore.getState().scrollProgress;
      const { t: targetT } = mapScrollToState(currentScroll);

      if (Math.abs(targetT - 0.12) < 0.015) {
        // No meaningful gap — activate immediately.
        setInitialized(true);
        return;
      }

      const bridge = { t: 0.12 };
      gsap.to(bridge, {
        t: targetT,
        duration: 0.55,
        ease: "power2.inOut",
        onUpdate() {
          setCinematicT(bridge.t);
        },
        onComplete() {
          setInitialized(true);
        },
      });
    });

    return () => { tl.kill(); };
  }, [setMode, setAllowUserOrbit, setCinematicT, setInitialized]);

  return null;
}

// 7 scroll sections → 7 modes. Each section = 1/7 ≈ 14.3% of total scroll.
// cinematicT spans 0.12 (boot end) → 0.98 (full zoom).
function mapScrollToState(scroll: number): { mode: ExperienceMode; t: number; orbit: boolean } {
  const s = clamp01(scroll);
  const S = 1 / 7; // section width

  if (s < 1 * S) return { mode: "TYPOGRAPHY",          t: lerp(0.12, 0.22, ss(0 * S, 1 * S, s)), orbit: false };
  if (s < 2 * S) return { mode: "EARTH_REVEAL",        t: lerp(0.22, 0.40, ss(1 * S, 2 * S, s)), orbit: false };
  if (s < 3 * S) return { mode: "AIRSPACE_ACTIVATION", t: lerp(0.40, 0.56, ss(2 * S, 3 * S, s)), orbit: false };
  if (s < 4 * S) return { mode: "STRATEGIC_ORBIT",     t: lerp(0.56, 0.68, ss(3 * S, 4 * S, s)), orbit: false };
  if (s < 5 * S) return { mode: "FLY_TO_CONFLICT",     t: lerp(0.68, 0.84, ss(4 * S, 5 * S, s)), orbit: false };
  if (s < 6 * S) return { mode: "CONFLICT_LOCK",       t: lerp(0.84, 0.93, ss(5 * S, 6 * S, s)), orbit: false };
  return           { mode: "COMMAND_CENTER",            t: lerp(0.93, 0.98, ss(6 * S, 7 * S, s)), orbit: true  };
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp01(v: number) { return Math.min(1, Math.max(0, v)); }
function ss(e0: number, e1: number, x: number) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}
