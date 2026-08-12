import React, { useEffect, useRef } from "react";

export function InteractiveMeshBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates around the center of the screen (-1 to 1)
      mouseRef.current.tx = (e.clientX / width) * 2 - 1;
      mouseRef.current.ty = (e.clientY / height) * 2 - 1;
    };

    const handleMouseLeave = () => {
      mouseRef.current.tx = 0;
      mouseRef.current.ty = 0;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // 3D Grid dimensions
    const cols = 55;
    const rows = 35;
    const gridWidth = 3200;
    const gridDepth = 2400;

    let time = 0;

    // Camera angles
    let rotateX = 0.55; // Pitch (looking down)
    let rotateY = 0.45; // Yaw (slight angle)
    const focalLength = 1200;

    // Pre-calculated grid plane points in relative coords (-1 to 1)
    const points: { rx: number; rz: number }[] = [];
    for (let r = 0; r < rows; r++) {
      const rz = (r / (rows - 1)) * 2 - 1; // -1 to 1
      for (let c = 0; c < cols; c++) {
        const rx = (c / (cols - 1)) * 2 - 1; // -1 to 1
        points.push({ rx, rz });
      }
    }

    const render = () => {
      time += 0.006;
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse follow for camera rotation (Parallax tilt)
      const mouse = mouseRef.current;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      // Dynamic tilt based on cursor coordinates
      const currentRotateX = rotateX + mouse.y * 0.08;
      const currentRotateY = rotateY + mouse.x * 0.12;

      // Project all 3D points
      const projected: { x: number; y: number; alpha: number }[] = [];

      points.forEach((p) => {
        // Calculate raw 3D position
        const posX = p.rx * (gridWidth / 2);
        const posZ = p.rz * (gridDepth / 2) + 200; // Offset depth to avoid clipping near plane

        // Height displacement (Y) using multi-octave rolling waves (sine & cosine combination)
        // This generates smooth rolling terrain peaks & valleys just like the image
        const d1 = Math.sin(p.rx * 3.5 + time) * 60;
        const d2 = Math.cos(p.rz * 4.0 - time * 0.8) * 50;
        const d3 = Math.sin((p.rx + p.rz) * 2.5 + time * 1.5) * 30;
        const posY = d1 + d2 + d3 + 120; // Shift down slightly

        // 3D Rotations around Y-axis (Yaw)
        const cosY = Math.cos(currentRotateY);
        const sinY = Math.sin(currentRotateY);
        let x1 = posX * cosY - posZ * sinY;
        let z1 = posX * sinY + posZ * cosY;

        // 3D Rotations around X-axis (Pitch)
        const cosX = Math.cos(currentRotateX);
        const sinX = Math.sin(currentRotateX);
        let y2 = posY * cosX - z1 * sinX;
        let z2 = posY * sinX + z1 * cosX;

        // Apply translation relative to the center/distance
        const finalX = x1;
        const finalY = y2 - 180; // Offset height for visibility
        const finalZ = z2 + 800; // Position camera back

        // Perspective Projection Formula: scale factor gets smaller as finalZ increases
        const scale = focalLength / finalZ;
        const screenX = width / 2 + finalX * scale;
        const screenY = height / 2 + finalY * scale;

        // Dynamic opacity based on depth (fog effect so background fades elegantly in the distance)
        const depthNormalized = (finalZ - 400) / (gridDepth + 800);
        const alpha = Math.max(0, 1 - depthNormalized);

        projected.push({ x: screenX, y: screenY, alpha });
      });

      // Render lines connecting the grid
      const isDarkMode = document.documentElement.classList.contains("dark");

      // Select base colors matching #13538A and #5D28A8
      const strokeR = isDarkMode ? 93 : 19;
      const strokeG = isDarkMode ? 40 : 83;
      const strokeB = isDarkMode ? 168 : 138;

      ctx.lineWidth = 0.55;

      // Draw horizontal lines (columns within each row)
      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        let activeLine = false;

        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const p = projected[idx];

          if (c === 0) {
            ctx.moveTo(p.x, p.y);
          } else {
            ctx.lineTo(p.x, p.y);
          }
          activeLine = true;
        }

        if (activeLine) {
          // Proportional gradient alpha based on first/average point depth
          const avgAlpha = projected[r * cols + Math.floor(cols / 2)].alpha;
          ctx.strokeStyle = `rgba(${strokeR}, ${strokeG}, ${strokeB}, ${avgAlpha * 0.08})`;
          ctx.stroke();
        }
      }

      // Draw vertical lines (rows within each column)
      for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        let activeLine = false;

        for (let r = 0; r < rows; r++) {
          const idx = r * cols + c;
          const p = projected[idx];

          if (r === 0) {
            ctx.moveTo(p.x, p.y);
          } else {
            ctx.lineTo(p.x, p.y);
          }
          activeLine = true;
        }

        if (activeLine) {
          const avgAlpha = projected[Math.floor(rows / 2) * cols + c].alpha;
          ctx.strokeStyle = `rgba(${strokeR}, ${strokeG}, ${strokeB}, ${avgAlpha * 0.08})`;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="threejs-auth-background"
      className="absolute inset-0 w-full h-full pointer-events-none z-0 block bg-[#f3f7fa] dark:bg-[#030712] transition-colors duration-300"
    />
  );
}
