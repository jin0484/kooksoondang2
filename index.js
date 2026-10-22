/* 19세 인증 화면. 답에 따라 갈 곳을 정함.
   YES -> 테스트 페이지, NO -> 돌아가세요 화면 */
(() => {
    const gate = document.querySelector('.age_gate');

    if (!gate) return;

    const views = gate.querySelectorAll('.age_gate_view');
    // YES 를 눌렀을 때 갈 곳. 마크업에 적어 두고 여기서 읽음
    const passTarget = gate.dataset.pass;
    const denyCharacter = gate.querySelector('.age_gate_deny_character');
    const denyFrames = (denyCharacter?.dataset.frames || '')
        .split(',')
        .map((frame) => frame.trim())
        .filter(Boolean);
    const denyFrameMs = Number(denyCharacter?.dataset.frameMs) || 300;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let denyCharacterTimer = null;
    let denyFrameIndex = 0;

    function stopDenyCharacter() {
        if (denyCharacterTimer) window.clearInterval(denyCharacterTimer);
        denyCharacterTimer = null;
        denyFrameIndex = 0;

        if (denyCharacter && denyFrames[0]) denyCharacter.src = denyFrames[0];
    }

    function startDenyCharacter() {
        if (!denyCharacter || denyFrames.length < 2 || reduceMotion) return;

        stopDenyCharacter();
        denyCharacterTimer = window.setInterval(() => {
            denyFrameIndex = (denyFrameIndex + 1) % denyFrames.length;
            denyCharacter.src = denyFrames[denyFrameIndex];
        }, denyFrameMs);
    }

    function showView(name) {
        views.forEach((view) => {
            view.hidden = view.dataset.view !== name;
        });

        if (name === 'deny') startDenyCharacter();
        else stopDenyCharacter();

        // 화면이 바뀌면 그 화면의 첫 버튼으로 초점을 옮겨 키보드로도 이어서 쓸 수 있게 함
        const current = gate.querySelector(`.age_gate_view[data-view="${name}"]`);
        current?.querySelector('button')?.focus({ preventScroll: true });
    }

    gate.addEventListener('click', (event) => {
        const button = event.target instanceof Element
            ? event.target.closest('[data-answer]')
            : null;

        if (!button) return;

        const answer = button.dataset.answer;

        if (answer === 'yes') {
            if (!passTarget) return;

            // 화면을 덮으며 넘기는 일은 공통 전환(common/page_transition.js)에 맡김.
            // 전환 스크립트가 아직 안 읽혔거나 막혔더라도 갇히지 않도록 그냥 이동하는 길도 남겨 둠
            if (window.sitePageTransition) window.sitePageTransition.leaveTo(passTarget);
            else window.location.assign(passTarget);

            return;
        }

        if (answer === 'no') showView('deny');
        if (answer === 'back') showView('ask');
    });
})();
