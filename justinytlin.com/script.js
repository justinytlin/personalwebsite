// Click-to-reveal email
function revealEmail(btn) {
    btn.textContent = 'justinytlin4[at]gmail.com';
    btn.classList.add('revealed');
    btn.onclick = null;
}

// Animate stat values counting up on load
function animateCount(el, target, isFloat, suffix) {
    const duration = 1800;
    const start = performance.now();
    const from = 0;
    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const val = from + (target - from) * eased;
        el.childNodes[0].textContent = isFloat ? val.toFixed(2) : Math.round(val).toString();
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// True 3D satellite renderer
function initSatellite() {
    const canvas = document.getElementById('orbitalCanvas');
    if (!canvas) return;

    function setSize() {
        const w = canvas.offsetWidth, h = canvas.offsetHeight;
        if (w > 0 && h > 0) { canvas.width = w; canvas.height = h; }
    }
    setSize();
    window.addEventListener('resize', setSize);

    const ctx = canvas.getContext('2d');
    const FOV = 480;

    function makeBox(ox, oy, oz, hx, hy, hz) {
        const v = (dx,dy,dz) => [ox+dx*hx, oy+dy*hy, oz+dz*hz];
        return [
            { pts:[v(-1,-1,-1),v(1,-1,-1),v(1,1,-1),v(-1,1,-1)], n:[0,0,-1]  },
            { pts:[v(1,-1,1),v(-1,-1,1),v(-1,1,1),v(1,1,1)],     n:[0,0,1]   },
            { pts:[v(-1,-1,1),v(-1,-1,-1),v(-1,1,-1),v(-1,1,1)],  n:[-1,0,0] },
            { pts:[v(1,-1,-1),v(1,-1,1),v(1,1,1),v(1,1,-1)],      n:[1,0,0]  },
            { pts:[v(-1,-1,1),v(1,-1,1),v(1,-1,-1),v(-1,-1,-1)],  n:[0,-1,0] },
            { pts:[v(-1,1,-1),v(1,1,-1),v(1,1,1),v(-1,1,1)],      n:[0,1,0]  },
        ];
    }
    function wb(ox,oy,oz,hx,hy,hz) {
        return makeBox(ox,oy,oz,hx,hy,hz).map(f => Object.assign(f,{col:'#fff'}));
    }

    // ── Geometry ──────────────────────────────────
    const bx=26, by=44, bz=18;
    const px=68, py=26, pz=2, gap=bx+10;

    const body   = wb(0, 0, 0, bx, by, bz);
    body[0].win  = true;                            // front: window + panels

    const topCap = wb(0, -(by+7),  0, 20, 7,  14); // sits on body top
    const mast   = wb(0, -(by+28), 0,  4, 14,  4); // antenna mast
    const dish   = wb(0, -(by+45), 0, 11,  3, 11); // dish head

    const botCap = wb(0,  by+5,    0, 18,  5, 14); // sits on body bottom
    const thrL   = wb(-13, by+14,  0,  5,  4,  5); // left thruster
    const thrR   = wb( 13, by+14,  0,  5,  4,  5); // right thruster

    const lBrk   = wb(-(bx+7), -2, -(bz-2),  3, 10, 4); // left panel bracket
    const rBrk   = wb(  bx+7,  -2, -(bz-2),  3, 10, 4); // right panel bracket

    const lp = wb(-(gap+px), 0, 0, px, py, pz);
    const rp = wb(  gap+px,  0, 0, px, py, pz);
    [lp, rp].forEach(panel => panel.forEach((f,i) => {
        f.grid = i < 2 ? { c:5, r:4 } : null;
    }));

    const ls = wb(-(bx+3), 0, 0, 3, 5, 3);
    const rs = wb(  bx+3,  0, 0, 3, 5, 3);

    const scene = [
        ...body, ...topCap, ...mast, ...dish,
        ...botCap, ...thrL, ...thrR,
        ...lBrk, ...rBrk,
        ...lp, ...rp, ...ls, ...rs
    ];

    // ── Transform helpers ─────────────────────────
    function rv(v, ax, ay, az) {
        let [x,y,z] = v;
        let y1=y*Math.cos(ax)-z*Math.sin(ax), z1=y*Math.sin(ax)+z*Math.cos(ax); y=y1; z=z1;
        let x2=x*Math.cos(ay)+z*Math.sin(ay), z2=-x*Math.sin(ay)+z*Math.cos(ay); x=x2; z=z2;
        let x3=x*Math.cos(az)-y*Math.sin(az), y3=x*Math.sin(az)+y*Math.cos(az);
        return [x3, y3, z];
    }
    function proj(v, s) { const d=FOV/(v[2]+FOV); return [v[0]*d*s, v[1]*d*s]; }

    // Bilinear interpolate within projected quad (p0=TL,p1=TR,p2=BR,p3=BL)
    function bi(p2, u, v) {
        const t=[p2[0][0]+(p2[1][0]-p2[0][0])*u, p2[0][1]+(p2[1][1]-p2[0][1])*u];
        const b=[p2[3][0]+(p2[2][0]-p2[3][0])*u, p2[3][1]+(p2[2][1]-p2[3][1])*u];
        return [t[0]+(b[0]-t[0])*v, t[1]+(b[1]-t[1])*v];
    }

    let t = 0;

    (function loop() {
        const W=canvas.width, H=canvas.height;
        if (!W||!H) { requestAnimationFrame(loop); return; }
        ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H); // explicit white bg

        const s = Math.min(W,H)/295;
        const ax = Math.sin(t*0.37)*0.35;
        const ay = t;
        const az = Math.sin(t*0.23)*0.1;

        const faceData = scene.map(face => {
            const tv = face.pts.map(p => rv(p,ax,ay,az));
            const tn = rv(face.n, ax, ay, az);
            const avgZ = tv.reduce((a,v)=>a+v[2],0)/tv.length;
            const p2 = tv.map(v => proj(v, s));
            return { p2, avgZ, nz: tn[2], grid: face.grid, win: face.win };
        });

        ctx.save();
        ctx.translate(W/2, H/2);

        faceData.filter(f=>f.nz<0.05).sort((a,b)=>b.avgZ-a.avgZ).forEach(({ p2, grid, win }) => {
            ctx.beginPath();
            ctx.moveTo(p2[0][0],p2[0][1]);
            p2.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));
            ctx.closePath();
            ctx.fillStyle='#fff'; ctx.fill();
            ctx.strokeStyle='#1e1e1e'; ctx.lineWidth=0.75; ctx.stroke();

            // Solar panel grid lines
            if (grid) {
                const [q0,q1,q2,q3]=p2;
                ctx.strokeStyle='#888'; ctx.lineWidth=0.3;
                for (let i=1; i<grid.c; i++) {
                    const u=i/grid.c;
                    ctx.beginPath();
                    ctx.moveTo(q0[0]+(q1[0]-q0[0])*u, q0[1]+(q1[1]-q0[1])*u);
                    ctx.lineTo(q3[0]+(q2[0]-q3[0])*u, q3[1]+(q2[1]-q3[1])*u);
                    ctx.stroke();
                }
                for (let i=1; i<grid.r; i++) {
                    const u=i/grid.r;
                    ctx.beginPath();
                    ctx.moveTo(q0[0]+(q3[0]-q0[0])*u, q0[1]+(q3[1]-q0[1])*u);
                    ctx.lineTo(q1[0]+(q2[0]-q1[0])*u, q1[1]+(q2[1]-q1[1])*u);
                    ctx.stroke();
                }
            }

            // Body front face: window + structural detail
            if (win) {
                // Oval viewport
                const wc=bi(p2,0.5,0.20), wl=bi(p2,0.27,0.20), wr=bi(p2,0.73,0.20);
                const wt=bi(p2,0.5,0.09), wb2=bi(p2,0.5,0.31);
                const rx=Math.hypot(wr[0]-wl[0],wr[1]-wl[1])/2;
                const ry=Math.hypot(wb2[0]-wt[0],wb2[1]-wt[1])/2;
                const ang=Math.atan2(p2[1][1]-p2[0][1],p2[1][0]-p2[0][0]);
                ctx.save();
                ctx.translate(wc[0],wc[1]); ctx.rotate(ang);
                ctx.beginPath(); ctx.ellipse(0,0,Math.max(rx,2),Math.max(ry,2),0,0,Math.PI*2);
                ctx.fillStyle='#fff'; ctx.fill();
                ctx.strokeStyle='#1e1e1e'; ctx.lineWidth=0.7; ctx.stroke();
                ctx.restore();

                // Horizontal seam lines
                ctx.strokeStyle='#444'; ctx.lineWidth=0.45;
                for (const yv of [0.38, 0.63]) {
                    const l=bi(p2,0.04,yv), r=bi(p2,0.96,yv);
                    ctx.beginPath(); ctx.moveTo(l[0],l[1]); ctx.lineTo(r[0],r[1]); ctx.stroke();
                }

                // Mid vent panel + internal louver lines
                {
                    const tl=bi(p2,0.06,0.41), tr=bi(p2,0.94,0.41);
                    const bl=bi(p2,0.06,0.61), br=bi(p2,0.94,0.61);
                    ctx.beginPath(); ctx.moveTo(tl[0],tl[1]); ctx.lineTo(tr[0],tr[1]);
                    ctx.lineTo(br[0],br[1]); ctx.lineTo(bl[0],bl[1]); ctx.closePath();
                    ctx.strokeStyle='#333'; ctx.lineWidth=0.5; ctx.stroke();
                    ctx.strokeStyle='#888'; ctx.lineWidth=0.28;
                    for (let j=1; j<=4; j++) {
                        const u=j/5;
                        const a=bi(p2, 0.06+u*0.88, 0.41), b=bi(p2, 0.06+u*0.88, 0.61);
                        ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke();
                    }
                }

                // Lower-right hatch panel
                {
                    const tl=bi(p2,0.52,0.67), tr=bi(p2,0.91,0.67);
                    const bl=bi(p2,0.52,0.87), br=bi(p2,0.91,0.87);
                    ctx.beginPath(); ctx.moveTo(tl[0],tl[1]); ctx.lineTo(tr[0],tr[1]);
                    ctx.lineTo(br[0],br[1]); ctx.lineTo(bl[0],bl[1]); ctx.closePath();
                    ctx.strokeStyle='#333'; ctx.lineWidth=0.5; ctx.stroke();
                    const ml=bi(p2,0.715,0.67), mr=bi(p2,0.715,0.87);
                    ctx.beginPath(); ctx.moveTo(ml[0],ml[1]); ctx.lineTo(mr[0],mr[1]);
                    ctx.strokeStyle='#999'; ctx.lineWidth=0.25; ctx.stroke();
                }

                // Lower-left port (concentric circles)
                {
                    const pc=bi(p2,0.26,0.78), pe=bi(p2,0.36,0.78);
                    const rad=Math.hypot(pe[0]-pc[0],pe[1]-pc[1]);
                    ctx.strokeStyle='#333'; ctx.lineWidth=0.45;
                    ctx.beginPath(); ctx.arc(pc[0],pc[1],Math.max(rad,2),0,Math.PI*2); ctx.stroke();
                    ctx.beginPath(); ctx.arc(pc[0],pc[1],Math.max(rad*0.52,1),0,Math.PI*2); ctx.stroke();
                }
            }
        });

        ctx.restore();
        t += 0.007;
        requestAnimationFrame(loop);
    })();
}

// Astronaut clipart with loopy path + dashed trail
function initAstronaut() {
    const canvas = document.getElementById('astronautCanvas');
    if (!canvas) return;

    let comets = null;

    function setSize() {
        const w = canvas.offsetWidth, h = canvas.offsetHeight;
        if (w > 0 && h > 0) { canvas.width = w; canvas.height = h; comets = null; }
    }
    setSize();
    window.addEventListener('resize', setSize);

    const ctx = canvas.getContext('2d');
    let t = 0;
    const trail = [];
    const TRAIL_MAX = 1700;

    const img = new Image();
    img.src = 'public/astronautclipart.png';

    const cometImg = new Image();
    cometImg.src = 'public/cometclipart.png';
    const NUM_COMETS = 7;
    const COMET_ANGLE = Math.PI * 0.75; // 135° — diagonal top-right → bottom-left

    (function loop() {
        const W = canvas.width, H = canvas.height;
        if (!W || !H) { requestAnimationFrame(loop); return; }
        ctx.clearRect(0, 0, W, H);

        // Init comets lazily (needs W/H)
        if (!comets) {
            comets = Array.from({ length: NUM_COMETS }, () => ({
                x: W * 0.45 + Math.random() * W * 0.6,
                y: Math.random() * H * 0.55 - 50,
                speed: 0.6 + Math.random() * 1.1,
                size:  14 + Math.random() * 18,
            }));
        }

        // Draw comets (behind everything else)
        if (cometImg.complete && cometImg.naturalWidth > 0) {
            const cdx = Math.cos(COMET_ANGLE), cdy = Math.sin(COMET_ANGLE);
            for (const c of comets) {
                c.x += cdx * c.speed;
                c.y += cdy * c.speed;
                if (c.x < -60 || c.y > H + 60) {
                    if (Math.random() < 0.5) {
                        c.x = W * 0.45 + Math.random() * W * 0.6;
                        c.y = -40 - Math.random() * 50;
                    } else {
                        c.x = W + 40 + Math.random() * 50;
                        c.y = Math.random() * H * 0.45 - 50;
                    }
                    c.speed = 0.6 + Math.random() * 1.1;
                    c.size  = 14 + Math.random() * 18;
                }
                const cs = c.size / Math.max(cometImg.naturalWidth, cometImg.naturalHeight);
                const ciw = cometImg.naturalWidth * cs, cih = cometImg.naturalHeight * cs;
                ctx.save();
                ctx.translate(c.x, c.y);
                ctx.rotate(COMET_ANGLE - Math.PI * 0.25);
                ctx.drawImage(cometImg, -ciw / 2, -cih / 2, ciw, cih);
                ctx.restore();
            }
        }

        // Earth → Moon path
        // Earth center (visible in panel): bottom-left ≈ (95, H-95); Moon: top-right ≈ (W-95, 190)
        const ex = 95, ey = H - 95;
        const mx = W - 95, my = 190;

        const PERIOD = 1600;                    // frames per one-way trip
        const u = (t % PERIOD) / PERIOD;        // 0 = earth, 1 = moon

        // Clear trail when a new trip starts
        if (t % PERIOD === 0) trail.length = 0;

        // Linear path from earth to moon
        const lx = ex + (mx - ex) * u;
        const ly = ey + (my - ey) * u;

        // Perpendicular direction to the path
        const pathAngle = Math.atan2(my - ey, mx - ex);
        const px = -Math.sin(pathAngle);
        const py =  Math.cos(pathAngle);

        // Sine-wave hills perpendicular to path, enveloped to 0 at both ends
        const envelope = Math.sin(u * Math.PI);
        const hillAmp  = Math.min(W, H) * 0.14;
        const hill = hillAmp * envelope * (
            0.55 * Math.sin(u * Math.PI * 4.0) +
            0.30 * Math.sin(u * Math.PI * 7.3 + 1.1) +
            0.15 * Math.sin(u * Math.PI * 12.9 + 2.4)
        );

        const x = lx + px * hill;
        const y = ly + py * hill;

        // (no wrap-blink check needed — round trip stays within bounds)
        trail.push({ x, y });
        if (trail.length > TRAIL_MAX) trail.shift();

        // Dashed trail
        if (trail.length > 2) {
            ctx.save();
            ctx.setLineDash([3, 8]);
            ctx.lineWidth = 1.1;
            ctx.strokeStyle = 'rgba(50,50,50,0.28)';
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);
            for (const p of trail) ctx.lineTo(p.x, p.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Draw clipart image — fade out near moon so reappearance at earth is smooth
        if (img.complete && img.naturalWidth > 0) {
            const alpha = u > 0.88 ? 1 - (u - 0.88) / 0.12 : 1;
            const size = H * 0.28;
            const scale = size / Math.max(img.naturalWidth, img.naturalHeight);
            const iw = img.naturalWidth * scale;
            const ih = img.naturalHeight * scale;
            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.translate(x, y);
            ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
            ctx.restore();
        }

        t++;
        requestAnimationFrame(loop);
    })();
}

window.addEventListener('load', () => {
    initSatellite();
    initAstronaut();
    const statDefs = [
        { selector: '.stat-item:nth-child(3) .stat-value', val: 408, float: false },
        { selector: '.stat-item:nth-child(4) .stat-value', val: 7.66, float: true },
        { selector: '.stat-item:nth-child(6) .stat-value', val: 98.3, float: true },
    ];
    statDefs.forEach(({ selector, val, float: isFloat }) => {
        const el = document.querySelector(selector);
        if (el) animateCount(el, val, isFloat);
    });
});
