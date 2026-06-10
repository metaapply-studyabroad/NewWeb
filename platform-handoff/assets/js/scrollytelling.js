/* ═══════════════════════════════════════════════════════════════════════════
   Decode — Scrollytelling Engine
   Handles: video scrub, parallax, step activation, TOC drawer, progress bar,
   share button, scroll cue. Animation & interaction only — no content rendering.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Passive event listener detection ──────────────────────────────────── */
  var supportsPassive = false;
  try {
    var opts = Object.defineProperty({}, 'passive', {
      get: function () { supportsPassive = true; }
    });
    window.addEventListener('testPassive', null, opts);
    window.removeEventListener('testPassive', null, opts);
  } catch (e) { /* noop */ }

  /* ── Reduced motion check ──────────────────────────────────────────────── */
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── DOM references (populated on DOMContentLoaded) ────────────────────── */
  var video, progressBar, scrollCue;
  var stickyFigure, scrollySection, stepsWrapper;
  var steps, stepInners;
  var parallaxLayers;
  var layerFg, watermarkEl;
  var videoCaption;
  var tocBtn, tocDrawer, tocOverlay, tocClose, tocItems;
  var shareBtn;

  /* ── Config ─────────────────────────────────────────────────────────────── */
  var LERP_FACTOR = 0.08;
  var LAYER_MULTIPLIERS = [30, 100, 190];

  /* ── State ──────────────────────────────────────────────────────────────── */
  var currentVideoTime = 0;
  var targetVideoTime = 0;
  var activeStepIndex = -1;
  var videoReady = false;
  var animFrameId = null;
  var ticking = false;

  /* ── Utility: linear interpolation ─────────────────────────────────────── */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /* ── Utility: clamp value ──────────────────────────────────────────────── */
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  /* ── Utility: get element offset top relative to document ──────────────── */
  function getOffsetTop(el) {
    var top = 0;
    while (el) {
      top += el.offsetTop;
      el = el.offsetParent;
    }
    return top;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     1. VIDEO SCRUB
     ═══════════════════════════════════════════════════════════════════════════ */

  function getStepCueTimes() {
    var cues = [];
    for (var i = 0; i < steps.length; i++) {
      cues.push({
        start: parseFloat(steps[i].getAttribute('data-cue-start')) || 0,
        end: parseFloat(steps[i].getAttribute('data-cue-end')) || 0
      });
    }
    return cues;
  }

  function updateVideoTime() {
    if (!videoReady || !video || prefersReducedMotion) return;

    currentVideoTime = lerp(currentVideoTime, targetVideoTime, LERP_FACTOR);

    /* Stop lerping if close enough */
    if (Math.abs(currentVideoTime - targetVideoTime) < 0.01) {
      currentVideoTime = targetVideoTime;
    }

    try {
      video.currentTime = clamp(currentVideoTime, 0, video.duration || 60);
    } catch (e) { /* video not ready yet */ }
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     2. PARALLAX LAYERS
     ═══════════════════════════════════════════════════════════════════════════ */

  function updateParallax(scrollOffset) {
    if (prefersReducedMotion || !parallaxLayers || !parallaxLayers.length) return;

    for (var i = 0; i < parallaxLayers.length; i++) {
      var y = scrollOffset * (LAYER_MULTIPLIERS[i] || 30) / 1000;
      var transform = 'translateY(' + y + 'px)';

      /* Third layer (foreground) gets a subtle scale too */
      if (i === 2) {
        var s = 1 + scrollOffset * 0.0001;
        transform = 'translateY(' + y + 'px) scale(' + clamp(s, 1, 1.15) + ')';
      }

      parallaxLayers[i].style.transform = transform;
    }
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     3. STEP ACTIVATION
     ═══════════════════════════════════════════════════════════════════════════ */

  function updateSteps(scrollY) {
    if (!steps || !steps.length) return;

    var viewportMid = scrollY + window.innerHeight * 0.5;
    var newActiveIndex = -1;
    var cues = getStepCueTimes();

    for (var i = 0; i < steps.length; i++) {
      var stepTop = getOffsetTop(steps[i]);
      var stepBottom = stepTop + steps[i].offsetHeight;

      if (viewportMid >= stepTop && viewportMid < stepBottom) {
        newActiveIndex = i;
        break;
      }
    }

    /* If scrolled past all steps, keep last active */
    if (newActiveIndex === -1 && steps.length > 0) {
      var lastStepBottom = getOffsetTop(steps[steps.length - 1]) + steps[steps.length - 1].offsetHeight;
      if (viewportMid >= lastStepBottom) {
        newActiveIndex = steps.length - 1;
      }
    }

    /* Update active class */
    if (newActiveIndex !== activeStepIndex) {
      for (var j = 0; j < stepInners.length; j++) {
        if (j === newActiveIndex) {
          stepInners[j].classList.add('is-active');
        } else {
          stepInners[j].classList.remove('is-active');
        }
      }

      activeStepIndex = newActiveIndex;

      /* Update watermark text */
      if (watermarkEl && newActiveIndex >= 0) {
        var heading = steps[newActiveIndex].querySelector('.scrolly-step-heading');
        watermarkEl.textContent = heading ? heading.textContent : '';
      }

      /* Update video caption */
      if (videoCaption && newActiveIndex >= 0) {
        var label = steps[newActiveIndex].querySelector('.scrolly-step-label');
        videoCaption.textContent = label ? label.textContent : '';
        videoCaption.classList.add('is-visible');
      } else if (videoCaption) {
        videoCaption.classList.remove('is-visible');
      }

      /* Update TOC active item */
      if (tocItems && tocItems.length) {
        for (var k = 0; k < tocItems.length; k++) {
          if (k === newActiveIndex) {
            tocItems[k].classList.add('is-active');
          } else {
            tocItems[k].classList.remove('is-active');
          }
        }
      }
    }

    /* Update video target time based on scroll position within active step */
    if (newActiveIndex >= 0 && cues[newActiveIndex]) {
      var step = steps[newActiveIndex];
      var stepTop2 = getOffsetTop(step);
      var stepHeight = step.offsetHeight;
      var progress = clamp((viewportMid - stepTop2) / stepHeight, 0, 1);

      var cue = cues[newActiveIndex];
      targetVideoTime = cue.start + (cue.end - cue.start) * progress;
    }
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     4. PROGRESS BAR
     ═══════════════════════════════════════════════════════════════════════════ */

  function updateProgress(scrollY) {
    if (!progressBar) return;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
    progressBar.style.width = clamp(pct, 0, 100) + '%';
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     5. SCROLL CUE HIDE
     ═══════════════════════════════════════════════════════════════════════════ */

  function updateScrollCue(scrollY) {
    if (!scrollCue) return;
    if (scrollY > 100) {
      scrollCue.classList.add('is-hidden');
    } else {
      scrollCue.classList.remove('is-hidden');
    }
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     6. COMBINED SCROLL HANDLER
     ═══════════════════════════════════════════════════════════════════════════ */

  function onScroll() {
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;

    updateProgress(scrollY);
    updateScrollCue(scrollY);

    /* Calculate scroll offset relative to scrolly section */
    if (scrollySection) {
      var sectionTop = getOffsetTop(scrollySection);
      var scrollOffset = scrollY - sectionTop;

      if (scrollOffset > 0) {
        updateParallax(scrollOffset);
        updateSteps(scrollY);
      } else {
        /* Before scrolly section: reset */
        if (activeStepIndex !== -1) {
          for (var i = 0; i < stepInners.length; i++) {
            stepInners[i].classList.remove('is-active');
          }
          activeStepIndex = -1;
          if (videoCaption) videoCaption.classList.remove('is-visible');
        }
      }
    } else {
      updateSteps(scrollY);
    }
  }

  function requestScroll() {
    if (!ticking) {
      requestAnimationFrame(function () {
        onScroll();
        ticking = false;
      });
      ticking = true;
    }
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     7. VIDEO LERP ANIMATION LOOP
     ═══════════════════════════════════════════════════════════════════════════ */

  function videoLerpLoop() {
    updateVideoTime();
    animFrameId = requestAnimationFrame(videoLerpLoop);
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     8. TOC DRAWER
     ═══════════════════════════════════════════════════════════════════════════ */

  function openToc() {
    if (!tocDrawer || !tocOverlay || !tocBtn) return;
    tocDrawer.classList.add('is-open');
    tocOverlay.classList.add('is-open');
    tocBtn.setAttribute('aria-expanded', 'true');
    tocDrawer.setAttribute('aria-hidden', 'false');
  }

  function closeToc() {
    if (!tocDrawer || !tocOverlay || !tocBtn) return;
    tocDrawer.classList.remove('is-open');
    tocOverlay.classList.remove('is-open');
    tocBtn.setAttribute('aria-expanded', 'false');
    tocDrawer.setAttribute('aria-hidden', 'true');
  }

  function initTocDrawer() {
    tocBtn = document.getElementById('scrolly-toc-btn');
    tocDrawer = document.getElementById('scrolly-toc-drawer');
    tocOverlay = document.getElementById('scrolly-toc-overlay');
    tocClose = document.getElementById('scrolly-toc-close');
    tocItems = document.querySelectorAll('.scrolly-toc-item');

    if (!tocBtn || !tocDrawer) return;

    tocBtn.addEventListener('click', function () {
      var isOpen = tocDrawer.classList.contains('is-open');
      if (isOpen) {
        closeToc();
      } else {
        openToc();
      }
    });

    if (tocClose) {
      tocClose.addEventListener('click', closeToc);
    }

    if (tocOverlay) {
      tocOverlay.addEventListener('click', closeToc);
    }

    /* Escape key closes drawer */
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.keyCode === 27) && tocDrawer.classList.contains('is-open')) {
        closeToc();
        tocBtn.focus();
      }
    });

    /* TOC item click — smooth scroll to chapter */
    for (var i = 0; i < tocItems.length; i++) {
      tocItems[i].addEventListener('click', function (e) {
        e.preventDefault();
        var targetId = this.getAttribute('href');
        if (targetId) {
          var targetEl = document.querySelector(targetId);
          if (targetEl) {
            closeToc();
            var targetTop = getOffsetTop(targetEl) - 96;
            window.scrollTo({
              top: targetTop,
              behavior: prefersReducedMotion ? 'auto' : 'smooth'
            });
          }
        }
      });
    }
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     9. SHARE BUTTON
     ═══════════════════════════════════════════════════════════════════════════ */

  /* ── Share popup (reuses .share-popup styles from styles.css) ── */
  var scrollySharePopup = null;

  function buildScrollySharePopup(btn, openRight) {
    if (scrollySharePopup) { closeScrollySharePopup(); return; }

    var popup = document.createElement('div');
    popup.className = 'share-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'Share this story');
    popup.innerHTML =
      '<div class="share-popup-btns">' +
        '<button class="share-popup-btn" data-scrolly-share="twitter" title="Post on X" aria-label="Post on X">' +
          '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2H21l-6.553 7.49L22 22h-6.828l-5.35-6.97L3.71 22H1l7.02-8.03L2 2h6.914l4.84 6.285L18.244 2zm-1.195 18h1.892L7.86 3.938H5.83L17.05 20z"/></svg>' +
        '</button>' +
        '<button class="share-popup-btn" data-scrolly-share="whatsapp" title="Share on WhatsApp" aria-label="Share on WhatsApp">' +
          '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
        '</button>' +
        '<button class="share-popup-btn" data-scrolly-share="facebook" title="Share on Facebook" aria-label="Share on Facebook">' +
          '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' +
        '</button>' +
        '<button class="share-popup-btn" data-scrolly-share="linkedin" title="Share on LinkedIn" aria-label="Share on LinkedIn">' +
          '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>' +
        '</button>' +
        '<hr class="share-popup-divider">' +
        '<button class="share-popup-btn" data-scrolly-share="print" title="Print article" aria-label="Print article">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>' +
        '</button>' +
        '<button class="share-popup-btn" data-scrolly-share="copy" title="Copy link" aria-label="Copy link">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>' +
        '</button>' +
      '</div>';

    document.body.appendChild(popup);
    scrollySharePopup = popup;

    /* Wire up popup buttons */
    popup.addEventListener('click', function (e) {
      var btn2 = e.target.closest('[data-scrolly-share]');
      if (!btn2) return;
      var action = btn2.getAttribute('data-scrolly-share');
      var url = encodeURIComponent(window.location.href);
      var title = encodeURIComponent(document.title);
      var shareUrls = {
        twitter:  'https://twitter.com/intent/tweet?url=' + url + '&text=' + title,
        whatsapp: 'https://wa.me/?text=' + title + '%20' + url,
        facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + url,
        linkedin: 'https://www.linkedin.com/shareArticle?mini=true&url=' + url
      };
      if (action === 'print') { window.print(); closeScrollySharePopup(); return; }
      if (action === 'copy') {
        navigator.clipboard.writeText(window.location.href).then(function () {
          btn2.classList.add('copy-done');
          setTimeout(function () { btn2.classList.remove('copy-done'); closeScrollySharePopup(); }, 1200);
        });
        return;
      }
      if (shareUrls[action]) window.open(shareUrls[action], '_blank', 'width=600,height=400');
      closeScrollySharePopup();
    });

    /* Position: right of button (meta row) or left of button (fixed bottom-right) */
    requestAnimationFrame(function () {
      var btnRect = btn.getBoundingClientRect();
      var popW = popup.offsetWidth;
      var popH = popup.offsetHeight;
      popup.style.top  = Math.round(btnRect.top + (btnRect.height - popH) / 2) + 'px';
      if (openRight) {
        popup.style.left = (btnRect.right + 8) + 'px';
      } else {
        popup.style.left = (btnRect.left - popW - 8) + 'px';
      }
      requestAnimationFrame(function () {
        popup.classList.add('is-open');
      });
    });

    /* Close on outside click */
    setTimeout(function () {
      document.addEventListener('click', onScrollyOutsideClick, true);
      document.addEventListener('keydown', onScrollyEscKey, true);
    }, 10);
  }

  function closeScrollySharePopup() {
    if (!scrollySharePopup) return;
    scrollySharePopup.classList.remove('is-open');
    var p = scrollySharePopup;
    setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 200);
    scrollySharePopup = null;
    document.removeEventListener('click', onScrollyOutsideClick, true);
    document.removeEventListener('keydown', onScrollyEscKey, true);
  }

  function onScrollyOutsideClick(e) {
    if (scrollySharePopup && !scrollySharePopup.contains(e.target) && e.target !== shareBtn) {
      closeScrollySharePopup();
    }
  }

  function onScrollyEscKey(e) {
    if (e.key === 'Escape') closeScrollySharePopup();
  }

  function initShareButton() {
    shareBtn = document.getElementById('scrolly-share-btn');
    if (!shareBtn) return;

    shareBtn.addEventListener('click', function () {
      /* Mobile — native share */
      if (window.innerWidth < 768) {
        if (navigator.share) {
          navigator.share({ title: document.title, url: window.location.href }).catch(function () {});
        }
        return;
      }
      /* Desktop — custom popup */
      buildScrollySharePopup(shareBtn);
    });
  }

  function showShareFeedback() {
    if (!shareBtn) return;
    var original = shareBtn.innerHTML;
    shareBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    setTimeout(function () {
      shareBtn.innerHTML = original;
    }, 1500);
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     10. PAYWALL
     ═══════════════════════════════════════════════════════════════════════════ */

  /* Safe storage helpers (self-contained, mirrors main.js pattern) */
  function safeGet(storage, key) {
    try { return storage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(storage, key, val) {
    try { storage.setItem(key, val); } catch (e) { /* quota or security error */ }
  }

  function initPaywall() {
    var isMember = safeGet(localStorage, 'decode_member') === '1'
                || safeGet(sessionStorage, 'decode_unlocked') === '1';
    if (isMember) {
      document.body.classList.add('scrolly-unlocked');
    }

    /* "Read free" button handler */
    var freeBtn = document.querySelector('[data-action="unlock-free"]');
    if (freeBtn) {
      freeBtn.addEventListener('click', function () {
        safeSet(sessionStorage, 'decode_unlocked', '1');
        document.body.classList.add('scrolly-unlocked');

        /* Smooth scroll to the now-revealed content */
        var lockedContent = document.getElementById('scrolly-locked-content');
        if (lockedContent) {
          var top = getOffsetTop(lockedContent) - 80;
          window.scrollTo({
            top: top,
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
          });
        }
      });
    }
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     11. WATERMARK TEXT INIT
     ═══════════════════════════════════════════════════════════════════════════ */

  function initWatermark() {
    layerFg = document.getElementById('scrolly-layer-fg');
    if (!layerFg) return;

    /* Create watermark text span if not present */
    watermarkEl = layerFg.querySelector('.scrolly-watermark-text');
    if (!watermarkEl) {
      watermarkEl = document.createElement('span');
      watermarkEl.className = 'scrolly-watermark-text';
      watermarkEl.setAttribute('aria-hidden', 'true');
      layerFg.appendChild(watermarkEl);
    }

    /* Set initial text from first chapter heading */
    if (steps && steps.length > 0) {
      var firstHeading = steps[0].querySelector('.scrolly-step-heading');
      if (firstHeading) {
        watermarkEl.textContent = firstHeading.textContent;
      }
    }
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     10b. META ACTION BUTTONS (copy link, print, share)
     ═══════════════════════════════════════════════════════════════════════════ */

  /* ── Article font resize ── */
  var articleFontSize = 16;
  var FONT_MIN = 13, FONT_MAX = 22;
  function changeArticleFontSize(delta) {
    articleFontSize = Math.min(FONT_MAX, Math.max(FONT_MIN, articleFontSize + delta));
    document.querySelectorAll('.scrolly-closing-text p, .scrolly-closing-text blockquote').forEach(function(el){
      el.style.fontSize = articleFontSize + 'px';
    });
  }

  /* ── Article TTS ── */
  var ttsScrolly = null, ttsScrollyPlaying = false;
  function toggleScrollyAudio() {
    var synth = window.speechSynthesis;
    if (!synth) return;
    if (ttsScrollyPlaying) {
      synth.cancel(); ttsScrollyPlaying = false; updateScrollyAudioBtn(false);
    } else {
      synth.cancel();
      var text = Array.from(document.querySelectorAll('.scrolly-closing-text p')).map(function(p){ return p.innerText; }).join(' ');
      ttsScrolly = new SpeechSynthesisUtterance(text);
      ttsScrolly.lang = 'en-IN'; ttsScrolly.rate = 0.95;
      ttsScrolly.onend = function(){ ttsScrollyPlaying = false; updateScrollyAudioBtn(false); };
      synth.speak(ttsScrolly); ttsScrollyPlaying = true; updateScrollyAudioBtn(true);
    }
  }
  function updateScrollyAudioBtn(playing) {
    var label = document.getElementById('audio-label-scrolly');
    if (label) label.textContent = playing ? 'Stop' : 'Listen';
  }

  function initMetaActions() {
    document.querySelectorAll('[data-scrolly-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = this.getAttribute('data-scrolly-action');
        if (action === 'copy-link') {
          var url = window.location.href;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function () {
              btn.style.color = '#7ecf9a';
              setTimeout(function () { btn.style.color = ''; }, 1500);
            });
          }
        } else if (action === 'print') {
          window.print();
        } else if (action === 'font-decrease') {
          changeArticleFontSize(-2);
        } else if (action === 'font-increase') {
          changeArticleFontSize(2);
        } else if (action === 'listen') {
          toggleScrollyAudio();
        } else if (action === 'share') {
          if (window.innerWidth < 768) {
            if (navigator.share) navigator.share({ title: document.title, url: window.location.href }).catch(function(){});
          } else {
            buildScrollySharePopup(btn, true); /* open to the right */
          }
        }
      });
    });
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     11. INIT
     ═══════════════════════════════════════════════════════════════════════════ */

  function init() {
    /* Replace no-js class */
    document.documentElement.className = document.documentElement.className.replace(/\bno-js\b/, 'js');

    /* Gather DOM references */
    video = document.getElementById('scrolly-video');
    progressBar = document.querySelector('.scrolly-progress');
    scrollCue = document.querySelector('.scrolly-scroll-cue');
    stickyFigure = document.querySelector('.scrolly-sticky-figure');
    scrollySection = document.querySelector('.scrolly-section');
    stepsWrapper = document.querySelector('.scrolly-steps-wrapper');
    steps = document.querySelectorAll('.scrolly-step');
    stepInners = document.querySelectorAll('.scrolly-step-inner');
    parallaxLayers = document.querySelectorAll('.scrolly-parallax-layer');
    videoCaption = document.getElementById('scrolly-video-caption');

    /* Video setup */
    if (video) {
      video.addEventListener('loadedmetadata', function () {
        videoReady = true;
      });

      /* Also check if already loaded */
      if (video.readyState >= 1) {
        videoReady = true;
      }
    }

    /* Init subsystems */
    initPaywall();
    initWatermark();
    initTocDrawer();
    initShareButton();
    initMetaActions();

    /* Scroll listener */
    window.addEventListener('scroll', requestScroll, supportsPassive ? { passive: true } : false);

    /* Start video lerp loop */
    if (!prefersReducedMotion) {
      videoLerpLoop();
    }

    /* Initial scroll position calculation */
    onScroll();
  }


  /* ── Boot ──────────────────────────────────────────────────────────────── */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
