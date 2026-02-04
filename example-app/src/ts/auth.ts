import { supabase } from './supabase';
import { navigate } from './router';

export function renderSignIn(): void {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <div class="screen sign-in-screen">
      <div class="sign-in-content">
        <div class="sign-in-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <h1>Group Chat Demo</h1>
        <p class="subtitle">Enter your name to get started</p>
        <form id="sign-in-form">
          <input
            type="text"
            id="name-input"
            placeholder="Enter your name"
            autocomplete="name"
            required
          />
          <button type="submit" id="sign-in-btn">
            <span class="btn-text">Sign In</span>
          </button>
        </form>
        <div id="sign-in-error" class="error-message" style="display: none;"></div>
      </div>
    </div>
  `;

  const form = document.getElementById('sign-in-form') as HTMLFormElement;
  const nameInput = document.getElementById('name-input') as HTMLInputElement;
  const btn = document.getElementById('sign-in-btn') as HTMLButtonElement;
  const errorDiv = document.getElementById('sign-in-error')!;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    errorDiv.style.display = 'none';

    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error('Failed to get user ID');

      await supabase.from('users').upsert({ id: userId, name });

      navigate('/rooms');
    } catch (err: any) {
      errorDiv.textContent = err.message || 'Failed to sign in';
      errorDiv.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-text">Sign In</span>';
    }
  });
}
