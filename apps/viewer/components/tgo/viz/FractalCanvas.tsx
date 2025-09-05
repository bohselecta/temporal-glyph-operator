import React, { useEffect, useRef } from 'react';
import { useTGOStore } from "../../../state/tgoStore";

const SQRT3 = Math.sqrt(3);
const A = {x:0, y:0}, B={x:1, y:0}, C={x:.5, y:SQRT3/2};

function chaosStep(p:{x:number,y:number}, target:{x:number,y:number}) {
  return { x:(p.x+target.x)/2, y:(p.y+target.y)/2 };
}

export function FractalCanvas() {
  const ref = useRef<HTMLCanvasElement|null>(null);
  const { metrics } = useTGOStore();

  useEffect(()=>{
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let id:number;
    let p = {x:Math.random(), y:Math.random()*SQRT3/2};
    function draw() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
      // slow fade to show activity
      ctx.fillStyle = 'rgba(10,10,10,0.25)';
      ctx.fillRect(0,0,canvas.width,canvas.height);

      // project triangle
      const scale = Math.min(w, h*2/SQRT3) * 0.9;
      const ox = (w - scale)/2, oy = (h - scale*SQRT3/2)/2;
      function toXY(v:{x:number,y:number}){ return { x:ox+v.x*scale, y:oy+ (SQRT3/2 - v.y)*scale };}

      const k = 120 + Math.floor(metrics.throughput / 2000); // more ops → denser draw
      for (let i=0;i<k;i++){
        const t = Math.random();
        const target = (t<0.333?A:(t<0.666?B:C));
        p = chaosStep(p, target);
        const q = toXY(p);
        // intensity leans pink as convergence approaches
        const alpha = 0.35 + 0.5*Math.min(1, metrics.convergence);
        ctx.fillStyle = `rgba(255,100,180,${alpha})`;
        ctx.fillRect(q.x, q.y, 1, 1);
      }
      id = requestAnimationFrame(draw);
    }
    id = requestAnimationFrame(draw);
    return ()=> cancelAnimationFrame(id);
  }, [metrics.convergence, metrics.throughput]);

  return <canvas ref={ref} className="w-full aspect-video block bg-[#0a0a12]" />;
}
