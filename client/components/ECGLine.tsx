"use client";

import { useEffect, useRef } from "react";

export function ECGLine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = 200;
    };
    resize();

    const ecgPoints = [
      [0.0, 0.0],
      [0.08, 0.0],
      [0.1, 0.08],
      [0.12, 0.1],
      [0.14, 0.08],
      [0.18, 0.0],
      [0.2, -0.08],
      [0.22, 0.8],
      [0.24, -0.4],
      [0.26, 0.0],
      [0.3, 0.0],
      [0.34, 0.12],
      [0.38, 0.15],
      [0.42, 0.12],
      [0.48, 0.0],
      [1.0, 0.0],
    ];

    let progress = 0;
    let dotPos = 0;
    const speed = 0.004;

    let raf = 0;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      const midY = H / 2;
      ctx.clearRect(0, 0, W, H);

      const pts = ecgPoints.map(([x, y]) => ({
        x: x * W,
        y: midY - y * H * 0.35,
      }));

      ctx.beginPath();
      ctx.strokeStyle = "rgba(0, 201, 255, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(0, 201, 255, 0.2)";
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      const currentX = progress * W;
      let started = false;
      for (let i = 0; i < pts.length; i += 1) {
        if (pts[i].x <= currentX) {
          if (!started) {
            ctx.moveTo(pts[i].x, pts[i].y);
            started = true;
          } else {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
        } else {
          if (i > 0 && started) {
            const prev = pts[i - 1];
            const curr = pts[i];
            const t = (currentX - prev.x) / (curr.x - prev.x);
            const interY = prev.y + (curr.y - prev.y) * t;
            ctx.lineTo(currentX, interY);
          }
          break;
        }
      }
      ctx.stroke();

      if (progress > 0 && progress < 1) {
        ctx.beginPath();
        ctx.arc(currentX, midY, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#00C9FF";
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#00C9FF";
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (progress >= 1) {
        dotPos = (dotPos + speed * 0.5) % 1;
        const dotX = dotPos * W;
        let dotY = midY;
        for (let i = 1; i < pts.length; i += 1) {
          if (pts[i].x >= dotX) {
            const t = (dotX - pts[i - 1].x) / (pts[i].x - pts[i - 1].x);
            dotY = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t;
            break;
          }
        }
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 201, 255, 0.9)";
        ctx.shadowBlur = 16;
        ctx.shadowColor = "#00C9FF";
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      progress = Math.min(progress + speed, 1);
      raf = requestAnimationFrame(draw);
    };

    draw();

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: "55%",
        left: 0,
        width: "100%",
        height: "200px",
        pointerEvents: "none",
        zIndex: 1,
        transform: "translateY(-50%)",
      }}
    />
  );
}
