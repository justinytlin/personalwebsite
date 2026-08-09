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

// Flipped true once the loading screen is dismissed — stops the satellite loop
let loadingScreenDone = false;

// True 3D satellite renderer (drives the loading screen)
function initSatellite() {
    const canvas = document.getElementById('orbitalCanvas');
    if (!canvas) return;

    function setSize() {
        const w = canvas.offsetWidth, h = canvas.offsetHeight;
        if (w > 0 && h > 0 && (w !== canvas.width || h !== canvas.height)) {
            canvas.width = w; canvas.height = h;
        }
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
        if (loadingScreenDone) return;
        const W=canvas.width, H=canvas.height;
        if (!W||!H) { requestAnimationFrame(loop); return; }
        ctx.clearRect(0,0,W,H); // transparent — panel background shows through

        const s = Math.min(W,H)/400;
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
        t += 0.03; // brisk spin — it's a loading indicator
        requestAnimationFrame(loop);
    })();
}

// Astronaut clipart with loopy path + dashed trail
function initAstronaut() {
    const canvas = document.getElementById('astronautCanvas');
    if (!canvas) return;

    let comets = null;
    const trail = [];
    const TRAIL_MAX = 1700;

    const ctx = canvas.getContext('2d');

    // Backing store is scaled by DPR so the sprites stay sharp on retina, but a
    // matching transform keeps all the drawing math below in CSS-pixel space
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = 0, cssH = 0;
    function setSize() {
        const w = canvas.offsetWidth, h = canvas.offsetHeight;
        if (w > 0 && h > 0 && (w !== cssW || h !== cssH)) {
            cssW = w; cssH = h;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // resizing resets this
            comets = null;
            trail.length = 0; // old trail points are invalid at the new size
        }
    }
    setSize();
    window.addEventListener('resize', setSize);

    let t = 0;

    const img = new Image();
    img.src = 'public/astronautclipart.png';

    const cometImg = new Image();
    cometImg.src = 'public/cometclipart.png';
    const NUM_COMETS = 4;
    const COMET_ANGLE = Math.PI * 0.75; // 135° — diagonal top-right → bottom-left

    function startLoop() {
    (function loop() {
        const W = cssW, H = cssH; // CSS-pixel space (see the DPR transform above)
        if (!W || !H) { requestAnimationFrame(loop); return; }
        ctx.clearRect(0, 0, W, H);

        // Init comets lazily (needs W/H)
        if (!comets) {
            // Wide initial spread — some start well above the panel so they
            // trickle in rather than all falling together
            comets = Array.from({ length: NUM_COMETS }, () => ({
                x: W * 0.45 + Math.random() * W * 0.6,
                y: Math.random() * H * 1.3 - H * 0.55,
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
                    // Respawn further out, with a randomized head start, so gaps
                    // between comets stay uneven instead of falling into a rhythm
                    const lead = Math.random() * H * 0.7;
                    if (Math.random() < 0.5) {
                        c.x = W * 0.45 + Math.random() * W * 0.6 + lead;
                        c.y = -40 - Math.random() * 60 - lead;
                    } else {
                        c.x = W + 40 + Math.random() * 60 + lead;
                        c.y = Math.random() * H * 0.45 - 50 - lead;
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
        // Earth center (visible in panel): bottom-left ≈ (95, H-95); Moon: top-right corner
        const ex = 95, ey = H - 95;
        const mx = W - 75, my = H * 0.22;

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
        const hillAmp = Math.min(W, H) * 0.14;
        const hillAt = (uu) => hillAmp * Math.sin(uu * Math.PI) * (
            0.55 * Math.sin(uu * Math.PI * 4.0) +
            0.30 * Math.sin(uu * Math.PI * 7.3 + 1.1) +
            0.15 * Math.sin(uu * Math.PI * 12.9 + 2.4)
        );
        const hill = hillAt(u);

        const size = Math.min(W, H) * 0.28; // astronaut sprite size

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
            const alpha = u > 0.96 ? 1 - (u - 0.96) / 0.04 : 1;
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
    } // end startLoop

    // Resolves when the sprites are loaded and the loop is running —
    // the loading screen waits on this
    return Promise.all([
        img.complete     ? Promise.resolve() : new Promise(r => { img.onload = r;      img.onerror = r; }),
        cometImg.complete ? Promise.resolve() : new Promise(r => { cometImg.onload = r; cometImg.onerror = r; }),
    ]).then(startLoop);
}

// [Preserved, currently unused] Conan sprite: runs in from the left, kicks the
// ball off-screen, loops. To re-enable, add <canvas id="conanCanvas"> back and
// call initConanKick() from initPage. public/conan-sprites.png is a baked
// mini-sheet (transparent, feet on a shared baseline at y+h=54) built from the
// GBA "Akatsuki no Monument" rip.
function initConanKick() {
    const canvas = document.getElementById('conanCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const RUN    = [[0, 6, 43, 48], [46, 5, 33, 49], [82, 3, 33, 51]];
    const WIND   = [118, 10, 31, 44];
    const STRIKE = [152, 11, 34, 43];
    const BALL   = [189, 43, 11, 11];
    const S = 1.5;                 // sprite scale (CSS px per sheet px)
    const RUN_SPEED = 1.4;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function setSize() {
        const w = Math.round(canvas.offsetWidth * dpr), h = Math.round(canvas.offsetHeight * dpr);
        if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
            canvas.width = w;
            canvas.height = h;
        }
    }
    setSize();
    window.addEventListener('resize', setSize);

    const sheet = new Image();
    sheet.src = 'public/conan-sprites.png';

    let conanX, ball, state, tick, stateT, waitT;
    function reset(W) {
        conanX = -60;
        ball = { x: W * 0.7, up: 0, vx: 0, vy: 0 };
        state = 'run';
        tick = 0; stateT = 0; waitT = 0;
    }
    reset(canvas.offsetWidth || 400);

    let started = false;
    sheet.onload = function loopStart() {
        if (started) return;
        started = true;
        (function loop() {
            const W = canvas.width / dpr, H = canvas.height / dpr;
            if (!W || !H) { requestAnimationFrame(loop); return; }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = false; // canvas resize resets this
            ctx.clearRect(0, 0, W, H);
            const ground = H - 2;

            // Conan reaches the ball when his front foot meets it
            const kickPoint = ball.x - 30 * S;

            if (state === 'run') {
                conanX += RUN_SPEED;
                if (conanX >= kickPoint) { state = 'wind'; stateT = 0; }
            } else if (state === 'wind') {
                if (++stateT > 9) {
                    state = 'strike'; stateT = 0;
                    ball.vx = 6.5; ball.vy = 2.4; // launched
                }
            } else if (state === 'strike') {
                if (++stateT > 14) { state = 'follow'; }
            } else if (state === 'follow') {
                conanX += RUN_SPEED * 1.25;
                if (conanX > W + 60) { state = 'wait'; waitT = 0; }
            } else if (state === 'wait') {
                if (++waitT > 110) reset(W);
            }

            // Ball physics (up = px above ground, small bounces)
            if (ball.vx > 0) {
                ball.x += ball.vx;
                ball.up += ball.vy;
                ball.vy -= 0.28;
                if (ball.up < 0) { ball.up = 0; ball.vy = Math.abs(ball.vy) * 0.45; }
            }

            // Ball
            const bw = BALL[2] * S, bh = BALL[3] * S;
            if (ball.x < W + bw) {
                ctx.drawImage(sheet, BALL[0], BALL[1], BALL[2], BALL[3],
                    ball.x, ground - bh - ball.up, bw, bh);
            }

            // Conan
            let f;
            if (state === 'wind') f = WIND;
            else if (state === 'strike') f = STRIKE;
            else f = RUN[Math.floor(tick / 7) % RUN.length];
            if (state !== 'wait') {
                ctx.drawImage(sheet, f[0], f[1], f[2], f[3],
                    conanX, ground - f[3] * S, f[2] * S, f[3] * S);
            }

            tick++;
            requestAnimationFrame(loop);
        })();
    };
    if (sheet.complete && sheet.naturalWidth > 0) sheet.onload();
}

// Ultra Instinct Goku fires his ultimate attack across the desc-panel strip.
// public/goku-sprites.png is baked from Woothrad's UI Goku sheet (ULTIMATE
// section); the diagonal blast was rotated horizontal and split into
// muzzle / beam-slice / head so the beam can stretch to any length.
function initGokuUltimate() {
    const canvas = document.getElementById('gokuCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const DASH   = [[0,62,54,55],[57,63,48,54],[108,60,52,57],[163,61,50,56]];
    const CHARGE = [[216,46,60,71],[279,46,59,71],[341,46,59,71]];
    const FIRE   = [403,42,49,75];
    const MUZZLE = [455,0,132,117];
    const BEAM   = [590,0,6,117];
    const HEAD   = [599,0,159,117];
    const FLIP   = [[761,42,46,75],[810,38,50,79],[863,55,61,62],[927,48,44,69]];
    const FLASH  = [974,41,62,76];
    const LEAN   = [[1039,58,57,59],[1099,51,51,66]];
    const LAUNCH = [1153,60,37,57];
    const LIE    = [[1193,94,60,23],[1256,88,49,29]];
    const TRANS  = [[1308,63,32,54],[1343,62,32,55],[1378,61,32,56],[1413,59,34,58],
                    [1450,62,33,55],[1486,60,31,57],[1520,58,35,59],[1558,58,34,59],
                    [1595,58,38,59],[1636,58,35,59],[1674,58,35,59],[1712,58,35,59]];
    const AURA   = [[1750,29,69,88],[1822,54,50,63],[1875,56,48,61]];
    const IDLE   = [[1926,53,49,64],[1978,54,50,63],[2031,56,48,61]]; // aura never drops post-transform
    // Ultra Ego Vegeta (baked mirrored — faces left, toward Goku)
    const VSTAND = [2208,51,34,66];
    const VBRACE = [2265,66,40,51];
    const VREEL  = [2326,69,38,48];
    const VDOWN  = [2367,89,58,28];
    // His aerial transformation: SSB hover → power builds → Ultra Ego aura
    const VT = [[2428,69,29,48],[2460,67,31,50],[2494,75,29,42],[2526,75,29,42],
                [2558,70,29,47],[2590,70,29,47],[2622,66,31,51],[2656,59,37,58],
                [2696,61,39,56],[2738,69,42,48],[2783,47,59,70],[2845,60,64,57],
                [2912,66,69,51],[2984,69,52,48]];
    const VAURA = [[3039,47,72,70],[3114,46,79,71]];
    // Touchdown: aura collapses through the crouch frames before he stands
    const VLAND = [[3196,37,72,80],[3271,68,53,49],[3327,70,27,47]];
    const VEG_HOVER_BOTTOM = 70;  // hover height (feet); descent interpolates from here to ground
    const VT_TICKS = 16;          // ticks per aerial transformation frame
    const VEG_CX = (w) => w - 50; // one shared center axis for all of Vegeta's frames
    const SB = 0.62;          // blast scale
    const STAND_X = 26;       // where Goku charges on the ground
    const JUMP_T = 72;        // ticks to rise to the apex (slow, deliberate tumble)
    const TRANS_TICKS = 14;   // ticks per transformation frame
    const JUMP_H = 44;        // apex height (px)
    const JUMP_DRIFT = 38;    // rightward drift while rising

    // Pixel terrain (DBZ wasteland style): tan earth with green meadow patches,
    // generated once per width on an offscreen canvas
    const GROUND_H = 14;
    let groundTex = null;
    function buildGround(w) {
        const g = document.createElement('canvas');
        g.width = Math.max(1, Math.round(w));
        g.height = GROUND_H;
        const c = g.getContext('2d');
        c.fillStyle = '#e6d09a';                       // sand base
        c.fillRect(0, 4, g.width, GROUND_H - 4);
        // heavy two-tone sand dither in 2px blocks
        for (let i = 0; i < g.width / 1.6; i++) {
            c.fillStyle = Math.random() < 0.6 ? '#d8bd7f' : '#f0dfae';
            c.fillRect(Math.floor(Math.random() * g.width / 2) * 2,
                4 + Math.floor(Math.random() * (GROUND_H - 5) / 2) * 2, 2, 2);
        }
        let x = 0;
        while (x < g.width) {
            const run = 26 + Math.random() * 80;
            if (Math.random() < 0.8) {                 // grass patch
                c.fillStyle = '#3f9c30';               // dark under-edge
                c.fillRect(x, 3, run, 6);
                c.fillStyle = '#67c74b';               // bright top
                c.fillRect(x, 2, run, 5);
                // internal dither: dark + light green blocks through the patch
                for (let i = 0; i < run / 2.2; i++) {
                    c.fillStyle = Math.random() < 0.55 ? '#3f9c30' : '#8ede5c';
                    c.fillRect(x + Math.floor(Math.random() * run / 2) * 2,
                        2 + Math.floor(Math.random() * 3) * 2, 2, 2);
                }
                for (let tx = x; tx < x + run - 2; tx += 3) { // jagged tufts
                    if (Math.random() < 0.55) {
                        c.fillStyle = Math.random() < 0.3 ? '#8ede5c' : '#67c74b';
                        c.fillRect(tx, Math.random() < 0.5 ? 0 : 1, 2, 2);
                    }
                }
                // dithered grass→sand transition along the bottom edge
                for (let tx = x; tx < x + run; tx += 2) {
                    if (Math.random() < 0.5) {
                        c.fillStyle = '#e6d09a';
                        c.fillRect(tx, 8, 2, 2);
                    }
                }
                // stepped patch ends instead of hard vertical cuts
                c.fillStyle = '#e6d09a';
                c.fillRect(x, 2, 2, 2); c.fillRect(x + run - 2, 2, 2, 2);
            } else if (Math.random() < 0.4) {          // bare stretch: a small mound
                c.fillStyle = '#cdb173';
                const mx = x + run * 0.4;
                c.fillRect(mx, 2, 8, 2);
                c.fillRect(mx + 2, 1, 4, 1);
            }
            x += run + 6 + Math.random() * 18;
        }
        return g;
    }

    // Sky: banded pixel gradient, dithered boundaries, plus grain scattered
    // through every band so the pixels read everywhere — and the bottom band
    // stays clearly blue (no white haze over the ground)
    const SKY_SHADES = ['#b7dcf3', '#c3e3f6', '#cfe9f8', '#d9eefa', '#dff2fb'];
    const PX = 3; // small but obvious pixel size
    let skyTex = null;
    function buildSky(w, h) {
        const g = document.createElement('canvas');
        g.width = Math.max(1, Math.round(w));
        g.height = h;
        const c = g.getContext('2d');
        const bandH = Math.ceil(h / SKY_SHADES.length);
        SKY_SHADES.forEach((shade, i) => {
            c.fillStyle = shade;
            c.fillRect(0, i * bandH, g.width, bandH);
        });
        // checkerboard dither along each band boundary
        for (let i = 1; i < SKY_SHADES.length; i++) {
            const by = i * bandH;
            for (let row = -2; row <= 1; row++) {
                for (let x = 0; x < g.width; x += PX) {
                    if (((x / PX) + row) % 2 !== 0) continue;
                    c.fillStyle = row < 0 ? SKY_SHADES[i] : SKY_SHADES[i - 1];
                    c.fillRect(x, by + row * PX, PX, PX);
                }
            }
        }
        // grain: neighbor-shade pixels sprinkled through each band
        for (let i = 0; i < SKY_SHADES.length; i++) {
            const neighbors = [SKY_SHADES[i - 1], SKY_SHADES[i + 1]].filter(Boolean);
            const n = (g.width * bandH) / 160;
            for (let k = 0; k < n; k++) {
                c.fillStyle = neighbors[Math.floor(Math.random() * neighbors.length)];
                const gx = Math.floor(Math.random() * g.width / PX) * PX;
                const gy = i * bandH + Math.floor(Math.random() * bandH / PX) * PX;
                c.fillRect(gx, gy, PX, PX);
            }
        }
        return g;
    }

    // Clouds: broken, wandering line-wisps — mystical cirrus streaks, not
    // block cumulus. Tiles horizontally so it can drift without a seam.
    let cloudTex = null;
    function buildClouds(w, h) {
        const g = document.createElement('canvas');
        g.width = Math.max(1, Math.round(w));
        g.height = h;
        const c = g.getContext('2d');
        const W2 = g.width;
        c.fillStyle = '#ffffff';
        const wisp = (startX, startY, len, alpha) => {
            let x = startX, y = startY, traveled = 0;
            while (traveled < len) {
                const seg = 8 + Math.random() * 26;
                const hgt = Math.random() < 0.25 ? 2 : 1;
                c.globalAlpha = alpha * (0.7 + Math.random() * 0.5);
                for (const ox of [-W2, 0, W2]) {
                    c.fillRect(Math.round(x + ox), Math.round(y), Math.round(seg), hgt);
                }
                x += seg + (Math.random() < 0.4 ? 3 + Math.random() * 14 : 0); // ragged gaps
                y += Math.random() < 0.55 ? 0 : (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.8 ? 1 : 2);
                traveled = x - startX;
            }
        };
        for (let i = 0; i < 15; i++) {
            wisp(Math.random() * W2, 6 + Math.random() * (h - 20),
                 50 + Math.random() * 170, 0.18 + Math.random() * 0.3);
        }
        // a few brighter short accents
        for (let i = 0; i < 4; i++) {
            wisp(Math.random() * W2, 10 + Math.random() * (h - 30),
                 25 + Math.random() * 50, 0.55);
        }
        // larger stepped pixel cumulus — flat base, lumpy stepped top
        const bigCloud = (cx, baseY, wdt, a) => {
            c.globalAlpha = a;
            const rows = 4 + Math.floor(Math.random() * 3);
            for (let r = 0; r < rows; r++) {
                const shrink = r * (wdt / (rows + 1)) + Math.random() * 8;
                const rw = Math.max(6, wdt - shrink);
                const rx = cx - rw / 2 + (Math.random() * 6 - 3);
                for (const ox of [-W2, 0, W2]) {
                    c.fillRect(Math.round(rx + ox), Math.round(baseY - (r + 1) * 3), Math.round(rw), 3);
                }
            }
        };
        for (let i = 0; i < 3; i++) {
            bigCloud(Math.random() * W2, 22 + Math.random() * (h * 0.45),
                     46 + Math.random() * 50, 0.85);
        }
        c.globalAlpha = 1;
        return g;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function setSize() {
        const w = Math.round(canvas.offsetWidth * dpr), h = Math.round(canvas.offsetHeight * dpr);
        if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
            canvas.width = w;
            canvas.height = h;
            groundTex = buildGround(canvas.offsetWidth);
            skyTex = buildSky(canvas.offsetWidth, canvas.offsetHeight - GROUND_H);
            cloudTex = buildClouds(canvas.offsetWidth, canvas.offsetHeight - GROUND_H);
        }
    }
    setSize();
    window.addEventListener('resize', setSize);

    const sheet = new Image();
    sheet.src = 'public/goku-sprites.png';

    let gokuX, state, stateT, tick, beamLen, blastAlpha, vegHit, vegHitT, vegPreT, vegLandT;
    function reset() {
        // The loop opens on the TRANSFORM-2 sequence: Goku is down, rises,
        // and powers up to Ultra Instinct before the attack run begins
        gokuX = STAND_X;
        state = 'down';
        stateT = 0; tick = 0;
        beamLen = 0; blastAlpha = 1;
        vegHit = false; vegHitT = 0; vegPreT = 0; vegLandT = 0;
    }
    reset();

    function drawSprite(f, x, ground) {
        ctx.drawImage(sheet, f[0], f[1], f[2], f[3], x, ground - f[3], f[2], f[3]);
    }

    let started = false;
    sheet.onload = function loopStart() {
        if (started) return;
        started = true;
        (function loop() {
            const W = canvas.width / dpr, H = canvas.height / dpr;
            if (!W || !H) { requestAnimationFrame(loop); return; }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, W, H);
            // Feet sink a couple px into the terrain so they read as planted
            const ground = H - GROUND_H + 4;
            const firing = state === 'fire' || state === 'hold';

            // Screen shake while the beam is live
            if (firing) {
                ctx.translate((Math.random() - 0.5) * 2.6, (Math.random() - 0.5) * 1.6);
            }

            // Sky, drifting clouds, then terrain — all behind the fighters.
            // The bottom sky shade also backs the ground band, so the terrain's
            // transparent top rows show blue instead of a blank gap
            if (skyTex) ctx.drawImage(skyTex, 0, 0);
            else { ctx.fillStyle = SKY_SHADES[2]; ctx.fillRect(0, 0, W, H - GROUND_H); }
            ctx.fillStyle = SKY_SHADES[SKY_SHADES.length - 1];
            ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
            if (cloudTex) {
                const off = (tick * 0.25) % W;   // visible drift — the sky keeps
                ctx.drawImage(cloudTex, -off, 0); // cycling between loops
                ctx.drawImage(cloudTex, W - off, 0);
            }
            if (groundTex) ctx.drawImage(groundTex, 0, H - GROUND_H);

            stateT++;
            // Prologue (TRANSFORM-2 sheet order): down → stir → hair rises frame
            // by frame → aura burst → beat → scene cut into the attack run
            if (state === 'down') {
                if (stateT > 55) { state = 'stir'; stateT = 0; }
            } else if (state === 'stir') {
                if (stateT > 40) { state = 'transform'; stateT = 0; }
            } else if (state === 'transform') {
                if (stateT >= TRANS.length * TRANS_TICKS) { state = 'burst'; stateT = 0; }
            } else if (state === 'burst') {
                if (stateT > 63) { state = 'powered'; stateT = 0; }
            } else if (state === 'powered') {
                // Settle into the aura idle, then straight into the charge —
                // the dash-in was cut so the aura never drops post-transform
                if (stateT > 44) { state = 'charge'; stateT = 0; }
            }
            // Attack run: charge on the ground → lean into the jump →
            // rise through the tumbles → instinct flash → launch → fire from the air
            else if (state === 'charge') {
                if (stateT > 118) { state = 'windup'; stateT = 0; }
            } else if (state === 'windup') {
                if (stateT > 16) { state = 'jump'; stateT = 0; }
            } else if (state === 'jump') {
                if (stateT >= JUMP_T) { state = 'flash'; stateT = 0; }
            } else if (state === 'flash') {
                if (stateT > 12) { state = 'launch'; stateT = 0; }
            } else if (state === 'launch') {
                if (stateT > 6) { state = 'fire'; stateT = 0; }
            } else if (state === 'fire') {
                beamLen += W * 0.09;
                if (beamLen >= Math.hypot(W, H) + 200) { state = 'hold'; stateT = 0; }
            } else if (state === 'hold') {
                if (stateT > 85) { state = 'fade'; stateT = 0; }
            } else if (state === 'fade') {
                blastAlpha = Math.max(0, 1 - stateT / 22);
                if (stateT > 26) { state = 'drop'; stateT = 0; }
            } else if (state === 'drop') {
                if (stateT > 16) { state = 'stand'; stateT = 0; }
            } else if (state === 'stand') {
                if (stateT > 14) { state = 'wait'; stateT = 0; }
            } else if (state === 'wait') {
                if (stateT > 95) reset();
            }

            // Height above ground: rises during the jump, hovers while firing, falls after
            let lift = 0;
            const airborne = ['flash', 'launch', 'fire', 'hold', 'fade'].includes(state);
            if (state === 'jump') {
                lift = JUMP_H * Math.sin((Math.PI / 2) * Math.min(stateT / JUMP_T, 1));
                gokuX = STAND_X + JUMP_DRIFT * Math.min(stateT / JUMP_T, 1);
            } else if (airborne) {
                lift = JUMP_H;
            } else if (state === 'drop') {
                const p = Math.min(stateT / 16, 1);
                lift = JUMP_H * (1 - p * p); // accelerating fall
            }

            // Goku
            let f;
            if (state === 'down') f = LIE[0];
            else if (state === 'stir') f = LIE[1];
            else if (state === 'transform') f = TRANS[Math.min(TRANS.length - 1, Math.floor(stateT / TRANS_TICKS))];
            else if (state === 'burst') f = AURA[Math.floor(stateT / 9) % AURA.length];
            else if (state === 'powered') f = IDLE[Math.floor(stateT / 11) % IDLE.length];
            else if (state === 'charge') f = stateT > 100 ? CHARGE[2] : CHARGE[Math.floor(stateT / 9) % 2];
            else if (state === 'windup') f = stateT <= 8 ? LEAN[0] : LEAN[1];
            else if (state === 'jump') f = FLIP[Math.min(3, Math.floor((stateT / JUMP_T) * 4))];
            else if (state === 'flash') f = FLASH;
            else if (state === 'launch') f = LAUNCH;
            else if (firing || state === 'fade') f = FIRE;
            else if (state === 'drop') f = stateT <= 8 ? FLIP[3] : DASH[0];
            else f = CHARGE[0]; // stand: settle before the loop resets
            if (state !== 'wait') drawSprite(f, gokuX, ground - lift);

            // Vegeta (Ultra Ego): transforms up high, descends still wrapped in
            // his aura, and only sheds it on touchdown. Drawn before the blast
            // so the beam engulfs him on impact.
            if (state !== 'wait') {
                let vf = null, vTop = 0, jx = 0;
                if (vegHit) {
                    if (vegHitT <= 12) { vf = VBRACE; vTop = ground - VBRACE[3]; }
                    else if (state === 'fire' || state === 'hold') {
                        vf = VREEL; vTop = ground - VREEL[3];
                        jx = (Math.random() - 0.5) * 3;   // rattled inside the beam
                    } else { vf = VDOWN; vTop = ground - VDOWN[3]; }
                } else if (state === 'down' || state === 'stir' || state === 'transform'
                        || state === 'burst' || state === 'powered') {
                    // Aerial transformation, in parallel with Goku's on the ground:
                    // SSB hover during the quiet opening, then the power-up frames,
                    // then the full Ultra Ego aura flicker until he descends
                    vegPreT++;
                    let bob = 0;
                    if (vegPreT < 95) { vf = VT[0]; bob = Math.sin(tick * 0.07) * 4; }
                    else if (vegPreT < 95 + (VT.length - 1) * VT_TICKS) {
                        vf = VT[Math.min(VT.length - 1, 1 + Math.floor((vegPreT - 95) / VT_TICKS))];
                    } else {
                        vf = VAURA[Math.floor(tick / 9) % 2];
                    }
                    // center-anchored so wide aura frames stay put
                    ctx.drawImage(sheet, vf[0], vf[1], vf[2], vf[3],
                        VEG_CX(W) - vf[2] / 2, VEG_HOVER_BOTTOM - vf[3] + bob, vf[2], vf[3]);
                    vf = null; // already drawn
                } else if (state === 'charge' && stateT < 110) {
                    // Descends still blazing — aura only dies at touchdown
                    const p = stateT / 110;
                    const e = p * p * (3 - 2 * p);
                    const af = VAURA[Math.floor(tick / 9) % 2];
                    const bottom = VEG_HOVER_BOTTOM + (ground - VEG_HOVER_BOTTOM) * e;
                    ctx.drawImage(sheet, af[0], af[1], af[2], af[3],
                        VEG_CX(W) - af[2] / 2, bottom - af[3], af[2], af[3]);
                    vf = null; // already drawn
                } else {
                    // Landed: the aura collapses through the crouch frames,
                    // then he rises into the arms-crossed stand
                    vegLandT++;
                    if (vegLandT < 12) vf = VLAND[0];
                    else if (vegLandT < 22) vf = VLAND[1];
                    else if (vegLandT < 32) vf = VLAND[2];
                    else vf = VSTAND;
                    vTop = ground - vf[3];
                }
                if (vf) ctx.drawImage(sheet, vf[0], vf[1], vf[2], vf[3],
                    VEG_CX(W) - vf[2] / 2 + jx, vTop, vf[2], vf[3]);
            }

            // Blast — fired from the air, angled down toward the bottom-right corner
            if (firing || state === 'fade') {
                const mw = MUZZLE[2] * SB, mh = MUZZLE[3] * SB;
                const hw = HEAD[2] * SB,  hh = HEAD[3] * SB;
                const mx = gokuX + FIRE[2] - 8;                 // his palms
                const cy = ground - lift - FIRE[3] + 40;
                const theta = Math.atan2((H - 20) - cy, (W - 30) - mx);
                const pulse = 1 + 0.05 * Math.sin(tick * 0.55);

                // The beam front reaching Vegeta is what knocks him down
                if (!vegHit && (state === 'fire' || state === 'hold')) {
                    const distToVeg = Math.hypot((W - 50) - mx, (ground - 30) - cy);
                    if (mw + beamLen >= distToVeg) { vegHit = true; vegHitT = 0; }
                }
                if (vegHit) vegHitT++;
                ctx.save();
                ctx.globalAlpha = blastAlpha * (firing ? (0.92 + 0.08 * Math.sin(tick * 0.9)) : 1);
                ctx.translate(mx, cy);
                ctx.rotate(theta);
                ctx.drawImage(sheet, MUZZLE[0], MUZZLE[1], MUZZLE[2], MUZZLE[3],
                    0, -mh * pulse / 2, mw, mh * pulse);
                const beamW = Math.min(beamLen, Math.hypot(W, H));
                if (beamW > 0) {
                    ctx.drawImage(sheet, BEAM[0], BEAM[1], BEAM[2], BEAM[3],
                        mw - 1, -hh * pulse / 2, beamW + 2, hh * pulse);
                }
                if (beamLen < Math.hypot(W, H) + hw) {          // head until it exits
                    ctx.drawImage(sheet, HEAD[0], HEAD[1], HEAD[2], HEAD[3],
                        mw + beamLen - hw * 0.25, -hh * pulse / 2, hw, hh * pulse);
                }
                ctx.restore();
            }

            tick++;
            requestAnimationFrame(loop);
        })();
    };
    if (sheet.complete && sheet.naturalWidth > 0) sheet.onload();
}

// Mac-style terminal for exploring Justin's background
function initTerminal() {
    const body = document.getElementById('terminalBody');
    const output = document.getElementById('terminalOutput');
    const input = document.getElementById('terminalInput');
    if (!body || !output || !input) return;

    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const link = (url, label) => `<a href="${url}" target="_blank" rel="noopener">${label || url}</a>`;

    const COMMANDS = {
        help: () => [
            '<span class="t-dim">Available commands:</span>',
            '  <span class="t-cmd">about</span>       who I am',
            '  <span class="t-cmd">education</span>   where I study',
            '  <span class="t-cmd">research</span>    labs + research work',
            '  <span class="t-cmd">projects</span>    startups + things I build',
            '  <span class="t-cmd">pubs</span>        publications',
            '  <span class="t-cmd">awards</span>      honors + awards',
            '  <span class="t-cmd">hobbies</span>     what I do off-duty',
            '  <span class="t-cmd">contact</span>     how to reach me',
            '  <span class="t-cmd">clear</span>       clear the screen',
        ],
        about: () => [
            '<span class="t-accent">Justin Lin</span> — 19, neuroscience student at UCLA.',
            'Passionate about bioinformatics, space exploration, and startups.',
            'Cleft palate patient turned patient advocate (Operation Smile,',
            'Ensuring Lasting Smiles Act). Off-duty: tennis, gym, speedcubing.',
        ],
        education: () => [
            '<span class="t-accent">University of California, Los Angeles</span> (2025–2029)',
            'B.S. Neuroscience, Disability Studies minor',
            '<span class="t-dim">Orgs: CruX Neurotech · Bruin Ventures · VEST · Operation Smile</span>',
        ],
        research: () => [
            '<span class="t-accent">UCLA DGSOM Craniofacial Regeneration Lab</span> <span class="t-dim">(2025–now)</span>',
            '  ML model for automated craniofacial defect segmentation;',
            '  radiomics + spatial transcriptomics of biomaterials',
            '<span class="t-accent">Univ. of Pittsburgh Trivedi Institute</span> <span class="t-dim">(2026–now)</span>',
            '  ML astronaut digital twin — NASA OSDR + SPOKE knowledge graph',
            '<span class="t-accent">NASA GeneLab Multi-Omics &amp; Alzheimer\'s AWG</span> <span class="t-dim">(2024–now)</span>',
            '  First author: spaceflight &amp; hippocampal transport pathways',
            '<span class="t-accent">Huntington Medical Research Institutes</span> <span class="t-dim">(2023–now)</span>',
            '  GABA signaling in brain development; migraine neurobiology',
            '<span class="t-dim">+ meta-analyses: stroke biomarkers (21,570 patients);</span>',
            '<span class="t-dim">  cleft palate speech outcomes</span>',
        ],
        projects: () => [
            `<span class="t-accent">Bioscript</span> — founder &amp; CEO. AI copilot for academic papers. ${link('https://bioscriptai.com', 'bioscriptai.com')}`,
            `<span class="t-accent">OPTRA Labs</span> — CTO, founding engineer. ${link('https://startup.optra-labs.com', 'startup.optra-labs.com')}`,
            '<span class="t-accent">CruX Neurotech</span> — led 5-person team building a motor-imagery',
            '  EEG classifier controlling a multi-grasp prosthetic hand',
        ],
        pubs: () => [
            '1. Selective Vulnerability of GABAergic Neurons in Chronic',
            '   Migraine <span class="t-dim">(J. Headache and Pain, 2025)</span>',
            '2. Protein Biomarkers for Stroke vs TIA: A Meta-Analysis',
            '   <span class="t-dim">(medRxiv, 2025)</span>',
            '3. Alveolar Bone Grafts vs Orthognathic Surgery on Cleft Palate',
            '   Speech <span class="t-dim">(J. Emerging Investigators, 2024)</span>',
            '4. Surgery &amp; Paediatric Medical Traumatic Stress <span class="t-dim">(Medic Mentor, 2024)</span>',
            '5. Cleft Palate Development: Epigenetic Influences <span class="t-dim">(ASHG, 2024)</span>',
            '<span class="t-dim">Full citations in the PUBLICATIONS panel ←</span>',
        ],
        awards: () => [
            '· 2025 Regeneron Science Talent Search (STS) Scholar',
            '· 2025 Cameron Impact Scholarship Finalist',
            '· Eagle Scout — Certificate of Congressional Recognition',
        ],
        contact: () => [
            `email    ${link('mailto:justinytlin4@gmail.com', 'justinytlin4@gmail.com')}`,
        ],
        hobbies: () => [
            'In my free time, I like playing tennis, going to the gym,',
            'and speed solving Rubik\'s cubes.',
        ],
        whoami: () => ['justin — but you can call me the guy on the rocket ↖'],
        ls: () => ['<span class="t-cmd">about  education  research  projects  pubs  awards  hobbies  contact</span>'],
        sudo: () => ['<span class="t-err">justin is not in the sudoers file. This incident will be reported.</span>'],
    };

    function print(lines, cls) {
        for (const l of lines) {
            const div = document.createElement('div');
            div.className = 't-line' + (cls ? ' ' + cls : '');
            div.innerHTML = l;
            output.appendChild(div);
        }
        body.scrollTop = body.scrollHeight;
    }

    const history = [];
    let histIdx = -1;

    function run(raw) {
        const cmd = raw.trim();
        print([`<span class="t-cmd">justin@ucla:~$</span> ${esc(cmd)}`]);
        if (!cmd) return;
        history.push(cmd);
        histIdx = history.length;
        const key = cmd.toLowerCase().split(/\s+/)[0];
        if (key === 'clear') { output.innerHTML = ''; return; }
        const handler = COMMANDS[key];
        if (handler) {
            print(handler());
        } else {
            print([`<span class="t-err">zsh: command not found: ${esc(key)}</span> <span class="t-dim">— try 'help'</span>`]);
        }
    }

    // Block cursor: the native caret is hidden in CSS and replaced by a solid
    // box tracking selectionStart. The mirror measures how wide the text before
    // the caret renders, which is the only reliable way to place it.
    const line = input.parentElement;
    const cursor = document.createElement('span');
    cursor.className = 'terminal-cursor';
    const mirror = document.createElement('span');
    mirror.className = 'terminal-mirror';
    line.append(cursor, mirror);

    function updateCursor() {
        const pos = input.selectionStart ?? input.value.length;
        mirror.textContent = input.value.slice(0, pos);
        const x = input.offsetLeft + mirror.offsetWidth - input.scrollLeft;
        // Hide rather than overflow the input when a long command scrolls
        const inView = x >= input.offsetLeft - 1 && x <= input.offsetLeft + input.clientWidth;
        cursor.style.display = inView ? '' : 'none';
        cursor.style.left = x + 'px';
        // Shorter than the full line box, centered on it, with the reverse-video
        // character re-centered to match
        const h = input.offsetHeight * 0.75;
        cursor.style.height = h + 'px';
        cursor.style.lineHeight = h + 'px';
        cursor.style.top = (input.offsetTop + (input.offsetHeight - h) / 2) + 'px';
        cursor.textContent = input.value.charAt(pos);
        cursor.classList.toggle('idle', document.activeElement !== input);
    }

    ['input', 'keyup', 'click', 'focus', 'blur', 'select'].forEach(ev =>
        input.addEventListener(ev, updateCursor));
    window.addEventListener('resize', updateCursor);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateCursor);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
            run(input.value);
            input.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (histIdx > 0) { histIdx--; input.value = history[histIdx] ?? ''; }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (histIdx < history.length) { histIdx++; input.value = history[histIdx] ?? ''; }
        }
        updateCursor();
    });

    // Click anywhere in the terminal focuses the input (unless selecting text)
    body.addEventListener('click', () => {
        if (window.getSelection().isCollapsed) input.focus({ preventScroll: true });
    });

    print([
        'Welcome to Justin\'s terminal.',
        `Type <span class="t-cmd">help</span> to see what you can explore.`,
        '',
    ]);
    updateCursor();
}

// Start as soon as the DOM is ready — don't wait for fonts/analytics/images (window.load)
function initPage() {
    // Corner images fade in via their inline onload; handle already-cached ones here
    document.querySelectorAll('.moon-corner, .earth-corner').forEach(img => {
        if (img.complete) img.classList.add('loaded');
    });

    initSatellite(); // drives the loading screen
    const astronautReady = initAstronaut() || Promise.resolve();
    initTerminal();
    initGokuUltimate();

    // Loading screen: hold until the page and its animations are actually ready,
    // but never longer than the failsafe (e.g. an ad-blocked analytics script
    // keeping window.load from firing shouldn't strand the loader)
    const loader = document.getElementById('loadingScreen');
    if (loader) {
        const pageLoaded = new Promise(r => {
            if (document.readyState === 'complete') r();
            else window.addEventListener('load', r, { once: true });
        });
        const fontsReady = (document.fonts && document.fonts.ready) || Promise.resolve();
        // The hero's corner images must be decoded before the loader lifts —
        // otherwise the earth/moon pop in after "loading" claims to be done
        const cornersReady = Promise.all(
            [...document.querySelectorAll('.moon-corner, .earth-corner')].map(img =>
                img.complete ? Promise.resolve()
                             : new Promise(r => { // addEventListener: the imgs have
                                 img.addEventListener('load', r, { once: true });  // inline
                                 img.addEventListener('error', r, { once: true }); // onload handlers
                             }))
        );
        const minShow = new Promise(r => setTimeout(r, 500)); // no jarring flash on fast loads
        const failsafe = new Promise(r => setTimeout(r, 4000));

        Promise.race([
            Promise.all([pageLoaded, fontsReady, astronautReady, cornersReady, minShow]),
            failsafe,
        ]).then(() => {
            loader.classList.add('done');
            setTimeout(() => {
                loadingScreenDone = true; // stops the satellite loop
                loader.remove();
            }, 500); // matches the CSS fade
        });
    }

    const statDefs = [
        { selector: '.stat-item:nth-child(3) .stat-value', val: 408, float: false },
        { selector: '.stat-item:nth-child(4) .stat-value', val: 7.66, float: true },
        { selector: '.stat-item:nth-child(6) .stat-value', val: 98.3, float: true },
    ];
    statDefs.forEach(({ selector, val, float: isFloat }) => {
        const el = document.querySelector(selector);
        if (el) animateCount(el, val, isFloat);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}
