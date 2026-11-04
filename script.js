// Manejo de cuentas y almacenamiento local
let currentUser = JSON.parse(localStorage.getItem('lcm_user')) || null;

function updateAuthUI() {
  const btnText = document.getElementById('accountBtnText');
  if (currentUser) {
    btnText.textContent = currentUser.name.split(' ')[0];
    // Rellena automáticamente los datos en el checkout si existen
    if (document.getElementById('billName')) document.getElementById('billName').value = currentUser.name;
    if (document.getElementById('billEmail')) document.getElementById('billEmail').value = currentUser.email;
    if (document.getElementById('billAddress')) document.getElementById('billAddress').value = currentUser.address;
    if (document.getElementById('billCity')) document.getElementById('billCity').value = currentUser.city;
    if (document.getElementById('billCountry')) document.getElementById('billCountry').value = currentUser.country;
  } else {
    btnText.textContent = 'Mi Cuenta';
  }
}

const authModal = document.getElementById('authModal');
document.getElementById('openAuthBtn').addEventListener('click', () => {
  if (currentUser) {
    document.getElementById('profName').textContent = currentUser.name;
    document.getElementById('profEmail').textContent = currentUser.email;
    document.getElementById('profAddress').textContent = currentUser.address;
    document.getElementById('profCity').textContent = currentUser.city;
    document.getElementById('profCountry').textContent = currentUser.country;
    showView('profileView');
  } else {
    showView('loginView');
  }
  authModal.classList.add('open');
});

document.getElementById('closeAuthBtn').addEventListener('click', () => {
  authModal.classList.remove('open');
});

function showView(viewId) {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('registerView').style.display = 'none';
  document.getElementById('profileView').style.display = 'none';
  document.getElementById(viewId).style.display = 'block';
}

function handleRegister(e) {
  e.preventDefault();
  const user = {
    name: document.getElementById('regName').value,
    email: document.getElementById('regEmail').value,
    address: document.getElementById('regAddress').value,
    city: document.getElementById('regCity').value,
    country: document.getElementById('regCountry').value
  };
  currentUser = user;
  localStorage.setItem('lcm_user', JSON.stringify(user));
  updateAuthUI();
  authModal.classList.remove('open');
  alert('¡Cuenta creada con éxito! Tu dirección se aplicará automáticamente a tus pedidos.');
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  // Simulación de login con datos almacenados o creación rápida
  if (!currentUser) {
    currentUser = {
      name: email.split('@')[0],
      email: email,
      address: 'Dirección por definir',
      city: 'Santo Domingo',
      country: 'República Dominicana'
    };
    localStorage.setItem('lcm_user', JSON.stringify(currentUser));
  }
  updateAuthUI();
  authModal.classList.remove('open');
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem('lcm_user');
  updateAuthUI();
  authModal.classList.remove('open');
}

// Inicializar estado al cargar la página
updateAuthUI();
