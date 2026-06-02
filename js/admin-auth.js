var SESSION_KEY = 'safeqr_session';
var CONTACTS_KEY = 'safeqr_contacts';
var PASSWORDS_KEY = 'safeqr_passwords';

// Get custom passwords from localStorage or defaults
function getPasswords() {
  try {
    const saved = localStorage.getItem(PASSWORDS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_PASSWORDS;
  } catch (e) {
    return DEFAULT_PASSWORDS;
  }
}

function findContact(agencyId) {
  return emergencyContacts.find(c => c.id === agencyId);
}

function showToast(msg, isError) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function () { toast.classList.remove('show'); }, 3000);
}

// ========== LOGIN ==========
async function handleLogin(e) {
  e.preventDefault();
  var agency = document.getElementById('agency').value;
  var password = document.getElementById('password').value;
  var btn = document.querySelector('.btn-login');

  if (!agency || !password) {
    showToast('Vui lòng chọn đơn vị và nhập mật khẩu', true);
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Đang đăng nhập...';

  // Try API login first
  if (API_BASE) {
    var apiResult = await apiLogin(agency, password);
    if (apiResult && apiResult.token) {
      var contact = findContact(agency);
      var session = {
        agencyId: agency,
        agencyName: contact ? contact.name : agency,
        loginTime: new Date().toISOString(),
        useApi: true
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setTimeout(function () { window.location.href = 'dashboard.html'; }, 200);
      return;
    }
    // If API failed, fall through to local auth
    btn.textContent = 'API không khả dụng, thử local...';
  }

  // Fallback: local auth
  var passwords = getPasswords();
  var expected = passwords[agency];

  if (password === expected) {
    var contact = findContact(agency);
    var session = {
      agencyId: agency,
      agencyName: contact ? contact.name : agency,
      loginTime: new Date().toISOString(),
      useApi: false
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setTimeout(function () { window.location.href = 'dashboard.html'; }, 200);
  } else {
    showToast('Mật khẩu không đúng. Vui lòng kiểm tra lại.', true);
    btn.disabled = false;
    btn.textContent = 'Đăng nhập';
  }
}

// Bind login form
document.addEventListener('DOMContentLoaded', async function () {
  await loadData();
  var form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', handleLogin);
  }
});
