/* =========================================================
   Features 스티키 스크롤

   .pd_features(긴 영역) 안에서 .pd_features_sticky 가 화면에 고정되어 있는 동안,
   스크롤 위치가 문턱을 넘을 때마다 조각이 하나씩 부드럽게 올라옴.
     --e1 : 뒤쪽 카드   (Deep Flavor)
     --e2 : 가운데 카드 (Alive with Natural Yeast)
     --e3 : 그릇        (Gently Sweet)
   스크롤 양에 비례해 끌려 올라오는 방식이 아니라, 문턱을 넘으면 정해진 시간 동안 스스로 올라옴
   (빠르게 휠을 돌려도 한 장씩 천천히 올라오고, 되돌리면 한 장씩 내려감).
   각 조각의 움직임은 CSS(.pd_card)가 --e 값으로 그림.

   태블릿·모바일(1024px 이하)에서는 조각이 올라오는 동안 아래로 내려가는 스크롤을 막아 두었다가,
   다 올라와 움직임이 멈추면 풀어 줌 (올라오는 도중 페이지가 넘어가 어긋나지 않게).
   위로 올라가는 스크롤은 언제나 가능.
========================================================= */

(() => {
    const section = document.querySelector('.pd_features');
    const bowl = section && section.querySelector('.pd_bowl');
    if (!bowl) return;

    // 스크롤 진행도(0~1)가 이 값을 넘으면 해당 조각이 올라옴
    const THRESHOLDS = [0.12, 0.45, 0.78];

    // 값이 목표에 다가가는 속도(ms). 작을수록 빠르게 도착. 약 4배 시간이면 거의 도착
    const TAU = 260;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

    const current = THRESHOLDS.map(() => 0);
    const target = THRESHOLDS.map(() => 0);

    let raf = 0;
    let last = 0;

    // ---- 올라오는 동안 아래 스크롤 잠금 (태블릿·모바일) ----
    const lockQuery = window.matchMedia('(max-width: 1024px)');
    // 이 값(0~1) 이상 올라오면 다 올라온 것으로 봄
    const DONE = 0.97;
    let locked = false;
    let holdY = 0;
    let touchY = 0;

    const isRising = () => target.some((t, i) => t === 1 && current[i] < DONE);

    const syncLock = (engaged = true) => {
        const should = !reduceMotion && lockQuery.matches && engaged && isRising();

        if (should && !locked) {
            locked = true;
            holdY = window.scrollY;
        } else if (!should && locked) {
            locked = false;
        }
    };

    window.addEventListener('wheel', (event) => {
        if (locked && event.deltaY > 0) event.preventDefault();
    }, { passive: false });

    window.addEventListener('touchstart', (event) => {
        touchY = event.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (event) => {
        const y = event.touches[0].clientY;
        // 손가락이 위로 움직이는 것 = 아래로 스크롤
        if (locked && y < touchY && event.cancelable) event.preventDefault();
        touchY = y;
    }, { passive: false });

    window.addEventListener('keydown', (event) => {
        if (!locked) return;
        if (['ArrowDown', 'PageDown', 'End', ' ', 'Spacebar'].includes(event.key)) event.preventDefault();
    });

    const apply = () => {
        current.forEach((v, i) => bowl.style.setProperty('--e' + (i + 1), v.toFixed(4)));
    };

    const frame = (now) => {
        // rAF 시각이 performance.now() 보다 약간 앞서 음수가 될 수 있어 0 이상으로 맞춤
        const dt = clamp(now - last, 0, 100);
        last = now;

        const k = 1 - Math.exp(-dt / TAU);
        let moving = false;

        for (let i = 0; i < current.length; i++) {
            const diff = target[i] - current[i];

            if (Math.abs(diff) < 0.0005) {
                current[i] = target[i];
            } else {
                current[i] += diff * k;
                moving = true;
            }
        }

        apply();
        syncLock(true);
        raf = moving ? requestAnimationFrame(frame) : 0;
    };

    const kick = () => {
        if (raf) return;
        last = performance.now();
        raf = requestAnimationFrame(frame);
    };

    const read = () => {
        const rect = section.getBoundingClientRect();
        const total = section.offsetHeight - window.innerHeight;
        const progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 1;

        THRESHOLDS.forEach((th, i) => { target[i] = progress >= th ? 1 : 0; });

        // 고정 구간에 들어와 있을 때만 잠금. 이미 잠겨 있으면 내려간 만큼 되돌림
        const engaged = progress > 0;

        if (locked) {
            holdY = Math.min(holdY, window.scrollY);
            if (window.scrollY > holdY + 1) window.scrollTo(0, holdY);
        }

        if (reduceMotion) {
            target.forEach((t, i) => { current[i] = t; });
            apply();
            return;
        }

        kick();
        syncLock(engaged);
    };

    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);

    // 처음 열었을 때 이미 중간쯤이면 바로 그 상태로 시작(애니메이션 없이)
    read();
    target.forEach((t, i) => { current[i] = t; });
    apply();
    // 열자마자 이미 다 올라와 있는 상태이므로 읽기 중에 걸린 잠금은 풀어 줌
    syncLock(false);
})();
