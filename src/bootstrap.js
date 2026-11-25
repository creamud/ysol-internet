import('./main.js').catch(error => {
  console.error(error);
  const message = document.querySelector('#name-error');
  message.textContent = 'Oyun başlatılamadı. WebGL destekli bir masaüstü tarayıcı kullan.';
  message.hidden = false;
});
