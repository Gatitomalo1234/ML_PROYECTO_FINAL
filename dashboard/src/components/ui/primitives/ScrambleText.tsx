"use client";

import { useEffect, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";

export default function ScrambleText({ text, className }: { text: string; className?: string }) {
  const [displayed, setDisplayed] = useState(text);

  useEffect(() => {
    let iteration = 0;
    let animationFrame: number;

    const tick = () => {
      setDisplayed((current) => {
        return text
          .split("")
          .map((char, index) => {
            if (index < iteration || text[index] === " ") {
              return text[index];
            }
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("");
      });

      if (iteration >= text.length) {
        cancelAnimationFrame(animationFrame);
        return;
      }

      iteration += 1 / 3; 
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrame);
  }, [text]);

  return <span className={className}>{displayed}</span>;
}
