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
    // Delta-time so the trip takes the same real time at any display refresh rate
    let last = performance.now();
    let prevU = 0;
    (function loop(now) {
        if (now === undefined) now = performance.now();
        const dt = Math.min((now - last) / (1000 / 60), 3);
        last = now;
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
                c.x += cdx * c.speed * dt;
                c.y += cdy * c.speed * dt;
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

        // Clear trail when a new trip starts (u wrapped back toward 0)
        if (u < prevU) trail.length = 0;
        prevU = u;

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

        t += dt;
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
    const VT_TICKS = 12;          // ticks per aerial transformation frame
    const VEG_HOVER_T = 66;       // SSB hover beat before his transform kicks in
    // How far each edge bluff reaches into the frame (scales with width so
    // phones keep a clearing); the fighters' marks are derived from it
    const BLUFF_REACH = (w) => Math.max(60, Math.min(110, w * 0.2));
    const VEG_CX = (w) => w - BLUFF_REACH(w) - 34; // Vegeta's shared center axis, just inside the right bluff
    const SB = 0.62;          // blast scale
    const STAND_X = (w) => BLUFF_REACH(w) + 10; // where Goku charges, just inside the left bluff
    const JUMP_T = 72;        // ticks to rise to the apex (slow, deliberate tumble)
    const TRANS_TICKS = 11;   // ticks per transformation frame
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
        // two-tone sand dither in 2px blocks
        for (let i = 0; i < g.width / 1.6; i++) {
            c.fillStyle = Math.random() < 0.6 ? '#d8bd7f' : '#f0dfae';
            c.fillRect(Math.floor(Math.random() * g.width / 2) * 2,
                4 + Math.floor(Math.random() * (GROUND_H - 5) / 2) * 2, 2, 2);
        }

        // Continuous grass layer — grass is the dominant surface now, sand
        // shows through in blended pockets rather than between hard islands
        c.fillStyle = '#3f9c30';                       // dark under-layer
        c.fillRect(0, 3, g.width, 6);
        c.fillStyle = '#67c74b';                       // bright top
        c.fillRect(0, 2, g.width, 5);
        // internal grass texture: dark + light green blocks throughout
        for (let i = 0; i < g.width / 1.8; i++) {
            c.fillStyle = Math.random() < 0.55 ? '#3f9c30' : '#8ede5c';
            c.fillRect(Math.floor(Math.random() * g.width / 2) * 2,
                2 + Math.floor(Math.random() * 3) * 2, 2, 2);
        }

        // Sand pockets with feathered edges: dither density peaks at the
        // pocket center and fades outward, so grass and dirt grade into
        // each other instead of meeting at a cut line
        let x = 20 + Math.random() * 60;
        while (x < g.width) {
            const pw = 24 + Math.random() * 40;
            const cx = x + pw / 2;
            for (let px = Math.round(x / 2) * 2; px < x + pw; px += 2) {
                const d = 1 - Math.abs(px - cx) / (pw / 2);   // 1 center → 0 edge
                for (let py = 2; py <= 6; py += 2) {
                    if (Math.random() < d * 0.85) {
                        c.fillStyle = Math.random() < 0.7 ? '#e6d09a' : '#d8bd7f';
                        c.fillRect(px, py, 2, 2);
                    }
                }
            }
            x += pw + 70 + Math.random() * 130;
        }

        // blended grass→sand boundary: sand bleeding up, grass hanging down
        for (let tx = 0; tx < g.width; tx += 2) {
            if (Math.random() < 0.45) { c.fillStyle = '#e6d09a'; c.fillRect(tx, 8, 2, 2); }
            if (Math.random() < 0.2)  { c.fillStyle = '#3f9c30'; c.fillRect(tx, 10, 2, 2); }
        }

        // jagged tufts along the whole top edge
        for (let tx = 0; tx < g.width - 2; tx += 3) {
            if (Math.random() < 0.55) {
                c.fillStyle = Math.random() < 0.3 ? '#8ede5c' : '#67c74b';
                c.fillRect(tx, Math.random() < 0.5 ? 0 : 1, 2, 2);
            }
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

    // Backdrop (DBZ wasteland): hazy far mesas on the horizon, closer
    // flat-topped rock plateaus with teal grass caps framing both edges, and
    // tall thin round-canopy trees standing on the caps. Static — only the
    // clouds drift. Sits between the clouds and the terrain.
    let backdropTex = null;
    function buildBackdrop(w, h) {
        const g = document.createElement('canvas');
        g.width = Math.max(1, Math.round(w));
        // Bases run 4px past the sky's bottom edge, under the terrain's grass,
        // so rock meets ground with no sliver of sky showing between them
        g.height = h + 4;
        const c = g.getContext('2d');
        const floor = h + 4;
        const px = (x, y, wd, ht, col) => {
            c.fillStyle = col;
            c.fillRect(Math.round(x), Math.round(y), Math.round(wd), Math.round(ht));
        };

        // Rock formation. kind: 'flat' (mesa), 'spire' (tall thin pillar that
        // flares at the foot), 'butte' (rounded, no cap). Sun is from the
        // left: a lit strip on the left face, deep shadow on the right.
        // Detail passes: sediment strata, cracks, scree at the base.
        const mesa = (cx, wTop, ht, pal, kind = 'flat') => {
            const rows = Math.floor(ht / 2);
            const top = floor - ht;
            const stratStep = 3 + Math.floor(Math.random() * 3);
            const stratPhase = Math.floor(Math.random() * stratStep);
            let notch = 0, notchSide = 1;
            let baseX = cx, baseW = wTop;
            for (let r = 0; r < rows; r++) {
                const y = top + r * 2;
                const t = r / rows;
                let spread;
                if (kind === 'spire')      spread = t * wTop * 0.15 + (t > 0.78 ? ((t - 0.78) / 0.22) * wTop * 0.9 : 0);
                else if (kind === 'butte') spread = Math.pow(t, 0.6) * wTop * 0.55;
                else                       spread = Math.pow(t, 1.7) * wTop * 0.4;
                spread += Math.random() < 0.25 ? 2 : 0;
                let wd = (kind === 'butte' ? 4 : wTop) + spread * 2;
                let x = cx - wd / 2;
                // eroded notch: one face pulls in for a few rows (an overhang)
                if (notch === 0 && r > 2 && r < rows - 4 && Math.random() < 0.1) {
                    notch = 2 + Math.floor(Math.random() * 3); notchSide = Math.random() < 0.5 ? -1 : 1;
                }
                if (notch > 0) { notch--; wd -= 3; if (notchSide < 0) x += 3; }
                px(x, y, wd, 2, pal.rock);
                if (pal.lit)   px(x, y, Math.max(2, wd * 0.2), 2, pal.lit);
                if (pal.shade) px(x + wd * 0.64, y, wd * 0.36, 2, pal.shade);
                if (pal.strata && (r + stratPhase) % stratStep === 0 && r > 0) px(x + 1, y + 1, wd - 2, 1, pal.strata);
                if (r === rows - 1) { baseX = x; baseW = wd; }
            }
            if (kind !== 'butte') {                    // grass cap + shadow under it
                const cw = kind === 'spire' ? wTop + 2 : wTop + 4;
                px(cx - cw / 2, top - 4, cw, 4, pal.cap);
                px(cx - cw / 2, top - 4, cw, 2, pal.capLight);
                if (pal.crack) px(cx - wTop / 2, top, wTop, 1, pal.crack);
                if (kind === 'flat') {                 // cap draping over the edges + tufts
                    px(cx - wTop / 2 - 4, top - 2, 4, 5, pal.cap);
                    px(cx + wTop / 2, top - 2, 4, 5, pal.cap);
                    for (let i = 0; i < wTop / 7; i++) px(cx - wTop / 2 + Math.random() * wTop, top - 6, 2, 2, Math.random() < 0.5 ? pal.capLight : pal.cap);
                }
            } else if (pal.cap) {                      // butte: scattered grass on the dome
                for (let i = 0; i < 4; i++) px(cx - 6 + Math.random() * 12, top + 2 + Math.random() * 6, 2, 2, pal.cap);
            }
            if (pal.crack) {                           // cracks running down the faces
                const n = 1 + Math.floor(rows / 7);
                for (let i = 0; i < n; i++) {
                    const cxk = cx - wTop * 0.3 + Math.random() * wTop * 0.6;
                    const cy = top + 6 + Math.random() * Math.max(2, ht - 16);
                    const ch = 4 + Math.random() * 9;
                    px(cxk, cy, 1, ch, pal.crack);
                    if (Math.random() < 0.5) px(cxk + 1, cy + ch * 0.5, 1, ch * 0.5, pal.crack); // forked
                }
                // scree: rubble at the foot
                for (let i = 0; i < 3 + baseW / 20; i++) {
                    px(baseX - 4 + Math.random() * (baseW + 8), floor - 2 - Math.floor(Math.random() * 2) * 2, 2, 2,
                       Math.random() < 0.5 ? pal.shade : pal.crack);
                }
            }
        };

        // Two-tier bluff: a lower shoulder mesa with a taller mesa stepping up
        // from one side of it (the reference's stepped plateaus)
        const tiered = (cx, w, ht, pal) => {
            const side = Math.random() < 0.5 ? -1 : 1;
            mesa(cx + side * w * 0.22, w * 0.8, ht * (0.5 + Math.random() * 0.15), pal, 'flat');
            mesa(cx - side * w * 0.16, w * 0.55, ht, pal, 'flat');
        };

        // Boulder on the ground: small rounded rock with a lit top
        const boulder = (x, r, pal) => {
            for (let yy = 0; yy <= r; yy++) {
                const half = Math.floor(Math.sqrt(r * r - (yy - r) * (yy - r) * 0.7));
                px(x - half, floor - r + yy, half * 2, 1, yy < 2 ? pal.lit : (yy > r * 0.6 ? pal.shade : pal.rock));
            }
        };

        // Tall thin tree: dark trunk, round blue canopy with a darker outline
        const tree = (x, baseY, trunkH, r) => {
            px(x, baseY - trunkH, 2, trunkH, '#2b3a55');
            const cy = baseY - trunkH - r + 1;
            for (let yy = -r; yy <= r; yy++) {
                const half = Math.floor(Math.sqrt(r * r - yy * yy));
                px(x + 1 - half, cy + yy, half * 2, 1, '#2f6f8f');
            }
            for (let yy = -(r - 1); yy <= r - 1; yy++) {
                const half = Math.floor(Math.sqrt((r - 1) * (r - 1) - yy * yy));
                px(x + 1 - half, cy + yy, half * 2, 1, yy < 0 ? '#67c6e2' : '#4ea6d2');
            }
        };

        // Distant range: the farthest, palest layer — taller shapes nearly
        // dissolved into the sky, drawn first so everything sits in front
        const distant = { rock: '#cfe2e8', lit: '#dbeaee', shade: '#c3d9df', strata: '#c8dde3',
                          crack: null, cap: '#bcd9de', capLight: '#c9e2e6' };
        const distKinds = ['butte', 'butte', 'flat', 'spire'];
        const distN = 3 + Math.floor(g.width / 130);
        for (let i = 0; i < distN; i++) {
            const cx = (i + 0.5) * (g.width / distN) + (Math.random() - 0.5) * 60;
            const kind = distKinds[Math.floor(Math.random() * distKinds.length)];
            const wd = kind === 'spire' ? 7 + Math.random() * 5 : 30 + Math.random() * 36;
            mesa(cx, wd, 22 + Math.random() * (kind === 'spire' ? 26 : 20), distant, kind);
        }

        // Far, hazy formations along the horizon — a mix of silhouettes,
        // desaturated toward the sky, faint strata only
        const haze = { rock: '#bdd8dd', lit: '#c9e0e4', shade: '#afcfd5', strata: '#b6d3d9',
                       crack: null, cap: '#a6cfd6', capLight: '#b8dde2' };
        const farKinds = ['flat', 'flat', 'butte', 'spire'];
        const farN = 4 + Math.floor(g.width / 130);
        for (let i = 0; i < farN; i++) {
            const cx = (i + 0.5) * (g.width / farN) + (Math.random() - 0.5) * 50;
            const kind = farKinds[Math.floor(Math.random() * farKinds.length)];
            const wd = kind === 'spire' ? 6 + Math.random() * 5 : 22 + Math.random() * 30;
            mesa(cx, wd, 12 + Math.random() * (kind === 'spire' ? 22 : 12), haze, kind);
        }

        // Near formations framing the scene: stepped bluffs on the edges (the
        // reference's plateaus), a rock spire or two, a butte, and boulders
        const near = { rock: '#c99f68', lit: '#dcb67f', shade: '#a8804d', strata: '#b78f5b',
                       crack: '#8a663c', cap: '#4fb3bd', capLight: '#7ad6dc' };
        // The bluffs are centered just off-canvas so only their inner faces
        // show; the fighters stand in the open ground between them
        // Bluff footprints are sized so their bases reach BLUFF_REACH into the
        // frame (a mesa base spans ~0.9x its cap width each way, and the
        // center sits 10% of the width past the edge)
        const reach = BLUFF_REACH(g.width);
        const lw = reach / 0.8, lh = 62 + Math.random() * 18;
        const lx = -lw * 0.1;
        if (Math.random() < 0.6) tiered(lx, lw, lh, near); else mesa(lx, lw, lh, near, 'flat');
        const rw = lw * (0.9 + Math.random() * 0.1), rh = 56 + Math.random() * 18; // ≤ lw so it never reaches Vegeta's mark
        const rx = g.width + rw * 0.1;
        if (Math.random() < 0.6) tiered(rx, rw, rh, near); else mesa(rx, rw, rh, near, 'flat');

        // Mid-distance formations go in the gap between the fighters' zones
        // (Goku's run drifts right during the jump; Vegeta's frames are ~60 wide)
        const gapA = STAND_X(g.width) + JUMP_DRIFT + 68;
        const gapB = VEG_CX(g.width) - 40;
        const span = gapB - gapA;
        if (span > 90) {
            mesa(gapA + span * 0.25, 8 + Math.random() * 5, 34 + Math.random() * 22, near, 'spire');
            mesa(gapA + span * 0.68, 26 + Math.random() * 12, 16 + Math.random() * 8, near, 'butte');
        } else if (span > 24) {
            mesa(gapA + span * 0.5, 7 + Math.random() * 4, 30 + Math.random() * 18, near, 'spire');
        }

        // boulders on the ground
        for (let i = 0; i < 2 + Math.floor(g.width / 200); i++) {
            boulder(g.width * (0.15 + Math.random() * 0.7), 3 + Math.floor(Math.random() * 3), near);
        }

        // Trees on the bluff caps — the tall thin ones from the reference.
        // Tiered bluffs put the taller mesa off-center, so probe the actual
        // cap height at each x instead of assuming a flat top.
        const capYAt = (x) => {
            const col = c.getImageData(Math.max(0, Math.min(g.width - 1, Math.round(x))), 0, 1, floor).data;
            for (let y = 0; y < floor; y++) if (col[y * 4 + 3] > 0) return y;
            return floor;
        };
        const plant = (x, trunkH, r) => {
            x = Math.max(r + 2, Math.min(g.width - r - 2, x)); // keep the canopy in frame
            const y = capYAt(x);
            if (y < floor - 8) tree(x, y + 4, trunkH, r);
        };
        // planted on the visible inner portions of each bluff
        plant(reach * 0.1 + Math.random() * 6, 16 + Math.random() * 8, 5);
        plant(reach * 0.35 + Math.random() * 8, 20 + Math.random() * 8, 6);
        plant(reach * 0.62 + Math.random() * 8, 14 + Math.random() * 6, 5);
        if (Math.random() < 0.5) plant(reach * 0.84, 22 + Math.random() * 6, 5);
        plant(g.width - reach * 0.12 - Math.random() * 6, 18 + Math.random() * 8, 6);
        plant(g.width - reach * 0.38 - Math.random() * 8, 14 + Math.random() * 6, 5);
        plant(g.width - reach * 0.64 - Math.random() * 8, 24 + Math.random() * 6, 5);
        if (Math.random() < 0.5) plant(g.width - reach * 0.86, 16 + Math.random() * 6, 5);
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
            backdropTex = buildBackdrop(canvas.offsetWidth, canvas.offsetHeight - GROUND_H);
        }
    }
    setSize();
    window.addEventListener('resize', setSize);

    const sheet = new Image();
    sheet.src = 'public/goku-sprites.png';

    let gokuX, state, stateT, tick, beamLen, blastAlpha, vegHit, vegHitT, vegPreT, vegLandT, ended;
    function reset() {
        // The loop opens on the TRANSFORM-2 sequence: Goku is down, rises,
        // and powers up to Ultra Instinct before the attack run begins
        gokuX = STAND_X(canvas.offsetWidth || 400);
        state = 'down';
        stateT = 0; tick = 0;
        beamLen = 0; blastAlpha = 1;
        vegHit = false; vegHitT = 0; vegPreT = 0; vegLandT = 0;
        ended = false;
    }
    reset();

    function drawSprite(f, x, ground) {
        ctx.drawImage(sheet, f[0], f[1], f[2], f[3], x, ground - f[3], f[2], f[3]);
    }

    // Scene rotation hooks: onEnd fires once the fight finishes; the page then
    // cross-fades to the next scene, pauses this loop, and restarts it later
    const ctl = {
        canvas,
        onEnd: null,
        pause() { paused = true; },
        restart() { reset(); paused = false; if (runLoop) runLoop(); },
    };
    let started = false, running = false, paused = false, runLoop = null;
    sheet.onload = function loopStart() {
        if (started) return;
        started = true;
        // Delta-time: ticks are 1/60s of *real time*, not one-per-frame, so the
        // choreography runs at the same speed on 30/120Hz displays as on 60Hz.
        // Clamped so a backgrounded tab resumes gently instead of fast-forwarding.
        let last = performance.now();
        function loop(now) {
            if (paused) { running = false; return; }
            if (now === undefined) now = performance.now();
            const dt = Math.min((now - last) / (1000 / 60), 3);
            last = now;
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
            if (backdropTex) ctx.drawImage(backdropTex, 0, 0);
            if (groundTex) ctx.drawImage(groundTex, 0, H - GROUND_H);

            stateT += dt;
            // Prologue (TRANSFORM-2 sheet order): down → stir → hair rises frame
            // by frame → aura burst → beat → scene cut into the attack run
            if (state === 'down') {
                if (stateT > 38) { state = 'stir'; stateT = 0; }
            } else if (state === 'stir') {
                if (stateT > 28) { state = 'transform'; stateT = 0; }
            } else if (state === 'transform') {
                if (stateT >= TRANS.length * TRANS_TICKS) { state = 'burst'; stateT = 0; }
            } else if (state === 'burst') {
                if (stateT > 48) { state = 'powered'; stateT = 0; }
            } else if (state === 'powered') {
                // Settle into the aura idle, then straight into the charge —
                // the dash-in was cut so the aura never drops post-transform
                if (stateT > 32) { state = 'charge'; stateT = 0; }
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
                beamLen += W * 0.09 * dt;
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
                // Hand off to the next scene; loop alone if nothing's listening
                if (ctl.onEnd) { if (!ended) { ended = true; ctl.onEnd(); } }
                else if (stateT > 95) reset();
            }

            // Height above ground: rises during the jump, hovers while firing, falls after
            let lift = 0;
            const airborne = ['flash', 'launch', 'fire', 'hold', 'fade'].includes(state);
            if (state === 'jump') {
                lift = JUMP_H * Math.sin((Math.PI / 2) * Math.min(stateT / JUMP_T, 1));
                gokuX = STAND_X(W) + JUMP_DRIFT * Math.min(stateT / JUMP_T, 1);
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
                    vegPreT += dt;
                    let bob = 0;
                    if (vegPreT < VEG_HOVER_T) { vf = VT[0]; bob = Math.sin(tick * 0.07) * 4; }
                    else if (vegPreT < VEG_HOVER_T + (VT.length - 1) * VT_TICKS) {
                        vf = VT[Math.min(VT.length - 1, 1 + Math.floor((vegPreT - VEG_HOVER_T) / VT_TICKS))];
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
                    vegLandT += dt;
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
                    const distToVeg = Math.hypot(VEG_CX(W) - mx, (ground - 30) - cy);
                    if (mw + beamLen >= distToVeg) { vegHit = true; vegHitT = 0; }
                }
                if (vegHit) vegHitT += dt;
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

            tick += dt;
            requestAnimationFrame(loop);
        }
        runLoop = () => {
            if (running) return;
            running = true;
            last = performance.now();
            loop();
        };
        runLoop();
    };
    if (sheet.complete && sheet.naturalWidth > 0) sheet.onload();
    return ctl;
}

// Sage Mode Naruto vs Pain (Tendo) in the Shinra Tensei crater, the scene
// that alternates with the Goku fight in the desc-panel strip.
// public/naruto-pain-sprites.png is baked from pegasuSword's JUS Sage Naruto
// sheet and SasoriFan-XD's Pain sheet (Tendo section, mirrored to face left).
// Frames are [x, y, w, h, anchorX]: anchorX is where the feet (or, for
// airborne frames, the body) sit, so sprites of different widths stay put.
function initNarutoPain() {
    const canvas = document.getElementById('narutoCanvas');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const N_STANCE = [[0,0,41,52,17],[42,0,44,53,20],[87,0,41,52,17],[129,0,39,52,15]];
    const N_RUN = [[169,0,41,47,20],[211,0,45,46,25],[257,0,38,46,21],[296,0,40,46,21],[337,0,45,47,23],[383,0,43,46,24],[427,0,39,46,22],[467,0,42,46,22]];
    const N_JUMP = [[510,0,34,43,17],[545,0,39,51,16],[585,0,39,51,17],[625,0,42,52,25],[668,0,40,52,23],[709,0,37,43,19],[747,0,39,35,21],[787,0,34,43,17]];
    const N_GUARD = [[822,0,38,50,14],[861,0,33,45,8],[895,0,34,48,10]];
    const N_HURT = [[930,0,37,51,14],[968,0,38,47,12],[0,54,42,44,15]];
    const N_KO = [[43,54,57,33,30],[101,54,57,30,28],[159,54,56,28,28],[216,54,56,31,27],[273,54,53,34,24],[327,54,40,36,23],[368,54,53,15,24],[422,54,33,27,18],[456,54,49,28,21],[506,54,51,46,24],[558,54,32,39,19]];
    const N_COMBO1 = [[591,54,33,54,9],[625,54,49,50,13],[675,54,52,49,12],[728,54,51,49,12],[780,54,51,44,35],[832,54,65,40,32],[898,54,44,37,23],[943,54,33,47,17]];
    const SPARK = [[977,54,18,20,10],[0,109,29,27,15],[30,109,35,29,17],[66,109,40,34,17],[107,109,40,26,17],[148,109,44,31,14],[193,109,32,22,22],[226,109,40,27,10]];
    const SMOKE = [[267,109,46,37,22],[314,109,45,53,22],[360,109,45,53,23],[406,109,44,50,24],[451,109,40,46,22]];
    const N_SIGN = [[492,109,36,52,12],[529,109,36,52,12],[566,109,35,52,11],[602,109,34,52,10]];
    const N_OODAMA = [[637,109,36,47,12],[674,109,38,43,12],[713,109,45,44,12],[759,109,41,52,17],[801,109,44,53,20],[846,109,41,52,17],[888,109,39,52,15],[928,109,48,43,9],[0,163,49,42,9],[50,163,56,40,5],[107,163,54,41,2],[162,163,52,41,16],[215,163,56,40,20]];
    const ORB = [[272,163,30,36,19],[303,163,30,34,4],[334,163,12,12,5],[347,163,16,16,7],[364,163,24,24,11],[389,163,40,40,19]];
    const IMPACT = [[430,163,66,70,32],[497,163,66,70,32],[564,163,66,70,32],[631,163,78,78,38],[710,163,64,70,31]];
    const SHRINK = [[775,163,40,40,19],[816,163,40,40,19],[857,163,28,28,13],[886,163,16,16,7],[903,163,14,14,6],[918,163,10,10,4]];
    const N_WIN = [[929,163,37,43,15],[967,163,39,35,26],[0,242,34,41,17]];
    const P_INTRO = [[35,242,149,62,66],[185,242,140,72,60],[326,242,153,85,68],[480,242,173,98,79],[654,242,187,97,90],[842,242,35,44,18]];
    const P_STANCE = [[878,242,27,65,14],[906,242,28,65,14],[935,242,28,65,14],[964,242,27,65,14]];
    const P_BLOCK = [[992,242,30,59,21]];
    const P_JUMP = [[0,341,30,66,15],[31,341,30,66,15],[62,341,38,57,17],[101,341,36,57,16]];
    const P_CROUCH = [[138,341,35,44,18]];
    const P_HURT = [[174,341,49,58,28],[224,341,33,54,18],[258,341,51,54,23],[310,341,60,30,27],[371,341,69,20,36],[441,341,35,44,17]];
    const P_COMBO = [[477,341,29,66,19],[507,341,29,65,19],[537,341,49,62,42],[587,341,38,64,30],[626,341,38,64,30],[665,341,35,65,19],[701,341,33,65,19],[735,341,33,59,22],[769,341,62,59,54],[832,341,68,61,46],[901,341,73,61,51],[0,408,79,61,57]];
    const P_RUNATK = [[80,408,51,46,40],[132,408,46,49,38],[179,408,54,58,46],[234,408,44,57,36],[279,408,39,57,30],[319,408,39,57,30]];
    const P_BANSHO = [[359,408,53,65,40],[413,408,45,65,32]];
    const P_RUN = [[459,408,58,49,24],[518,408,44,50,19],[563,408,46,51,19],[610,408,55,53,20],[666,408,42,52,22],[709,408,50,51,20]];
    const P_SHINRA = [[760,408,76,65,40],[837,408,60,65,32]];
    const P_CHIBAKU = [[898,408,27,65,14],[926,408,27,65,14],[954,408,28,65,14],[983,408,31,65,14],[0,474,27,65,14],[28,474,26,65,14],[55,474,25,65,14],[81,474,25,65,14],[107,474,26,65,14],[134,474,29,65,18],[164,474,27,65,16]];
    const SPHERE = [[192,474,13,8,6],[206,474,40,34,20],[247,474,69,97,51],[317,474,69,93,20],[387,474,69,93,28],[457,474,69,101,47],[527,474,69,100,39],[597,474,69,93,41],[667,474,69,93,30],[737,474,69,104,38],[807,474,69,93,40],[877,474,69,105,36],[947,474,69,93,42],[0,580,69,97,46],[70,580,74,99,46],[145,580,69,103,34],[215,580,69,98,35],[285,580,69,92,36],[355,580,69,72,34]];

    // Choreography, in ticks (1/60s), ~20s. Loosely follows episodes 163–167:
    // Tendo lands in the crater and Naruto arrives by summoning; they clash
    // mid-field and Tendo's rod combo knocks Naruto down; Shinra Tensei blows
    // his clones away; Tendo's Chibaku Tensei swallows Naruto into a sphere of
    // rock until he blasts it apart from inside; then Bansho Ten'in pulls him
    // straight into a point-blank Oodama Rasengan.
    const BEATS = [
        ['open', 30], ['painIntro', 66], ['arrive', 48], ['stare', 36],
        ['clash', 34], ['painSlash', 28], ['combo1', 40], ['counter', 44], ['knockback', 46], ['getup', 30], ['painHop', 26],
        ['clones', 50], ['cloneRush', 32], ['shinra', 52], ['recover', 20],
        ['chibaku', 56], ['chibakuPull', 90], ['trapped', 44], ['burst', 72],
        ['oodama', 52], ['pull', 22], ['impact', 64], ['launch', 50], ['victory', 90],
    ];

    const GROUND_H = 14;
    const NX0 = (w) => Math.max(64, w * 0.27);           // Naruto's mark
    const PX0 = (w) => Math.min(w - 60, w * 0.73);       // Tendo's mark
    const SPHERE_X = (w) => w * 0.5;                     // Chibaku Tensei hangs over mid-field,
    const SPHERE_Y = 36;                                 // its core this far below the top

    // --- Backdrop: Konoha after Shinra Tensei -------------------------------
    // Overcast sky over the crater, built in depth layers back to front: a hazy
    // far rim with the village's remains along it, two stepped terrace walls
    // curving up toward the edges, dark near mounds framing the corners, and
    // blast rings with radial cracks across the floor.
    const SKY = ['#a3b7c6', '#b1c2cf', '#bfcbd4', '#cbd3d8', '#d5d9da'];
    let skyTex = null, groundTex = null;
    function buildBackdrop(w, h) {
        const g = document.createElement('canvas');
        g.width = Math.max(1, Math.round(w));
        g.height = h + 4;
        const c = g.getContext('2d');
        const W2 = g.width, floor = h + 4, cx = W2 / 2;
        const px = (x, y, wd, ht, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(wd), Math.round(ht)); };
        // a bowl contour: lowest at center, rising toward both edges
        const bowl = (x, base, amp, pw) => base - amp * Math.pow(Math.abs(x - cx) / (W2 / 2), pw);

        // banded, dithered overcast sky
        const bandH = Math.ceil(h / SKY.length);
        SKY.forEach((s, i) => px(0, i * bandH, W2, bandH, s));
        for (let i = 1; i < SKY.length; i++) {
            for (let row = -2; row <= 1; row++) {
                for (let x = 0; x < W2; x += 3) {
                    if (((x / 3) + row) % 2 !== 0) continue;
                    px(x, i * bandH + row * 3, 3, 3, row < 0 ? SKY[i] : SKY[i - 1]);
                }
            }
        }
        // flat grey cloud banks
        for (let i = 0; i < 3 + W2 / 160; i++) {
            const x0 = Math.random() * W2, y0 = 10 + Math.random() * h * 0.35, cw = 40 + Math.random() * 60;
            c.globalAlpha = 0.35;
            for (let r = 0; r < 4; r++) px(x0 - (cw - r * 12) / 2 + Math.random() * 4, y0 - r * 3, cw - r * 12, 3, r % 2 ? '#e4e7e8' : '#eef0f0');
            c.globalAlpha = 1;
        }

        // A dirt layer between a contour and the floor: dithered fill, a lit
        // lip, a shadow band under it, and strata that follow the contour
        const layer = (topAt, pal, strataGap, shadowH) => {
            const tops = [];
            for (let x = 0; x < W2; x += 2) {
                const top = Math.round(topAt(x));
                tops.push(top);
                px(x, top, 2, floor - top, pal.fill);
                for (let y = top + 4; y < floor; y += 3) {
                    if (Math.random() < 0.22) px(x, y, 2, 2, Math.random() < 0.5 ? pal.dark : pal.light);
                }
                px(x, top, 2, 2, pal.lip);
                px(x, top + 2, 2, shadowH, pal.shadow);                  // ledge shadow
                if (Math.random() < 0.4) px(x, top + 2 + shadowH, 2, 1, pal.shadow);
                for (let k = 1; top + 2 + shadowH + k * strataGap < floor; k++) {
                    if (Math.random() < 0.65) px(x, top + 2 + shadowH + k * strataGap + ((x >> 3) % 2), 2, 1, pal.dark);
                }
            }
            return (x) => tops[Math.max(0, Math.min(tops.length - 1, Math.floor(x / 2)))];
        };
        // a ruined house on a contour; alpha fades the far ones into the haze
        const wreck = (x, base, scale, pal) => {
            const ww = (10 + Math.random() * 10) * scale, wh = (5 + Math.random() * 6) * scale;
            px(x, base - wh, ww, wh, pal.wall);
            px(x + ww * 0.6, base - wh, ww * 0.4, wh, pal.wallShade);
            if (scale > 0.7) px(x + 2, base - wh + 2, 3, 3, pal.hole);
            for (let i = 0; i < ww + 4; i += 2) {
                px(x - 2 + i, base - wh - 2 - Math.round(i * (Math.random() < 0.5 ? 0.25 : 0.15)), 2, 2, i % 4 ? pal.roof : pal.roofDark);
            }
            for (let k = 0; k < 2; k++) {                                   // snapped beams
                const bx = x + Math.random() * ww, len = (5 + Math.random() * 6) * scale;
                for (let i = 0; i < len; i++) px(bx + i * 0.6, base - wh - i, 1, 1, pal.beam);
            }
        };
        const boulder = (x, base, r, pal) => {
            for (let yy = 0; yy <= r; yy++) {
                const half = Math.floor(Math.sqrt(r * r - (yy - r) * (yy - r) * 0.7));
                px(x - half, base - r + yy, half * 2, 1, yy < 2 ? pal.lip : (yy > r * 0.6 ? pal.shadow : pal.light));
            }
        };

        // 1. far horizon: a hazy tree line and the far side of the crater
        const farBase = h - 60;
        for (let x = 0; x < W2; x += 2) {
            const top = farBase - 8 - Math.round(3 * Math.abs(Math.sin(x * 0.19)) + 2 * Math.abs(Math.sin(x * 0.07)));
            px(x, top, 2, farBase - top + 4, '#9aaea4');
            if (Math.random() < 0.3) px(x, top, 2, 1, '#a8bbb1');
        }
        const farPal = { fill: '#cbc2ae', dark: '#c2b8a3', light: '#d3cbb9', lip: '#ddd6c6', shadow: '#bdb39e' };
        const farTop = layer((x) => bowl(x, farBase, 12, 2) + (Math.random() < 0.3 ? -1 : 0), farPal, 7, 1);
        const hazePal = { wall: '#c9c2b4', wallShade: '#bdb6a8', hole: '#a39b8c', roof: '#bf9f93', roofDark: '#b39286', beam: '#a49a8a' };
        for (let x = 6; x < W2 - 10; x += 16 + Math.random() * 22) wreck(x, farTop(x) + 1, 0.55, hazePal);

        // 2. first terrace: a long, shallow step across the whole bowl
        const midPal = { fill: '#b3966e', dark: '#a0835c', light: '#bea37b', lip: '#d0b68c', shadow: '#846a4a' };
        const midTop = layer((x) => bowl(x, h - 38, 34, 2.2) + (Math.random() < 0.3 ? -1 : 0), midPal, 5, 3);
        const midWreck = { wall: '#c4ad86', wallShade: '#ae9772', hole: '#5a4935', roof: '#a3513c', roofDark: '#8a4331', beam: '#65503a' };
        for (let x = 4; x < W2 * 0.34; x += 22 + Math.random() * 18) wreck(x, midTop(x) + 2, 0.8, midWreck);
        for (let x = W2 - 20; x > W2 * 0.66; x -= 22 + Math.random() * 18) wreck(x, midTop(x) + 2, 0.8, midWreck);

        // 3. inner terrace: steep walls that only rise near the edges
        const nearPal = { fill: '#8f704b', dark: '#79603f', light: '#9c7d56', lip: '#b89468', shadow: '#5b4430' };
        const nearTop = layer((x) => bowl(x, h - 12, 84, 3) + (Math.random() < 0.3 ? -1 : 0), nearPal, 4, 4);
        const nearWreck = { wall: '#cbb58c', wallShade: '#b39d76', hole: '#4a3c2c', roof: '#a64a33', roofDark: '#8a3a28', beam: '#5b4431' };
        for (const x of [W2 * 0.03, W2 * 0.11, W2 * 0.86, W2 * 0.94]) {
            if (nearTop(x) < h - 24) wreck(x, nearTop(x) + 2, 1, nearWreck);
        }

        // 4. dark mounds right at the corners — the closest layer
        const moundPal = { fill: '#6b5238', dark: '#5a432d', light: '#775c40', lip: '#8a6c4b', shadow: '#4c3825' };
        const reach = Math.min(90, W2 * 0.16);
        const edge = (x) => Math.max(0, 1 - Math.min(x, W2 - x) / reach);
        const moundTops = [];
        for (let x = 0; x < W2; x += 2) {
            const e = edge(x);
            moundTops.push(e > 0 ? Math.round(floor - 4 - 58 * Math.pow(e, 1.6) + (Math.random() < 0.3 ? -1 : 0)) : floor);
        }
        for (let i = 0; i < moundTops.length; i++) {
            const x = i * 2, top = moundTops[i];
            if (top >= floor) continue;
            px(x, top, 2, floor - top, moundPal.fill);
            for (let y = top + 4; y < floor; y += 3) if (Math.random() < 0.25) px(x, y, 2, 2, Math.random() < 0.5 ? moundPal.dark : moundPal.light);
            px(x, top, 2, 2, moundPal.lip);
            px(x, top + 2, 2, 1, moundPal.shadow);
        }
        const moundAt = (x) => moundTops[Math.max(0, Math.min(moundTops.length - 1, Math.floor(x / 2)))];
        for (const x of [reach * 0.3, reach * 0.62, W2 - reach * 0.3, W2 - reach * 0.62]) {
            const top = moundAt(x);
            if (top < floor - 10) boulder(x, top + 3, 4 + Math.floor(Math.random() * 3), { lip: '#9a948a', light: '#7d776d', shadow: '#5d5850' });
        }
        // splintered posts jutting from the mounds
        for (const x of [reach * 0.45, W2 - reach * 0.45]) {
            const top = moundAt(x), lean = x < cx ? 0.4 : -0.4;
            for (let i = 0; i < 14; i++) px(x + i * lean, top - i, 2, 1, i > 11 ? '#8a6e52' : '#4f3a27');
        }

        // 5. crater floor: blast rings around the impact point and radial cracks
        const fy = floor - 2;
        for (let k = 1; k <= 4; k++) {
            const rx = W2 * 0.12 * k, ry = 5 + k * 5;
            for (let a = Math.PI; a < Math.PI * 2; a += 0.02) {
                const x = cx + Math.cos(a) * rx, y = fy + Math.sin(a) * ry;
                if (y < midTop(x) + 4 || Math.random() < 0.35) continue;
                px(x, y, 2, 1, k % 2 ? '#8f7250' : '#b69a72');
            }
        }
        for (let i = 0; i < 9; i++) {
            const ang = Math.PI + (i + 0.5) * Math.PI / 9;
            let x = cx, y = fy;
            for (let st = 0; st < 26; st++) {
                x += Math.cos(ang) * 4 + (Math.random() - 0.5) * 2;
                y += Math.sin(ang) * 1.2;
                if (y < midTop(x) + 3) break;
                px(x, y, 2, 1, '#7a5f40');
            }
        }
        // rubble and splintered planks across the floor
        for (let i = 0; i < W2 / 12; i++) {
            const x = Math.random() * W2, y = h - 34 + Math.random() * 36;
            if (y < midTop(x) + 4 || y > moundAt(x) - 2) continue;
            const sz = 2 + Math.floor(Math.random() * 2) * 2;
            px(x, y, sz, sz - 1, Math.random() < 0.5 ? '#77705f' : '#6a5540');
            px(x, y, sz, 1, '#978e7a');
        }
        for (let i = 0; i < W2 / 50; i++) {
            const x = Math.random() * W2, y = h - 18 + Math.random() * 18;
            if (y > moundAt(x) - 2) continue;
            px(x, y, 6 + Math.random() * 6, 1, '#6e5238');
        }
        return g;
    }
    function buildGround(w) {
        const g = document.createElement('canvas');
        g.width = Math.max(1, Math.round(w));
        g.height = GROUND_H;
        const c = g.getContext('2d');
        const px = (x, y, wd, ht, col) => { c.fillStyle = col; c.fillRect(x, y, wd, ht); };
        px(0, 2, g.width, GROUND_H - 2, '#8f6f4b');
        px(0, 2, g.width, 2, '#a9875d');
        for (let i = 0; i < g.width * 1.2; i++) {
            px(Math.floor(Math.random() * g.width / 2) * 2, 2 + Math.floor(Math.random() * (GROUND_H - 3) / 2) * 2, 2, 2,
               Math.random() < 0.5 ? '#7c5e3e' : '#a07e56');
        }
        // cracks radiating through the packed earth
        for (let x = 10 + Math.random() * 30; x < g.width; x += 40 + Math.random() * 60) {
            let cx = x, cy = 4;
            for (let i = 0; i < 8; i++) { px(Math.round(cx), cy, 2, 1, '#5e4630'); cx += Math.random() * 4 - 1; cy += 1; }
        }
        // pebbles poking up over the edge
        for (let x = 0; x < g.width; x += 3) if (Math.random() < 0.18) px(x, 0, 2, 2, Math.random() < 0.5 ? '#77705f' : '#a9875d');
        return g;
    }

    const sheet = new Image();
    sheet.src = 'public/naruto-pain-sprites.png';

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function setSize() {
        const w = Math.round(canvas.offsetWidth * dpr), h = Math.round(canvas.offsetHeight * dpr);
        if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
            canvas.width = w;
            canvas.height = h;
            skyTex = buildBackdrop(canvas.offsetWidth, canvas.offsetHeight - GROUND_H);
            groundTex = buildGround(canvas.offsetWidth);
        }
    }
    setSize();
    window.addEventListener('resize', setSize);

    // --- Drawing helpers ------------------------------------------------------
    // fr: frame at time t (tpf ticks per frame), looping or holding the last
    const fr = (a, t, tpf, loop) => {
        const i = Math.floor(Math.max(0, t) / tpf);
        return a[loop ? i % a.length : Math.min(a.length - 1, i)];
    };
    // put: character frame with its anchor at x, feet at bottom
    function put(f, x, bottom, a = 1) {
        ctx.globalAlpha = a;
        ctx.drawImage(sheet, f[0], f[1], f[2], f[3], Math.round(x - f[4]), Math.round(bottom - f[3]), f[2], f[3]);
        ctx.globalAlpha = 1;
    }
    // fx: effect frame centered on (cx, cy), optionally scaled
    function fx(f, cx, cy, s = 1, a = 1) {
        const w = Math.round(f[2] * s), h = Math.round(f[3] * s);
        ctx.globalAlpha = a;
        ctx.drawImage(sheet, f[0], f[1], f[2], f[3], Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
        ctx.globalAlpha = 1;
    }
    // smoke puff sitting on the ground at x
    const puff = (x, ground, t, s = 1) => {
        if (t < 0 || t >= SMOKE.length * 7) return;
        const f = fr(SMOKE, t, 7, false);
        fx(f, x, ground - f[3] * s / 2, s, t > 24 ? 1 - (t - 24) / 12 : 1);
    };
    const ease = (p) => { p = Math.max(0, Math.min(1, p)); return p * p * (3 - 2 * p); };
    const lerp = (a, b, p) => a + (b - a) * p;

    // --- Scene state ------------------------------------------------------------
    let bi, bt, tick, nx, px, nLift, pLift, clones, rocks, pulledFrom, launchFrom, kbFrom, pFrom, impactX, ended;
    function reset() {
        const W = canvas.offsetWidth || 400;
        bi = 0; bt = 0; tick = 0;
        nx = NX0(W); px = PX0(W);
        nLift = 0; pLift = 0;
        clones = []; rocks = [];
        ended = false;
    }
    reset();

    const beat = () => BEATS[bi][0];
    function enter(name, W, ground) {
        if (name === 'clash' || name === 'knockback' || name === 'chibakuPull') kbFrom = nx;
        if (name === 'clash' || name === 'painHop') pFrom = px;
        else if (name === 'clones') clones = [];
        else if (name === 'shinra') {
            for (let i = 0; i < 16; i++) {
                const dir = i % 2 ? 1 : -1;
                rocks.push({ x: px + dir * (4 + Math.random() * 10), y: ground - 2, vx: dir * (1 + Math.random() * 2.6),
                             vy: -1.5 - Math.random() * 2.5, s: 2 + Math.floor(Math.random() * 2), life: 70 });
            }
        }
        else if (name === 'pull') pulledFrom = nx;
        else if (name === 'impact') impactX = px - 4;
        else if (name === 'launch') launchFrom = px;
        else if (name === 'burst') {
            // the sphere bursts: its rock shell rains back down
            for (let i = 0; i < 34; i++) {
                const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 2.5;
                rocks.push({ x: SPHERE_X(W) + Math.cos(a) * 18, y: SPHERE_Y + Math.sin(a) * 18, vx: Math.cos(a) * sp,
                             vy: Math.sin(a) * sp - 1.5, s: 2 + Math.floor(Math.random() * 3), life: 90 });
            }
        }
        else if (name === 'landDust') {
            for (let i = 0; i < 8; i++) rocks.push({ x: px + (Math.random() - 0.5) * 16, y: ground - 2, vx: (Math.random() - 0.5) * 2.4,
                                                     vy: -1 - Math.random() * 1.5, s: 2, life: 40, dust: true });
        }
    }

    const ctl = {
        canvas,
        onEnd: null,
        ready: () => sheet.complete && sheet.naturalWidth > 0,
        pause() { paused = true; },
        restart() { reset(); paused = false; if (runLoop) runLoop(); },
    };
    let running = false, paused = true, runLoop = null;

    function loop(now) {
        if (paused) { running = false; return; }
        if (now === undefined) now = performance.now();
        const dt = Math.min((now - last) / (1000 / 60), 3);
        last = now;
        const W = canvas.width / dpr, H = canvas.height / dpr;
        if (!W || !H) { requestAnimationFrame(loop); return; }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, W, H);
        const ground = H - GROUND_H + 4;

        // advance the choreography
        bt += dt;
        while (bi < BEATS.length - 1 && bt >= BEATS[bi][1]) {
            bt -= BEATS[bi][1];
            bi++;
            enter(beat(), W, ground);
        }
        const b = beat();
        if (b === 'victory' && bt >= BEATS[bi][1] && !ended) {
            ended = true;
            if (ctl.onEnd) ctl.onEnd(); else reset();
        }

        // screen shake on the big hits
        let shake = 0;
        if (b === 'shinra' && bt < 30) shake = 2.2 * (1 - bt / 30);
        if (b === 'chibakuPull') shake = 1.2;
        if (b === 'trapped') shake = 1.2 + bt / 30;
        if (b === 'burst' && bt < 30) shake = 2.8;
        if (b === 'impact') shake = bt < 60 ? 3 : 1.4;
        if (shake) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake * 0.6);

        if (skyTex) ctx.drawImage(skyTex, 0, 0);
        if (groundTex) ctx.drawImage(groundTex, 0, H - GROUND_H);
        let gloom = 0;
        if (b === 'chibaku') gloom = 0.22 * ease((bt - 20) / 36);
        else if (b === 'chibakuPull' || b === 'trapped') gloom = 0.22;
        else if (b === 'burst') gloom = 0.22 * (1 - ease(bt / 50));
        if (gloom > 0) { ctx.globalAlpha = gloom; ctx.fillStyle = '#1b1430'; ctx.fillRect(-4, -4, W + 8, H + 8); ctx.globalAlpha = 1; }

        // ---- per-beat poses -------------------------------------------------
        let nf = N_STANCE[Math.floor(tick / 9) % 4], pf = P_STANCE[Math.floor(tick / 10) % 4];
        let showN = true, showP = true, pJit = 0;
        const handX = () => nx + 16, handY = ground - 27;

        switch (b) {
        case 'open':
            showN = showP = false;
            break;
        case 'painIntro':
            showN = false;
            pf = fr(P_INTRO, bt, 12, false);
            break;
        case 'arrive':
            if (bt < 14) pf = P_INTRO[5];
            showN = bt > 8;
            break;
        case 'clash': {
            // both charge; they meet a little right of center
            const meet = W * 0.52;
            const p = ease(bt / BEATS[bi][1]);
            nx = lerp(kbFrom, meet - 30, p);
            px = lerp(pFrom, meet + 14, p);
            nf = fr(N_RUN, bt, 4, true);
            pf = fr(P_RUN, bt, 4, true);
            break;
        }
        case 'painSlash':
            // Tendo strikes first; Naruto guards and skids back
            pf = fr(P_RUNATK, bt, 5, false);
            nf = bt < 10 ? N_GUARD[0] : N_GUARD[bt < 22 ? 1 : 2];
            if (bt > 10 && bt < 22) nx -= 0.9 * dt;
            break;
        case 'combo1':
            nf = fr(N_COMBO1, bt, 5, false);
            pf = P_BLOCK[0];
            if (bt < 12) nx += 0.8 * dt;
            if (bt > 15 && bt < 34) px += 0.22 * dt;
            break;
        case 'counter':
            pf = fr(P_COMBO, bt, 4, false);
            nf = bt < 34 ? N_GUARD[bt < 8 ? 0 : 1] : fr(N_HURT, bt - 34, 5, false);
            if (bt >= 34) nx -= 0.5 * dt;
            break;
        case 'knockback': {
            const p = Math.min(bt / 32, 1);
            nx = lerp(kbFrom, NX0(W), ease(p));
            nLift = p < 1 ? Math.sin(Math.PI * p) * 24 : 0;
            nf = p < 1 ? fr(N_KO, bt, 6, false) : N_KO[6];
            if (p < 1 && nf === N_KO[6]) nf = N_KO[5];
            pf = bt < 10 ? P_COMBO[11] : pf;
            break;
        }
        case 'getup':
            nf = bt < 32 ? [N_KO[7], N_KO[8], N_KO[9], N_KO[10]][Math.min(3, Math.floor(bt / 8))] : nf;
            break;
        case 'painHop': {
            // Tendo leaps back to his mark to make room
            const p = bt / BEATS[bi][1];
            px = lerp(pFrom, PX0(W), ease(p));
            pLift = Math.sin(Math.PI * p) * 26;
            pf = p < 0.5 ? P_JUMP[0] : (p < 0.9 ? P_JUMP[2] : P_CROUCH[0]);
            break;
        }
        case 'clones': {
            nf = fr(N_SIGN, bt, 8, false);
            if (bt >= 20 && clones.length === 0) {
                clones = [nx + 32, nx + 62].map(x => ({ x, start: x, t0: bt, hit: -1, gone: false }));
            }
            break;
        }
        case 'cloneRush':
            if (bt >= 18) pf = P_SHINRA[0];
            break;
        case 'shinra':
            pf = P_SHINRA[bt < 44 ? 1 : 0];
            break;
        case 'chibaku':
            // Tendo raises a hand and flings a tiny black core into the sky
            pf = bt < 35 ? fr(P_CHIBAKU.slice(0, 5), bt, 7, false) : fr(P_CHIBAKU.slice(5, 9), bt, 6, true);
            if (bt > 28) nf = N_GUARD[0];
            break;
        case 'chibakuPull': {
            // the core swells, tearing up the ground, and drags Naruto up into it
            pf = fr(P_CHIBAKU.slice(5, 9), bt, 6, true);
            const p = ease((bt - 14) / 70);
            nx = lerp(kbFrom, SPHERE_X(W), p);
            nLift = lerp(0, ground - 26 - SPHERE_Y, p) + (p > 0 && p < 1 ? Math.sin(tick * 0.2) * 1.5 : 0);
            nf = p > 0 ? fr(N_HURT, bt, 6, true) : N_GUARD[0];
            showN = p < 0.97;                          // swallowed by the sphere
            if (Math.random() < 0.5 * dt) {
                rocks.push({ x: Math.random() * W, y: ground - 2, s: 2 + Math.floor(Math.random() * 2), life: 120, up: true });
            }
            break;
        }
        case 'trapped':
            // sealed inside; light starts leaking through the cracks
            pf = fr(P_CHIBAKU.slice(5, 9), bt, 6, true);
            showN = false;
            break;
        case 'burst': {
            // a Rasengan blows the sphere apart from inside; Naruto drops out
            // and lands back on his side of the field, Tendo staggers
            const top = ground - 26 - SPHERE_Y;
            const p = Math.min(Math.max(0, bt - 10) / 26, 1);
            nx = lerp(SPHERE_X(W), Math.max(NX0(W), SPHERE_X(W) - 50), ease(p));
            nLift = top * (1 - p * p);
            nf = bt < 10 ? N_OODAMA[12] : p < 1 ? (p < 0.6 ? N_JUMP[5] : N_JUMP[6]) : (bt < 46 ? N_JUMP[7] : nf);
            pf = bt < 30 ? fr([P_HURT[0], P_HURT[1]], bt, 6, true) : pf;
            if (p >= 1 && bt - dt < 36) { const t = px; px = nx; enter('landDust', W, ground); px = t; }
            break;
        }
        case 'oodama':
            nf = fr([N_OODAMA[0], N_OODAMA[1], N_OODAMA[2], N_OODAMA[1], N_OODAMA[2], N_OODAMA[3], N_OODAMA[4], N_OODAMA[5], N_OODAMA[6]], bt, 8, false);
            if (bt >= 22) pf = P_BANSHO[bt < 40 ? 0 : 1];
            break;
        case 'pull': {
            const p = bt / BEATS[bi][1];
            nx = lerp(pulledFrom, px - 34, p * p);
            nLift = Math.sin(Math.PI * p) * 6;
            nf = p < 0.5 ? N_OODAMA[8] : N_OODAMA[9];
            pf = P_BANSHO[1];
            break;
        }
        case 'impact':
            nLift = 0;
            nf = fr([N_OODAMA[11], N_OODAMA[12]], bt, 4, true);
            pf = fr([P_HURT[0], P_HURT[1]], bt, 5, true);
            pJit = (Math.random() - 0.5) * 3;
            break;
        case 'launch': {
            const p = Math.min(bt / 30, 1);
            px = lerp(launchFrom, Math.min(launchFrom + 70, W - 34), 1 - Math.pow(1 - p, 2));
            pLift = p < 1 ? Math.sin(Math.PI * p) * 28 : 0;
            pf = p < 1 ? P_HURT[2] : (bt < 42 ? P_HURT[3] : P_HURT[4]);
            nf = bt < 14 ? N_OODAMA[12] : nf;
            if (p >= 1 && bt - dt < 30) enter('landDust', W, ground); // dust where he hits the dirt
            break;
        }
        case 'victory':
            nf = fr(N_WIN, bt, 12, false);
            pf = P_HURT[4];
            break;
        }

        // ---- draw: clones, Tendo, Naruto, then effects on top ---------------
        for (const c of clones) {
            if (c.gone) continue;
            const ct = b === 'clones' ? bt - c.t0 : 99;
            if (b === 'clones') { if (ct > 6) put(N_STANCE[Math.floor(tick / 9) % 4], c.x, ground, 0.95); puff(c.x, ground, ct); continue; }
            if (b === 'cloneRush') {
                // the far clone leads; the near one follows a beat later, a step behind
                const lead = c.start - nx > 40;
                c.x = lerp(c.start, px - (lead ? 36 : 52), ease((bt - (lead ? 0 : 6)) / 30));
                put(fr([N_OODAMA[7], N_OODAMA[8]], tick, 4, true), c.x, ground);
                const o = ORB[4]; fx(o, c.x + 18, ground - 24, 0.8);
            } else if (b === 'shinra') {
                const r = bt * 5.5;
                if (c.hit < 0 && r >= px - c.x - 8) c.hit = bt;
                if (c.hit < 0) { put(N_OODAMA[8], c.x, ground); fx(ORB[4], c.x + 18, ground - 24, 0.8); }
                else {
                    const ht = bt - c.hit;
                    if (ht < 10) { c.x -= 3 * dt; put(N_HURT[2], c.x, ground - Math.sin(ht / 10 * Math.PI) * 8); }
                    puff(c.x, ground, ht - 6, 0.9);
                    if (ht > 40) c.gone = true;
                }
            } else c.gone = true;
        }

        if (showP) put(pf, px + pJit, ground - pLift);
        if (showN) put(nf, nx, ground - nLift);

        // summoning puff for Naruto's arrival
        if (b === 'arrive') puff(nx, ground, bt, 1.1);

        // taijutsu hit sparks
        if (b === 'combo1' && ((bt > 15 && bt < 27) || (bt > 27 && bt < 39))) fx(fr(SPARK, (bt - 15) % 12, 2, false), px - 12, ground - 34, 0.7);
        if (b === 'painSlash' && bt > 10 && bt < 26) fx(fr(SPARK, bt - 10, 2, false), nx + 12, ground - 30, 0.7);

        if (b === 'counter' && bt > 34 && bt < 48) fx(fr(SPARK, bt - 34, 2, false), nx + 10, ground - 30, 0.8);

        // Shinra Tensei: repulsion wave rolling out from Tendo
        if (b === 'shinra') {
            const r = bt * 5.5, a = Math.max(0, 1 - bt / 48);
            if (a > 0) {
                const cx = px, cy = ground - 30;
                ctx.globalAlpha = a * 0.18;
                ctx.fillStyle = '#eef2ff';
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = a;
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = '#c9c2ff'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2); ctx.stroke();
                ctx.globalAlpha = 1;
            }
            if (nx > px - r - 6 && bt < 30) nx -= 0.6 * dt;      // the real Naruto braces and skids
        }

        // Chibaku Tensei: the core flies up, then swells into a planet of rock
        const SX = SPHERE_X(W);
        if (b === 'chibaku' && bt >= 24) {
            const q = ease((bt - 24) / 26);
            fx(SPHERE[0], lerp(px - 6, SX, q), lerp(ground - 70, SPHERE_Y, q), 1);
        }
        if (b === 'chibakuPull' || b === 'trapped' || (b === 'burst' && bt < 4)) {
            const t = b === 'chibakuPull' ? bt : 999;
            const f = fr(SPHERE.slice(1), t, 5, false);
            const j = b === 'trapped' ? Math.round((Math.random() - 0.5) * (1 + bt / 20)) : 0;
            ctx.drawImage(sheet, f[0], f[1], f[2], f[3], Math.round(SX - f[2] / 2) + j, Math.round(SPHERE_Y - 30), f[2], f[3]);
        }
        // blue chakra light cracking through the rock, more rays as it builds
        if (b === 'trapped') {
            const rays = 2 + Math.floor(bt / 5);
            for (let k = 0; k < rays; k++) {
                const a = k * 2.39996, len = Math.min(30, 6 + (bt - k * 4) * 1.2);
                if (len <= 6) continue;
                ctx.globalAlpha = 0.7 + 0.3 * Math.sin(tick * 0.6 + k);
                for (let i = 6; i < len; i += 1) {
                    const x = SX + Math.cos(a) * i + Math.sin(i * 0.9 + k) * 1.2, y = SPHERE_Y + Math.sin(a) * i * 0.9;
                    ctx.fillStyle = i < len - 3 ? '#e8fbff' : '#7fd8f5';
                    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
                }
            }
            fx(ORB[3], SX, SPHERE_Y, 1 + bt / 30, 0.25 + bt / 120);  // glow at the core
        }
        if (b === 'burst') {
            if (bt < 30) fx(fr(IMPACT.slice(0, 3), bt, 4, true), SX, SPHERE_Y, 1);
            else if (bt < 50) fx(fr(IMPACT.slice(3), bt - 30, 10, false), SX, SPHERE_Y, 1);
            else if (bt < 50 + SHRINK.length * 4) fx(fr(SHRINK, bt - 50, 4, false), SX, SPHERE_Y, 1);
        }

        // Oodama Rasengan charging in his hand while Bansho Ten'in locks on
        if (b === 'oodama') fx(fr(ORB, bt, 10, false), handX() + 2, handY, 1);
        if (b === 'oodama' && bt >= 40 || b === 'pull') {
            // gravity pull: violet lines streaming from Tendo's palm to Naruto
            const x0 = px - 26, y0 = ground - pLift - 46, x1 = nx + 8, y1 = ground - nLift - 30;
            ctx.fillStyle = '#b9a6ff';
            for (let k = 0; k < 3; k++) {
                for (let i = 0; i < 1; i += 0.04) {
                    const ph = (i + tick * 0.02 + k * 0.33) % 1;
                    if (ph > 0.55) continue;
                    const x = lerp(x1, x0, i), y = lerp(y1, y0, i) + Math.sin(i * 12 + tick * 0.3 + k * 2) * (3 + k * 2);
                    ctx.globalAlpha = 0.75;
                    ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
                }
            }
            ctx.globalAlpha = 1;
        }
        if (b === 'pull') {
            fx(ORB[5], nx + 24, ground - nLift - 26, 1);
            ctx.fillStyle = '#ffffff';                         // speed lines
            for (let i = 0; i < 6; i++) {
                ctx.globalAlpha = 0.6;
                ctx.fillRect(Math.round(nx - 20 - Math.random() * 40), Math.round(ground - 50 + i * 8 + Math.random() * 3), 14 + Math.random() * 20, 1);
            }
            ctx.globalAlpha = 1;
        }
        if (b === 'impact') {
            if (bt < 60) fx(fr(IMPACT.slice(0, 3), bt, 4, true), impactX, ground - 30, 1);
            else fx(fr(IMPACT.slice(3), bt - 60, 10, false), impactX, ground - 30, 1);
        }
        if (b === 'launch' && bt < SHRINK.length * 5) fx(fr(SHRINK, bt, 5, false), impactX, ground - 30, 1);

        // debris and dust
        for (const r of rocks) {
            if (r.up) {
                // torn up by Chibaku Tensei: accelerate toward the core
                const dx = SX - r.x, dy = SPHERE_Y - r.y, d = Math.hypot(dx, dy);
                const v = 1 + (120 - r.life) * 0.05;
                r.x += dx / d * v * dt; r.y += dy / d * v * dt; r.life -= dt;
                if (d < 22 || b === 'burst') r.life = 0;
                ctx.fillStyle = '#6f5a44';
                ctx.fillRect(Math.round(r.x), Math.round(r.y), r.s, r.s);
                continue;
            }
            r.vy += 0.16 * dt; r.x += r.vx * dt; r.y += r.vy * dt; r.life -= dt;
            if (r.y > ground - 2) { r.y = ground - 2; r.vy *= -0.3; r.vx *= 0.7; }
            ctx.globalAlpha = Math.max(0, Math.min(1, r.life / 20)) * (r.dust ? 0.6 : 1);
            ctx.fillStyle = r.dust ? '#c9ae84' : '#6f5a44';
            ctx.fillRect(Math.round(r.x), Math.round(r.y), r.s, r.s);
        }
        ctx.globalAlpha = 1;
        rocks = rocks.filter(r => r.life > 0);

        // white flash on the detonations
        let flash = 0;
        if (b === 'burst' && bt < 8) flash = 0.6 * (1 - bt / 8);
        if (b === 'impact' && bt < 8) flash = 0.6 * (1 - bt / 8);
        if (b === 'shinra' && bt < 5) flash = 0.35 * (1 - bt / 5);
        if (flash) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha = flash; ctx.fillRect(-4, -4, W + 8, H + 8); ctx.globalAlpha = 1; }

        tick += dt;
        requestAnimationFrame(loop);
    }
    let last = performance.now();
    runLoop = () => {
        if (running) return;
        running = true;
        last = performance.now();
        loop();
    };
    return ctl;
}

// The strip alternates between the two fights: when one finishes, the next
// fades in over it from its opening beat, and the finished one is paused
function initFightRotation() {
    const goku = initGokuUltimate();
    const naruto = initNarutoPain();
    if (!goku || !naruto) return;
    const swap = (next, prev) => {
        next.restart();
        next.canvas.classList.add('active');
        prev.canvas.classList.remove('active');
        setTimeout(() => prev.pause(), 950); // after the CSS fade
    };
    // Until Naruto's sheet has loaded, Goku just loops on his own
    goku.onEnd = () => naruto.ready() ? swap(naruto, goku) : goku.restart();
    naruto.onEnd = () => swap(goku, naruto);
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
            '  <span class="t-cmd">about</span>       who i am',
            '  <span class="t-cmd">education</span>   where i study',
            '  <span class="t-cmd">research</span>    labs + research work',
            '  <span class="t-cmd">projects</span>    startups + things i build',
            '  <span class="t-cmd">pubs</span>        publications',
            '  <span class="t-cmd">awards</span>      honors + awards',
            '  <span class="t-cmd">contact</span>     how to reach me',
            '  <span class="t-cmd">clear</span>       clear the screen',
        ],
        about: () => [
            '<span class="t-accent">Justin Lin</span> — 19, neuroscience student at UCLA.',
            'Passionate about bioinformatics, space exploration, and startups.',
            'Having been born with a bilateral cleft lip and palate, I\'m also',
            'interested in public health advocacy and clinical research. My',
            'current dream is to become an astronaut! In my free time, I like',
            'playing tennis, going to the gym, and speed solving Rubik\'s cubes...',
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
            `<span class="t-accent">OPTRA Labs</span> — CTO, founding engineer. ${link('https://optra-labs.com', 'optra-labs.com')}`,
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
            '4. Cleft Palate Development: Epigenetic Influences <span class="t-dim">(ASHG, 2024)</span>',
            '<span class="t-dim">Full citations in the PUBLICATIONS panel ←</span>',
        ],
        awards: () => [
            '· 2025 Regeneron Science Talent Search (STS) Scholar',
            '· Eagle Scout — Certificate of Congressional Recognition',
        ],
        contact: () => [
            `email    ${link('mailto:justinytlin4@gmail.com', 'justinytlin4@gmail.com')}`,
        ],
        whoami: () => ['justin — but you can call me the guy on the rocket ↖'],
        ls: () => ['<span class="t-cmd">about  education  research  projects  pubs  awards  contact</span>'],
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

// iOS Safari auto-zooms the page when focusing inputs whose effective font
// size is under 16px (the 12px terminal input). maximum-scale=1 suppresses
// that auto-zoom while leaving manual pinch-zoom intact — Safari has ignored
// the cap for user gestures since iOS 10. iOS-only: Android *does* enforce
// the cap on pinch (an accessibility loss) but never auto-zooms inputs.
function preventIOSInputZoom() {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS
    if (!isIOS) return;
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0';
}

// Start as soon as the DOM is ready — don't wait for fonts/analytics/images (window.load)
function initPage() {
    preventIOSInputZoom();

    // Corner images fade in via their inline onload; handle already-cached ones here
    document.querySelectorAll('.moon-corner, .earth-corner').forEach(img => {
        if (img.complete) img.classList.add('loaded');
    });

    initSatellite(); // drives the loading screen
    const astronautReady = initAstronaut() || Promise.resolve();
    initTerminal();
    initFightRotation();

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
