(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  const el = {
    adminName: $('adminSessionName'),
    logout: $('adminLogoutButton'),
    avatar: $('profileAvatar'),
    profileName: $('profileName'),
    profileEmail: $('profileEmail'),
    verificationBadge: $('verificationBadge'),
    accountStatus: $('accountStatus'),
    memberSince: $('memberSince'),
    form: $('profileForm'),
    firstName: $('firstName'),
    middleName: $('middleName'),
    lastName: $('lastName'),
    suffix: $('suffix'),
    phoneNumber: $('phoneNumber'),
    email: $('email'),
    editButton: $('editProfileButton'),
    formActions: $('profileFormActions'),
    cancelProfile: $('cancelProfileButton'),
    saveProfile: $('saveProfileButton'),
    profileMessage: $('profileMessage'),
    securityEmailText: $('securityEmailText'),
    securityVerifiedBadge: $('securityVerifiedBadge'),
    openPassword: $('openChangePasswordButton'),
    passwordModal: $('changePasswordModal'),
    closePassword: $('closePasswordModalButton'),
    cancelPassword: $('cancelPasswordButton'),
    passwordForm: $('changePasswordForm'),
    currentPassword: $('currentPassword'),
    newPassword: $('newPassword'),
    confirmPassword: $('confirmPassword'),
    passwordMatchText: $('passwordMatchText'),
    passwordMessage: $('passwordMessage'),
    savePassword: $('savePasswordButton')
  };

  let currentUser = null;

  async function loadProfile() {
    const response = await fetch('/api/auth/me', { credentials: 'include' });

    if (!response.ok) {
      window.location.href = '/login.html';
      return;
    }

    const result = await response.json();

    if (!result.user || String(result.user.role || '').toLowerCase() !== 'admin') {
      window.location.href = '/login.html';
      return;
    }

    currentUser = result.user;
    renderProfile(currentUser);
  }

  function renderProfile(user) {
    const fullName = [
      user.first_name,
      user.middle_name,
      user.last_name,
      user.suffix
    ].filter(Boolean).join(' ').trim() || user.email || 'Administrator';

    const initials = fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(x => x[0])
      .join('')
      .toUpperCase() || 'A';

    el.adminName.textContent = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Administrator';
    el.avatar.textContent = initials;
    el.profileName.textContent = fullName;
    el.profileEmail.textContent = user.email || '—';

    el.firstName.value = user.first_name || '';
    el.middleName.value = user.middle_name || '';
    el.lastName.value = user.last_name || '';
    el.suffix.value = user.suffix || '';
    el.phoneNumber.value = user.phone_number || '';
    el.email.value = user.email || '';

    const verified = user.email_verified !== false;

    el.verificationBadge.textContent = verified ? 'Verified Email' : 'Unverified Email';
    el.verificationBadge.classList.toggle('unverified', !verified);

    el.securityVerifiedBadge.textContent = verified ? 'Verified' : 'Unverified';
    el.securityVerifiedBadge.classList.toggle('unverified', !verified);

    el.securityEmailText.textContent = verified
      ? 'Your administrator email is verified.'
      : 'Your administrator email has not been verified.';

    el.accountStatus.textContent = user.is_active === false ? 'Inactive' : 'Active';
    el.memberSince.textContent = formatDate(user.created_at);
  }

  function setEditMode(enabled) {
    [el.firstName, el.middleName, el.lastName, el.suffix, el.phoneNumber]
      .forEach(field => field.disabled = !enabled);

    el.email.disabled = true;
    el.formActions.classList.toggle('hidden', !enabled);
    el.editButton.classList.toggle('hidden', enabled);

    if (enabled) el.firstName.focus();
  }

  async function saveProfile(event) {
    event.preventDefault();

    const payload = {
      first_name: el.firstName.value.trim(),
      middle_name: el.middleName.value.trim(),
      last_name: el.lastName.value.trim(),
      suffix: el.suffix.value,
      phone_number: el.phoneNumber.value.trim()
    };

    if (!payload.first_name || !payload.last_name) {
      showMessage(el.profileMessage, 'First name and last name are required.', 'error');
      return;
    }

    el.saveProfile.disabled = true;
    el.saveProfile.textContent = 'Saving...';

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Unable to update profile.');
      }

      showMessage(el.profileMessage, 'Administrator profile updated successfully.', 'success');
      setEditMode(false);
      await loadProfile();

    } catch (error) {
      showMessage(el.profileMessage, error.message, 'error');

    } finally {
      el.saveProfile.disabled = false;
      el.saveProfile.textContent = 'Save Changes';
    }
  }

  function cancelProfileEdit() {
    if (currentUser) renderProfile(currentUser);
    setEditMode(false);
    el.profileMessage.innerHTML = '';
  }

  function openPasswordModal() {
    el.passwordForm.reset();
    el.passwordMessage.innerHTML = '';
    updatePasswordMatch();
    el.passwordModal.classList.remove('hidden');
    el.passwordModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => el.currentPassword.focus(), 50);
  }

  function closePasswordModal() {
    el.passwordModal.classList.add('hidden');
    el.passwordModal.setAttribute('aria-hidden', 'true');
    el.passwordForm.reset();
    el.passwordMessage.innerHTML = '';
    updatePasswordMatch();
  }

  async function changePassword(event) {
    event.preventDefault();

    const current_password = el.currentPassword.value;
    const new_password = el.newPassword.value;
    const confirm_password = el.confirmPassword.value;

    if (new_password.length < 8) {
      showMessage(el.passwordMessage, 'New password must be at least 8 characters long.', 'error');
      return;
    }

    if (new_password !== confirm_password) {
      showMessage(el.passwordMessage, 'New password and confirm password do not match.', 'error');
      return;
    }

    el.savePassword.disabled = true;
    el.savePassword.textContent = 'Updating...';

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current_password,
          new_password,
          confirm_password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Unable to change password.');
      }

      showMessage(el.passwordMessage, 'Password changed successfully.', 'success');
      setTimeout(closePasswordModal, 800);

    } catch (error) {
      showMessage(el.passwordMessage, error.message, 'error');

    } finally {
      el.savePassword.disabled = false;
      el.savePassword.textContent = 'Update Password';
    }
  }

  function updatePasswordMatch() {
    if (!el.confirmPassword.value) {
      el.passwordMatchText.textContent = 'Re-enter your new password';
      el.passwordMatchText.classList.remove('password-match-success', 'password-match-error');
      return;
    }

    const same = el.newPassword.value === el.confirmPassword.value;

    el.passwordMatchText.textContent = same
      ? 'Passwords match'
      : 'Passwords do not match';

    el.passwordMatchText.classList.toggle('password-match-success', same);
    el.passwordMatchText.classList.toggle('password-match-error', !same);
  }

  function togglePassword(button) {
    const input = $(button.dataset.passwordTarget);
    if (!input) return;

    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';

    button.textContent = show ? '⊘' : '◉';
    button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  }

  function showMessage(container, message, type) {
    container.innerHTML = `<div class="message ${type}">${escapeHtml(message)}</div>`;
  }

  function formatDate(value) {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  el.editButton.addEventListener('click', () => setEditMode(true));
  el.cancelProfile.addEventListener('click', cancelProfileEdit);
  el.form.addEventListener('submit', saveProfile);

  el.openPassword.addEventListener('click', openPasswordModal);
  el.closePassword.addEventListener('click', closePasswordModal);
  el.cancelPassword.addEventListener('click', closePasswordModal);
  el.passwordForm.addEventListener('submit', changePassword);

  el.newPassword.addEventListener('input', updatePasswordMatch);
  el.confirmPassword.addEventListener('input', updatePasswordMatch);

  document.addEventListener('click', event => {
    const toggle = event.target.closest('[data-password-target]');

    if (toggle) {
      togglePassword(toggle);
      return;
    }

    if (event.target.closest('[data-close-password-modal]')) {
      closePasswordModal();
    }
  });

  el.logout.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } finally {
      window.location.href = '/login.html';
    }
  });

  loadProfile().catch(error => {
    console.error('Admin profile:', error);
  });
})();
