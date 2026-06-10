/* ==========================================================
   DECODE v3 — main.js  (shared across all pages)
   No inline event handlers — all listeners attached here.
   ========================================================== */

(function () {
    'use strict';

    /* ── Polyfills for older browsers ── */
    if (!NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
    }
    if (!Element.prototype.closest) {
        Element.prototype.closest = function (sel) {
            var el = this;
            while (el && el.nodeType === 1) {
                if (el.matches ? el.matches(sel) : el.msMatchesSelector(sel)) return el;
                el = el.parentElement;
            }
            return null;
        };
    }

    /* ── Storage helpers (Safari private mode safe) ── */
    function safeSetItem(storage, key, value) {
        try { storage.setItem(key, value); } catch (e) { /* quota or security error */ }
    }
    function safeGetItem(storage, key) {
        try { return storage.getItem(key); } catch (e) { return null; }
    }
    function safeRemoveItem(storage, key) {
        try { storage.removeItem(key); } catch (e) { /* ignore */ }
    }

    /* ── Array helpers (IE11 safe) ── */
    function toArray(nodeList) {
        return Array.prototype.slice.call(nodeList);
    }
    function strIncludes(str, search) {
        return str.indexOf(search) !== -1;
    }

    /* Remove no-js class to enable JS-specific styles */
    document.documentElement.classList.remove('no-js');

    var selectedPlan = 'sixmonths';

    /* ── Search Overlay ── */
    var searchTrigger = null; /* stores element that opened search for focus return */

    function toggleSearch() {
        var o = document.getElementById('search-overlay');
        if (!o) return;
        var isOpen = o.classList.contains('open');
        if (isOpen) {
            o.classList.remove('open');
            document.body.style.overflow = '';
            if (searchTrigger) { searchTrigger.focus(); searchTrigger = null; }
        } else {
            searchTrigger = document.activeElement;
            o.classList.add('open');
            document.body.style.overflow = 'hidden';
            var input = o.querySelector('input');
            if (input) input.focus();
            trapFocusIn(o);
        }
    }

    /* ── Focus Trap Utility ── */
    var activeTrap = null;
    function trapFocusIn(container) {
        activeTrap = function (e) {
            if (e.key !== 'Tab') return;
            var focusable = toArray(container.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            ));
            if (focusable.length === 0) return;
            var first = focusable[0];
            var last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', activeTrap);
    }
    function releaseFocusTrap() {
        if (activeTrap) { document.removeEventListener('keydown', activeTrap); activeTrap = null; }
    }

    /* ── Auth Modal ── */
    var authTrigger = null; /* stores element that opened modal for focus return */

    function openAuthModal(tab, plan) {
        if (plan) {
            selectedPlan = plan;
            updatePlanPills();
        }
        var modal = document.getElementById('auth-modal');
        if (modal) {
            authTrigger = document.activeElement;
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
            switchAuthTab(tab || 'signin');
            setTimeout(function () {
                var inp = modal.querySelector('input');
                if (inp) inp.focus();
            }, 120);
            trapFocusIn(modal);
        }
    }

    function closeAuthModal() {
        var m = document.getElementById('auth-modal');
        if (m) m.classList.remove('open');
        document.body.style.overflow = '';
        releaseFocusTrap();
        if (authTrigger) { authTrigger.focus(); authTrigger = null; }
    }

    function switchAuthTab(tab) {
        var isSignin = (tab === 'signin');
        var tabSignin = document.getElementById('auth-tab-signin');
        var tabJoin = document.getElementById('auth-tab-join');
        var panelSignin = document.getElementById('auth-signin-panel');
        var panelJoin = document.getElementById('auth-join-panel');

        if (tabSignin) tabSignin.className = 'auth-tab-btn' + (isSignin ? ' active' : '');
        if (tabJoin) tabJoin.className = 'auth-tab-btn' + (!isSignin ? ' active' : '');
        if (panelSignin) {
            if (isSignin) { panelSignin.classList.remove('d-none'); } else { panelSignin.classList.add('d-none'); }
        }
        if (panelJoin) {
            if (!isSignin) { panelJoin.classList.remove('d-none'); } else { panelJoin.classList.add('d-none'); }
        }
        /* Clear errors */
        var signinErr = document.getElementById('signin-error');
        var joinErr = document.getElementById('join-error');
        if (signinErr) signinErr.style.display = 'none';
        if (joinErr) joinErr.style.display = 'none';
        document.querySelectorAll('.auth-modal-input').forEach(function (i) {
            i.classList.remove('error');
        });
    }

    function updatePlanPills() {
        ['monthly', 'sixmonths', 'annual'].forEach(function (p) {
            var el = document.getElementById('pill-' + p);
            if (el) el.className = 'plan-pill-btn' + (p === selectedPlan ? ' selected' : '');
        });
    }

    function togglePasswordVisibility(inputId, btn) {
        var inp = document.getElementById(inputId);
        if (!inp) return;
        var show = (inp.type === 'password');
        inp.type = show ? 'text' : 'password';
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        btn.innerHTML = show
            ? '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>'
            : '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>';
    }

    function handleGoogleAuth(tab) {
        var btnId = 'google-btn-' + tab;
        var btn = document.getElementById(btnId);
        if (!btn) return;

        var originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<svg class="gspin-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4285F4" stroke-width="2.5"><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg><span>Connecting to Google\u2026</span>';

        setTimeout(function () {
            if (tab === 'signin') {
                safeSetItem(localStorage, 'decode_member', '1');
                safeSetItem(localStorage, 'decode_email', 'user@gmail.com');
                closeAuthModal();
                document.body.classList.add('article-unlocked');
                updateHeaderMemberState();
            } else {
                safeSetItem(sessionStorage, 'signup_name', 'Google User');
                safeSetItem(sessionStorage, 'signup_email', 'user@gmail.com');
                safeSetItem(sessionStorage, 'signup_plan', selectedPlan);
                window.location.href = 'payment.html?plan=' + selectedPlan;
            }
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }, 1500);
    }

    function handleSignIn(e) {
        e.preventDefault();
        var emailEl = document.getElementById('signin-email');
        var passwordEl = document.getElementById('signin-password');
        var errEl = document.getElementById('signin-error');
        if (!emailEl || !passwordEl || !errEl) return;

        var email = emailEl.value.trim();
        var password = passwordEl.value;
        errEl.style.display = 'none';
        errEl.setAttribute('aria-live', 'assertive');
        document.querySelectorAll('.auth-modal-input').forEach(function (i) { i.classList.remove('error'); });

        if (!email || email.indexOf('@') === -1) {
            errEl.textContent = 'Please enter a valid email address.';
            errEl.style.display = 'block';
            emailEl.classList.add('error');
            return;
        }
        if (!password || password.length < 6) {
            errEl.textContent = 'Please enter your password.';
            errEl.style.display = 'block';
            passwordEl.classList.add('error');
            return;
        }

        var btn = document.getElementById('signin-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Signing in\u2026';
        }

        setTimeout(function () {
            safeSetItem(localStorage, 'decode_member', '1');
            safeSetItem(localStorage, 'decode_email', email);
            closeAuthModal();
            document.body.classList.add('article-unlocked');
            updateHeaderMemberState();
            if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
        }, 1100);
    }

    function handleJoin(e) {
        e.preventDefault();
        var nameEl = document.getElementById('join-name');
        var emailEl = document.getElementById('join-email');
        var passwordEl = document.getElementById('join-password');
        var errEl = document.getElementById('join-error');
        if (!nameEl || !emailEl || !passwordEl || !errEl) return;

        var name = nameEl.value.trim();
        var email = emailEl.value.trim();
        var password = passwordEl.value;
        errEl.style.display = 'none';
        errEl.setAttribute('aria-live', 'assertive');
        document.querySelectorAll('.auth-modal-input').forEach(function (i) { i.classList.remove('error'); });

        if (!name) {
            errEl.textContent = 'Please enter your name.';
            errEl.style.display = 'block';
            nameEl.classList.add('error');
            return;
        }
        if (!email || email.indexOf('@') === -1) {
            errEl.textContent = 'Please enter a valid email address.';
            errEl.style.display = 'block';
            emailEl.classList.add('error');
            return;
        }
        if (!password || password.length < 8) {
            errEl.textContent = 'Password must be at least 8 characters.';
            errEl.style.display = 'block';
            passwordEl.classList.add('error');
            return;
        }

        safeSetItem(sessionStorage, 'signup_name', name);
        safeSetItem(sessionStorage, 'signup_email', email);
        safeSetItem(sessionStorage, 'signup_plan', selectedPlan);

        var btn = document.getElementById('join-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Please wait\u2026';
        }

        setTimeout(function () {
            window.location.href = 'payment.html?plan=' + selectedPlan;
        }, 400);
    }

    function updateHeaderMemberState() {
        var email = safeGetItem(localStorage, 'decode_email') || '';
        ['header-signin-btn', 'header-signin-btn-mobile'].forEach(function (id) {
            var btn = document.getElementById(id);
            if (btn) {
                btn.textContent = 'My Account';
                btn.title = email;
            }
        });
    }

    /* ── URL hash param parser (IE11-safe, replaces URLSearchParams) ── */
    function getHashParam(hash, key) {
        var pairs = hash.replace(/^[#?]/, '').split('&');
        for (var i = 0; i < pairs.length; i++) {
            var kv = pairs[i].split('=');
            if (decodeURIComponent(kv[0]) === key) return decodeURIComponent(kv[1] || '');
        }
        return null;
    }

    /* ── Load More Button ── */
    function initLoadMore() {
        var INITIAL = 3;
        var BATCH = 3;
        var MAX_CLONES = 2;

        document.querySelectorAll('.btn-load-more').forEach(function (btn) {
            /* Find button wrapper and card grid */
            var wrapper = btn.parentElement;
            if (!wrapper) return;

            var grid = null;
            var el = wrapper.previousElementSibling;
            while (el) {
                if (el.classList.contains('row') ||
                    el.classList.contains('category-articles-grid') ||
                    el.classList.contains('tag-articles-grid') ||
                    el.classList.contains('stories-grid') ||
                    el.children.length > 0 && el.querySelector('.scard-card, .recent-issue-card')) {
                    grid = el;
                    break;
                }
                el = el.previousElementSibling;
            }
            if (!grid) return;

            var items = toArray(grid.children);
            var totalOriginal = items.length;
            var shown = Math.min(INITIAL, totalOriginal);
            var cloneRound = 0;

            /* Hide items beyond initial count */
            items.forEach(function (item, i) {
                if (i >= INITIAL) {
                    item.style.display = 'none';
                    item.classList.add('load-more-hidden');
                }
            });

            /* Hide button if fewer items than initial */
            if (totalOriginal <= INITIAL) {
                btn.style.display = 'none';
                return;
            }

            btn.addEventListener('click', function () {
                /* First reveal hidden originals */
                var hidden = grid.querySelectorAll('.load-more-hidden');
                if (hidden.length > 0) {
                    var toShow = toArray(hidden).slice(0, BATCH);
                    toShow.forEach(function (item, i) {
                        item.classList.remove('load-more-hidden');
                        item.style.display = '';
                        item.style.opacity = '0';
                        item.style.transform = 'translateY(20px)';
                        setTimeout(function () {
                            item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                            item.style.opacity = '1';
                            item.style.transform = 'translateY(0)';
                        }, i * 80);
                    });
                    shown += toShow.length;

                    /* Check if more hidden remain */
                    if (grid.querySelectorAll('.load-more-hidden').length === 0 && cloneRound >= MAX_CLONES) {
                        finishButton(btn);
                    }
                    return;
                }

                /* All originals shown — clone a batch */
                if (cloneRound >= MAX_CLONES) {
                    finishButton(btn);
                    return;
                }

                cloneRound++;
                var sourceItems = toArray(grid.children).slice(0, BATCH);
                sourceItems.forEach(function (item, i) {
                    var clone = item.cloneNode(true);
                    clone.classList.remove('load-more-hidden');
                    clone.style.opacity = '0';
                    clone.style.transform = 'translateY(20px)';
                    grid.appendChild(clone);
                    setTimeout(function () {
                        clone.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                        clone.style.opacity = '1';
                        clone.style.transform = 'translateY(0)';
                    }, i * 80);
                });

                if (cloneRound >= MAX_CLONES) {
                    finishButton(btn);
                }
            });
        });

        function finishButton(btn) {
            var svgIcon = btn.querySelector('svg');
            if (svgIcon && svgIcon.parentNode) svgIcon.parentNode.removeChild(svgIcon);
            btn.textContent = 'All stories loaded';
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'default';
            btn.setAttribute('aria-disabled', 'true');
        }
    }

    /* ── Attach All Event Listeners ── */
    document.addEventListener('DOMContentLoaded', function () {

        /* Load More buttons */
        initLoadMore();

        /* Search toggle */
        var searchBtn = document.getElementById('search-btn');
        if (searchBtn) searchBtn.addEventListener('click', toggleSearch);

        var searchCloseBtn = document.getElementById('search-close-btn');
        if (searchCloseBtn) searchCloseBtn.addEventListener('click', toggleSearch);

        /* Escape key closes overlays */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                var searchOverlay = document.getElementById('search-overlay');
                if (searchOverlay && searchOverlay.classList.contains('open')) {
                    toggleSearch();
                    return;
                }
                var authModalEl = document.getElementById('auth-modal');
                if (authModalEl && authModalEl.classList.contains('open')) {
                    closeAuthModal();
                }
            }
        });

        /* Auth modal — Sign In buttons in header (desktop + mobile) */
        function handleSigninClick() {
            if (safeGetItem(localStorage, 'decode_member') === '1') {
                if (confirm('Sign out of Decode?')) {
                    safeRemoveItem(localStorage, 'decode_member');
                    safeRemoveItem(localStorage, 'decode_email');
                    safeRemoveItem(localStorage, 'decode_tier');
                    window.location.reload();
                }
            } else {
                openAuthModal('signin');
            }
        }
        var headerSigninBtn = document.getElementById('header-signin-btn');
        if (headerSigninBtn) headerSigninBtn.addEventListener('click', handleSigninClick);
        var headerSigninBtnMobile = document.getElementById('header-signin-btn-mobile');
        if (headerSigninBtnMobile) headerSigninBtnMobile.addEventListener('click', handleSigninClick);

        /* Auth modal close button */
        var authCloseBtn = document.getElementById('auth-modal-close-btn');
        if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);

        /* Auth modal backdrop click */
        var authModal = document.getElementById('auth-modal');
        if (authModal) {
            authModal.addEventListener('click', function (e) {
                if (e.target === authModal) closeAuthModal();
            });
        }

        /* Auth tab buttons */
        document.querySelectorAll('[data-auth-tab]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                switchAuthTab(this.getAttribute('data-auth-tab'));
            });
        });

        /* Password toggle buttons */
        document.querySelectorAll('[data-toggle-pw]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                togglePasswordVisibility(this.getAttribute('data-toggle-pw'), this);
            });
        });

        /* Plan pill buttons */
        document.querySelectorAll('[data-plan]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                selectedPlan = this.getAttribute('data-plan');
                updatePlanPills();
            });
        });

        /* Google auth buttons */
        var googleSignin = document.getElementById('google-btn-signin');
        if (googleSignin) googleSignin.addEventListener('click', function () { handleGoogleAuth('signin'); });

        var googleJoin = document.getElementById('google-btn-join');
        if (googleJoin) googleJoin.addEventListener('click', function () { handleGoogleAuth('join'); });

        /* Sign in form */
        var signinForm = document.getElementById('signin-form');
        if (signinForm) signinForm.addEventListener('submit', handleSignIn);

        /* Join form */
        var joinForm = document.getElementById('join-form');
        if (joinForm) joinForm.addEventListener('submit', handleJoin);

        /* Newsletter form prevent default */
        var newsletterForm = document.getElementById('newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', function (e) {
                e.preventDefault();
            });
        }

        /* Nav dropdown toggle (expand & collapse) */
        document.querySelectorAll('.site-header .dropdown-toggle').forEach(function (toggle) {
            toggle.addEventListener('click', function (e) {
                e.preventDefault();
                var parent = this.closest('.dropdown');
                if (!parent) return;
                var menu = parent.querySelector('.dropdown-menu');
                if (!menu) return;
                var isOpen = menu.classList.contains('show');
                /* Close any other open dropdowns first */
                document.querySelectorAll('.site-header .dropdown-menu.show').forEach(function (m) {
                    m.classList.remove('show');
                    var dd = m.closest('.dropdown');
                    if (dd) {
                        dd.classList.remove('show');
                        var t = dd.querySelector('.dropdown-toggle');
                        if (t) t.setAttribute('aria-expanded', 'false');
                    }
                });
                if (!isOpen) {
                    menu.classList.add('show');
                    parent.classList.add('show');
                    this.setAttribute('aria-expanded', 'true');
                }
            });
        });

        /* Close dropdowns when clicking outside */
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.site-header .dropdown')) {
                document.querySelectorAll('.site-header .dropdown-menu.show').forEach(function (m) {
                    m.classList.remove('show');
                    var dd = m.closest('.dropdown');
                    if (dd) {
                        dd.classList.remove('show');
                        var t = dd.querySelector('.dropdown-toggle');
                        if (t) t.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        });

        /* Auto-open modal from URL hash (IE11-safe parser) */
        function handleAuthHash() {
            var rawHash = window.location.hash.substring(1);
            if (rawHash) {
                var authAction = getHashParam(rawHash, 'auth');
                var planParam = getHashParam(rawHash, 'plan');
                if (authAction === 'signin') {
                    if (history.replaceState) history.replaceState(null, '', window.location.pathname);
                    openAuthModal('signin');
                } else if (authAction === 'join') {
                    if (history.replaceState) history.replaceState(null, '', window.location.pathname);
                    openAuthModal('join', planParam || null);
                }
            }
        }
        handleAuthHash();
        window.addEventListener('hashchange', handleAuthHash);

        /* Plan CTA button click handler */
        document.querySelectorAll('.plan-cta-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                var href = btn.getAttribute('href') || '';
                if (href.indexOf('#auth=') === 0) {
                    e.preventDefault();
                    var hash = href.substring(1);
                    var authAction = getHashParam(hash, 'auth');
                    var planParam = getHashParam(hash, 'plan');
                    if (authAction === 'join') {
                        openAuthModal('join', planParam || null);
                    } else if (authAction === 'signin') {
                        openAuthModal('signin');
                    }
                }
            });
        });

        /* If already a member, update header */
        if (safeGetItem(localStorage, 'decode_member') === '1') {
            updateHeaderMemberState();
        }
    });

})();
