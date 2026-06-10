/* ==========================================================
   DECODE v3 — article.js  (article page only)
   No inline event handlers — all listeners via data-* attributes.
   ========================================================== */

(function () {
    'use strict';

    /* ── Reading progress bar ── */
    function updateProgress() {
        var el = document.getElementById('progress');
        if (!el) return;
        var scrollTop = window.scrollY || document.documentElement.scrollTop;
        var docH = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        el.style.width = (docH > 0 ? (scrollTop / docH) * 100 : 0) + '%';
    }

    /* ── Newsletter slide-in ── */
    var nlShown = false;
    function maybeShowNewsletter() {
        if (nlShown) return;
        var scrollPct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        if (scrollPct > 55) {
            var nl = document.getElementById('nl-overlay');
            if (nl) { nl.classList.add('show'); nlShown = true; }
        }
    }

    /* ── Throttled scroll handler (rAF-based, single listener) ── */
    var scrollTicking = false;
    function onScroll() {
        if (!scrollTicking) {
            requestAnimationFrame(function () {
                updateProgress();
                maybeShowNewsletter();
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    }

    /* Passive scroll listener for better performance */
    var supportsPassive = false;
    try { var opts = Object.defineProperty({}, 'passive', { get: function () { supportsPassive = true; } }); window.addEventListener('test', null, opts); } catch (e) {}
    window.addEventListener('scroll', onScroll, supportsPassive ? { passive: true } : false);

    /* ── Safe storage helpers ── */
    function safeGetItem(storage, key) {
        try { return storage.getItem(key); } catch (e) { return null; }
    }
    function safeSetItem(storage, key, value) {
        try { storage.setItem(key, value); } catch (e) { /* quota or security error */ }
    }

    /* ── Smooth scroll helper (with fallback) ── */
    function smoothScrollTo(target, opts) {
        try {
            if (typeof target === 'number') {
                window.scrollTo({ top: target, behavior: 'smooth' });
            } else if (target && target.scrollIntoView) {
                target.scrollIntoView(opts || { behavior: 'smooth', block: 'start' });
            }
        } catch (e) {
            /* Fallback for browsers that don't support options */
            if (typeof target === 'number') {
                window.scrollTo(0, target);
            } else if (target) {
                target.scrollIntoView(true);
            }
        }
    }

    /* ── Share helpers ── */
    function shareTo(platform) {
        var url = encodeURIComponent(window.location.href);
        var title = encodeURIComponent(document.title);
        var urls = {
            twitter:  'https://twitter.com/intent/tweet?url=' + url + '&text=' + title,
            whatsapp: 'https://wa.me/?text=' + title + '%20' + url,
            facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + url,
            linkedin: 'https://www.linkedin.com/shareArticle?mini=true&url=' + url
        };
        if (urls[platform]) window.open(urls[platform], '_blank', 'width=600,height=400');
    }

    /* ── Custom share popup ── */
    var sharePopup = null;

    function buildSharePopup(anchorBtn) {
        /* Remove existing popup if any */
        closeSharePopup();

        /* Wrap the anchor button so popup can position relative to it */
        var wrap = anchorBtn.parentNode;
        if (!wrap.classList.contains('article-meta-share-wrap')) {
            var newWrap = document.createElement('div');
            newWrap.className = 'article-meta-share-wrap';
            wrap.insertBefore(newWrap, anchorBtn);
            newWrap.appendChild(anchorBtn);
            wrap = newWrap;
        }

        var popup = document.createElement('div');
        popup.className = 'share-popup';
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-label', 'Share this story');
        popup.innerHTML =
            '<div class="share-popup-btns">' +
                '<button class="share-popup-btn" data-action="share-twitter" title="Post on X" aria-label="Post on X">' +
                    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2H21l-6.553 7.49L22 22h-6.828l-5.35-6.97L3.71 22H1l7.02-8.03L2 2h6.914l4.84 6.285L18.244 2zm-1.195 18h1.892L7.86 3.938H5.83L17.05 20z"/></svg>' +
                '</button>' +
                '<button class="share-popup-btn" data-action="share-whatsapp" title="Share on WhatsApp" aria-label="Share on WhatsApp">' +
                    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
                '</button>' +
                '<button class="share-popup-btn" data-action="share-facebook" title="Share on Facebook" aria-label="Share on Facebook">' +
                    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' +
                '</button>' +
                '<button class="share-popup-btn" data-action="share-linkedin" title="Share on LinkedIn" aria-label="Share on LinkedIn">' +
                    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>' +
                '</button>' +
                '<hr class="share-popup-divider">' +
                '<button class="share-popup-btn" data-action="print" title="Print article" aria-label="Print article">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>' +
                '</button>' +
                '<button class="share-popup-btn" data-action="copy-link" title="Copy link" aria-label="Copy link">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>' +
                '</button>' +
            '</div>';

        wrap.appendChild(popup);
        sharePopup = popup;

        /* Position to the RIGHT of the share button, vertically centred */
        requestAnimationFrame(function () {
            var btnRect = anchorBtn.getBoundingClientRect();
            var popH    = popup.offsetHeight;
            var gap     = 8;

            popup.style.left = (btnRect.right + gap) + 'px';
            popup.style.top  = Math.round(btnRect.top + (btnRect.height - popH) / 2) + 'px';

            requestAnimationFrame(function () {
                popup.classList.add('is-open');
            });
        });

        /* Close on outside click */
        setTimeout(function () {
            document.addEventListener('click', onOutsideClick, true);
            document.addEventListener('keydown', onEscKey, true);
        }, 10);
    }

    function closeSharePopup() {
        if (sharePopup) {
            sharePopup.classList.remove('is-open');
            var p = sharePopup;
            setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 200);
            sharePopup = null;
        }
        document.removeEventListener('click', onOutsideClick, true);
        document.removeEventListener('keydown', onEscKey, true);
    }

    function onOutsideClick(e) {
        if (sharePopup && !sharePopup.contains(e.target)) {
            closeSharePopup();
        }
    }

    function onEscKey(e) {
        if (e.key === 'Escape') closeSharePopup();
    }

    function toggleSharePopup(btn) {
        /* Mobile — use native share sheet */
        if (window.innerWidth < 768) {
            shareNative();
            return;
        }
        /* Desktop — custom popup */
        if (sharePopup) {
            closeSharePopup();
        } else {
            buildSharePopup(btn);
        }
    }

    function copyLink(btn) {
        var url = window.location.href;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(function () {
                showCopyFeedback(btn);
            });
        } else {
            /* Fallback for older browsers */
            var ta = document.createElement('textarea');
            ta.value = url;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); showCopyFeedback(btn); } catch (e) { /* ignore */ }
            document.body.removeChild(ta);
        }
    }

    function showCopyFeedback(btn) {
        var origHTML = btn.innerHTML;
        btn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
        btn.title = 'Copied!';
        setTimeout(function () { btn.innerHTML = origHTML; btn.title = 'Copy link'; }, 2000);
    }

    function shareNative() {
        if (navigator.share) {
            navigator.share({ title: document.title, url: window.location.href }).catch(function () {});
        }
    }

    /* ── Font size (increase / decrease) ── */
    var articleFontSize = 18;
    var FONT_MIN = 14;
    var FONT_MAX = 26;

    function changeFontSize(delta) {
        var body = document.querySelector('.article-body');
        if (!body) return;
        articleFontSize = Math.min(FONT_MAX, Math.max(FONT_MIN, articleFontSize + delta));
        body.style.fontSize = articleFontSize + 'px';
    }

    /* ── Audio TTS (Web Speech API) ── */
    var ttsUtterance = null;
    var ttsPlaying = false;

    function toggleAudio() {
        var synth = window.speechSynthesis;
        if (!synth) return;

        if (ttsPlaying) {
            synth.cancel();
            ttsPlaying = false;
            updateAudioBtn(false);
        } else {
            synth.cancel();
            var article = document.querySelector('.article-body');
            var text = article ? article.innerText.trim() : document.title;
            ttsUtterance = new SpeechSynthesisUtterance(text);
            ttsUtterance.lang = 'en-IN';
            ttsUtterance.rate = 0.95;
            ttsUtterance.pitch = 1;
            ttsUtterance.onend = function () { ttsPlaying = false; updateAudioBtn(false); };
            ttsUtterance.onerror = function () { ttsPlaying = false; updateAudioBtn(false); };
            try {
                synth.speak(ttsUtterance);
                ttsPlaying = true;
                updateAudioBtn(true);
            } catch (e) {
                ttsPlaying = false;
                updateAudioBtn(false);
            }
        }
    }

    function updateAudioBtn(playing) {
        var label = document.getElementById('audio-label');
        var icon = document.getElementById('audio-icon');
        if (label) label.textContent = playing ? 'Stop' : 'Listen';
        if (icon) {
            icon.innerHTML = playing
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z"/>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>';
        }
    }

    /* ── Note slider (From the Editor) — with touch swipe + keyboard ── */
    function initNoteSlider(containerSel) {
        var container = document.querySelector(containerSel);
        if (!container) return;

        var slides = container.querySelectorAll('.note-slide');
        var dashes = container.querySelectorAll('.note-dash');
        var index = 0;

        function update(newIdx) {
            if (!slides.length) return;
            slides[index].classList.remove('active');
            slides[index].setAttribute('aria-hidden', 'true');
            if (dashes[index]) dashes[index].classList.remove('active');
            index = (newIdx + slides.length) % slides.length;
            slides[index].classList.add('active');
            slides[index].setAttribute('aria-hidden', 'false');
            if (dashes[index]) dashes[index].classList.add('active');
        }

        /* Arrow buttons */
        container.querySelectorAll('[data-dir]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var dir = this.getAttribute('data-dir');
                update(dir === 'prev' ? index - 1 : index + 1);
            });
        });

        /* Dash indicators */
        dashes.forEach(function (dash, i) {
            dash.addEventListener('click', function () { update(i); });
        });

        /* Keyboard navigation */
        container.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') { update(index - 1); e.preventDefault(); }
            if (e.key === 'ArrowRight') { update(index + 1); e.preventDefault(); }
        });

        /* Touch swipe support */
        var touchStartX = 0;
        container.addEventListener('touchstart', function (e) {
            touchStartX = e.touches[0].clientX;
        }, supportsPassive ? { passive: true } : false);
        container.addEventListener('touchend', function (e) {
            var diff = touchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
                update(diff > 0 ? index + 1 : index - 1);
            }
        });

        /* Set initial ARIA state */
        slides.forEach(function (slide, i) {
            slide.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
        });
    }

    /* ── Paywall ── */
    function initPaywall() {
        var isMember = safeGetItem(localStorage, 'decode_member') === '1'
                    || safeGetItem(sessionStorage, 'decode_unlocked') === '1';
        if (isMember) document.body.classList.add('article-unlocked');
    }

    function unlockFree() {
        safeSetItem(sessionStorage, 'decode_unlocked', '1');
        document.body.classList.add('article-unlocked');
    }

    /* ── Init everything on DOMContentLoaded ── */
    document.addEventListener('DOMContentLoaded', function () {

        /* Apply data-bg attributes as background-image */
        document.querySelectorAll('[data-bg]').forEach(function (el) {
            el.style.backgroundImage = 'url(' + el.getAttribute('data-bg') + ')';
        });

        /* Prevent nl-overlay form submission default */
        var nlForm = document.getElementById('nl-overlay-form');
        if (nlForm) nlForm.addEventListener('submit', function (e) { e.preventDefault(); });

        /* Action dispatcher for data-action buttons */
        document.querySelectorAll('[data-action]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                var action = this.getAttribute('data-action');

                switch (action) {
                    case 'share-twitter':
                        shareTo('twitter');
                        break;
                    case 'share-whatsapp':
                        shareTo('whatsapp');
                        break;
                    case 'share-facebook':
                        shareTo('facebook');
                        break;
                    case 'share-linkedin':
                        shareTo('linkedin');
                        break;
                    case 'copy-link':
                        copyLink(this);
                        break;
                    case 'scroll-top':
                        smoothScrollTo(0);
                        break;
                    case 'font-decrease':
                        changeFontSize(-2);
                        break;
                    case 'font-increase':
                        changeFontSize(2);
                        break;
                    case 'listen':
                        toggleAudio();
                        break;
                    case 'unlock-free':
                        unlockFree();
                        break;
                    case 'share-native':
                        shareNative();
                        break;
                    case 'share':
                        toggleSharePopup(this);
                        break;
                    case 'print':
                        window.print();
                        break;
                    case 'dismiss-newsletter':
                        var nl = document.getElementById('nl-overlay');
                        if (nl) nl.classList.remove('show');
                        break;
                    case 'open-join':
                        /* Open the auth modal on the join tab (defined in main.js) */
                        var authModal = document.getElementById('auth-modal');
                        if (authModal) {
                            authModal.classList.add('open');
                            document.body.style.overflow = 'hidden';
                            /* Switch to join tab */
                            var tabJoin = document.getElementById('auth-tab-join');
                            var tabSignin = document.getElementById('auth-tab-signin');
                            var panelJoin = document.getElementById('auth-join-panel');
                            var panelSignin = document.getElementById('auth-signin-panel');
                            if (tabJoin) tabJoin.className = 'auth-tab-btn active';
                            if (tabSignin) tabSignin.className = 'auth-tab-btn';
                            if (panelJoin) panelJoin.classList.remove('d-none');
                            if (panelSignin) panelSignin.classList.add('d-none');
                        }
                        break;
                }
            });
        });

        /* Smooth anchor scrolling for TOC links */
        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                var target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    e.preventDefault();
                    smoothScrollTo(target, { behavior: 'smooth', block: 'start' });
                }
            });
        });

        /* ── Horizontal drag-to-scroll for tags ── */
        (function () {
            var tags = document.querySelector('.article-tags');
            if (!tags) return;

            /* Mouse wheel → horizontal scroll */
            tags.addEventListener('wheel', function (e) {
                if (Math.abs(e.deltaY) > 0) {
                    e.preventDefault();
                    tags.scrollLeft += e.deltaY;
                }
            });

            /* Click-and-drag scroll */
            var isDown = false, startX, scrollLeft;

            tags.addEventListener('mousedown', function (e) {
                isDown = true;
                tags.style.cursor = 'grabbing';
                startX = e.pageX - tags.offsetLeft;
                scrollLeft = tags.scrollLeft;
            });

            tags.addEventListener('mouseleave', function () {
                isDown = false;
                tags.style.cursor = 'grab';
            });

            tags.addEventListener('mouseup', function () {
                isDown = false;
                tags.style.cursor = 'grab';
            });

            tags.addEventListener('mousemove', function (e) {
                if (!isDown) return;
                e.preventDefault();
                var x = e.pageX - tags.offsetLeft;
                tags.scrollLeft = scrollLeft - (x - startX);
            });

            tags.style.cursor = 'grab';
        })();

        /* ── Photo Gallery Navigation ── */
        (function () {
            function initGallery(galleryEl) {
                var track = galleryEl.querySelector('.article-gallery-track');
                var slides = galleryEl.querySelectorAll('.article-gallery-slide');
                var btnLeft = galleryEl.querySelector('.article-gallery-arrow-left');
                var btnRight = galleryEl.querySelector('.article-gallery-arrow-right');
                var currentEl = galleryEl.querySelector('.article-gallery-current');
                var totalEl = galleryEl.querySelector('.article-gallery-total');
                if (!track || !slides.length || !btnLeft || !btnRight) return;

                var currentIndex = 0;
                var total = slides.length;
                if (totalEl) totalEl.textContent = total;

                function updateState() {
                    if (currentEl) currentEl.textContent = currentIndex + 1;
                    btnLeft.classList.toggle('disabled', currentIndex === 0);
                    btnRight.classList.toggle('disabled', currentIndex === total - 1);
                }

                function scrollToIndex(idx) {
                    if (idx < 0 || idx >= total) return;
                    currentIndex = idx;
                    slides[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                    updateState();
                }

                btnLeft.addEventListener('click', function () { scrollToIndex(currentIndex - 1); });
                btnRight.addEventListener('click', function () { scrollToIndex(currentIndex + 1); });

                /* Update counter on manual scroll/swipe */
                var scrollTimeout;
                track.addEventListener('scroll', function () {
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(function () {
                        var scrollLeft = track.scrollLeft;
                        var slideWidth = slides[0].offsetWidth + 12;
                        var newIndex = Math.round(scrollLeft / slideWidth);
                        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < total) {
                            currentIndex = newIndex;
                            updateState();
                        }
                    }, 100);
                }, supportsPassive ? { passive: true } : false);

                /* Keyboard navigation */
                galleryEl.setAttribute('tabindex', '0');
                galleryEl.addEventListener('keydown', function (e) {
                    if (e.key === 'ArrowLeft') { scrollToIndex(currentIndex - 1); e.preventDefault(); }
                    if (e.key === 'ArrowRight') { scrollToIndex(currentIndex + 1); e.preventDefault(); }
                });

                updateState();
            }

            document.querySelectorAll('.article-gallery').forEach(initGallery);
        })();

        /* ── Related articles carousel ── */
        (function () {
            var card = document.querySelector('.article-related-card');
            if (!card) return;

            var pages = card.querySelectorAll('.article-related-page');
            var btnLeft = card.querySelector('.article-related-arrow-left');
            var btnRight = card.querySelector('.article-related-arrow-right');
            if (!pages.length || !btnLeft || !btnRight) return;

            var currentPage = 0;

            function updateArrows() {
                btnLeft.classList.toggle('disabled', currentPage === 0);
                btnRight.classList.toggle('disabled', currentPage === pages.length - 1);
            }

            function goTo(idx) {
                if (idx < 0 || idx >= pages.length || idx === currentPage) return;
                pages[currentPage].classList.remove('active');
                currentPage = idx;
                pages[currentPage].classList.add('active');
                updateArrows();
            }

            btnLeft.addEventListener('click', function () { goTo(currentPage - 1); });
            btnRight.addEventListener('click', function () { goTo(currentPage + 1); });

            /* Touch swipe support */
            var touchStartX = 0;
            card.addEventListener('touchstart', function (e) {
                touchStartX = e.touches[0].clientX;
            }, supportsPassive ? { passive: true } : false);
            card.addEventListener('touchend', function (e) {
                var diff = touchStartX - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 50) {
                    goTo(diff > 0 ? currentPage + 1 : currentPage - 1);
                }
            });

            updateArrows();
        })();

        /* Init slider */
        initNoteSlider('.sidebar-editor');

        /* Init paywall */
        initPaywall();
    });

})();
