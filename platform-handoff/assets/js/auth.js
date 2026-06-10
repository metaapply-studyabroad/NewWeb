(function () {
    'use strict';

    /* ── helpers ──────────────────────────────────────────────────────────── */
    function safeGet(storage, key) {
        try { return storage.getItem(key); } catch (e) { return null; }
    }
    function safeSet(storage, key, val) {
        try { storage.setItem(key, val); } catch (e) { /* quota or security */ }
    }
    function safeRemove(storage, key) {
        try { storage.removeItem(key); } catch (e) { /* ignore */ }
    }

    function showError(id, msg) {
        var el = document.getElementById(id);
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
    }

    function hideError(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    function isValidEmail(email) {
        return email && email.indexOf('@') > 0 && email.indexOf('.') > email.indexOf('@');
    }

    /* ── Password toggle ─────────────────────────────────────────────────── */
    function initPasswordToggles() {
        var toggles = document.querySelectorAll('.auth-page-toggle-pw');
        for (var i = 0; i < toggles.length; i++) {
            (function (btn) {
                var targetId = btn.getAttribute('data-toggle-pw');
                if (!targetId) return;
                btn.addEventListener('click', function () {
                    var input = document.getElementById(targetId);
                    if (!input) return;
                    var isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
                });
            })(toggles[i]);
        }
    }

    /* ── Login page ──────────────────────────────────────────────────────── */
    function initLoginPage() {
        var form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            hideError('login-error');

            var email = document.getElementById('login-email');
            var password = document.getElementById('login-password');
            if (!email || !password) return;

            email.classList.remove('error');
            password.classList.remove('error');

            var emailVal = email.value.trim();
            var passVal = password.value;

            if (!isValidEmail(emailVal)) {
                showError('login-error', 'Please enter a valid email address.');
                email.classList.add('error');
                email.focus();
                return;
            }

            if (passVal.length < 6) {
                showError('login-error', 'Password must be at least 6 characters.');
                password.classList.add('error');
                password.focus();
                return;
            }

            var btn = document.getElementById('login-btn');
            if (btn) { btn.disabled = true; btn.textContent = 'Signing in\u2026'; }

            /* Simulate sign-in (demo) */
            setTimeout(function () {
                safeSet(localStorage, 'decode_member', '1');
                safeSet(localStorage, 'decode_user_email', emailVal);
                safeSet(localStorage, 'decode_user_name', emailVal.split('@')[0]);
                window.location.href = 'my-account.html';
            }, 1200);
        });

        /* Clear errors on input */
        var inputs = form.querySelectorAll('.auth-page-input');
        for (var i = 0; i < inputs.length; i++) {
            inputs[i].addEventListener('input', function () {
                this.classList.remove('error');
                hideError('login-error');
            });
        }
    }

    /* ── Forgot Password page ────────────────────────────────────────────── */
    function initForgotPage() {
        var form = document.getElementById('forgot-form');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            hideError('forgot-error');

            var email = document.getElementById('forgot-email');
            if (!email) return;
            email.classList.remove('error');

            var emailVal = email.value.trim();

            if (!isValidEmail(emailVal)) {
                showError('forgot-error', 'Please enter a valid email address.');
                email.classList.add('error');
                email.focus();
                return;
            }

            var btn = document.getElementById('forgot-btn');
            if (btn) { btn.disabled = true; btn.textContent = 'Sending\u2026'; }

            /* Simulate API call */
            setTimeout(function () {
                var formState = document.getElementById('forgot-form-state');
                var successState = document.getElementById('forgot-success-state');
                var successEmail = document.getElementById('forgot-success-email');
                var securityNote = document.getElementById('forgot-security-note');

                if (formState) formState.classList.add('hidden');
                if (successState) successState.classList.add('active');
                if (successEmail) successEmail.textContent = emailVal;
                if (securityNote) securityNote.style.display = 'none';
            }, 1400);
        });

        /* Reset form button */
        var resetBtn = document.getElementById('forgot-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                var formState = document.getElementById('forgot-form-state');
                var successState = document.getElementById('forgot-success-state');
                var securityNote = document.getElementById('forgot-security-note');
                var email = document.getElementById('forgot-email');
                var btn = document.getElementById('forgot-btn');

                if (formState) formState.classList.remove('hidden');
                if (successState) successState.classList.remove('active');
                if (securityNote) securityNote.style.display = 'flex';
                if (email) email.value = '';
                if (btn) { btn.disabled = false; btn.textContent = 'Send Reset Link'; }
            });
        }

        /* Clear errors on input */
        var emailInput = document.getElementById('forgot-email');
        if (emailInput) {
            emailInput.addEventListener('input', function () {
                this.classList.remove('error');
                hideError('forgot-error');
            });
        }
    }

    /* ── My Account page ─────────────────────────────────────────────────── */
    function initAccountPage() {
        var accountCard = document.getElementById('account-card');
        if (!accountCard) return;

        var isMember = safeGet(localStorage, 'decode_member') === '1';
        var userEmail = safeGet(localStorage, 'decode_user_email') || '';
        var userName = safeGet(localStorage, 'decode_user_name') || '';

        /* Populate fields from localStorage (falls back to HTML defaults if empty) */
        var nameEl = document.getElementById('account-name');
        var emailEl = document.getElementById('account-email');
        var statusEl = document.getElementById('account-status');

        if (nameEl && userName) nameEl.textContent = userName;
        if (emailEl && userEmail) emailEl.textContent = userEmail;
        if (statusEl) {
            if (isMember) {
                statusEl.innerHTML = '<span class="account-badge account-badge-active">Active Member</span>';
            } else {
                statusEl.innerHTML = '<span class="account-badge account-badge-free">Free Reader</span>';
            }
        }

        /* Sign out */
        var signoutBtn = document.getElementById('account-signout-btn');
        if (signoutBtn) {
            signoutBtn.addEventListener('click', function () {
                safeRemove(localStorage, 'decode_member');
                safeRemove(localStorage, 'decode_user_email');
                safeRemove(localStorage, 'decode_user_name');
                safeRemove(sessionStorage, 'decode_unlocked');
                window.location.href = 'index.html';
            });
        }
    }

    /* ── Init ─────────────────────────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {
        initPasswordToggles();
        initLoginPage();
        initForgotPage();
        initAccountPage();
    });
})();
