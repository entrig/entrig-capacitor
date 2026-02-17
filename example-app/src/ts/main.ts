import { Entrig } from '@entrig/capacitor';
import { supabase } from './supabase';
import { route, startRouter, navigate } from './router';
import { renderSignIn } from './auth';
import { renderRooms } from './rooms';
import { renderChat } from './chat';

// Track Entrig initialization state
let entrigInitialized = false;

async function initEntrig(): Promise<void> {
  try {
    const apiKey = import.meta.env.VITE_ENTRIG_API_KEY as string;
    if (!apiKey) {
      console.warn('Entrig API key not found');
      return;
    }

    await Entrig.init({ apiKey, showForegroundNotification:false });
    entrigInitialized = true;
    console.log('Entrig initialized successfully');

    // Listen for foreground notifications
    await Entrig.addListener('onForegroundNotification', (event) => {
      console.log('Foreground notification:', event);
    });

    // Listen for notification taps
    await Entrig.addListener('onNotificationOpened', (event) => {
      console.log('Notification opened:', event);
    });
  } catch (error) {
    console.error('Failed to initialize Entrig:', error);
  }
}

async function initAuth(): Promise<void> {
  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    // Already signed in — register with Entrig
    if (entrigInitialized) {
      try {
        await Entrig.register({ userId: session.user.id });
        console.log('User registered with Entrig:', session.user.id);
      } catch (error) {
        console.error('Failed to register with Entrig:', error);
      }
    }
  }

  // Listen for auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (!entrigInitialized) return;

    if (event === 'SIGNED_IN' && session?.user) {
      try {
        await Entrig.register({ userId: session.user.id });
        console.log('User registered with Entrig:', session.user.id);
      } catch (error) {
        console.error('Failed to register with Entrig:', error);
      }
    } else if (event === 'SIGNED_OUT') {
      try {
        await Entrig.unregister();
        console.log('User unregistered from Entrig');
      } catch (error) {
        console.error('Failed to unregister from Entrig:', error);
      }
    }
  });
}

function setupRoutes(): void {
  route('/sign-in', () => {
    renderSignIn();
  });

  route('/rooms', async () => {
    // Guard: must be authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/sign-in');
      return;
    }
    await renderRooms();
  });

  route('/chat/:id', async (params) => {
    // Guard: must be authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/sign-in');
      return;
    }
    await renderChat(params);
  });
}

// Bootstrap the app
async function main(): Promise<void> {
  await initEntrig();
  await initAuth();
  setupRoutes();

  // Check if user is already signed in and redirect
  const { data: { session } } = await supabase.auth.getSession();
  if (session && (window.location.hash === '' || window.location.hash === '#/sign-in')) {
    navigate('/rooms');
  }

  startRouter();
}

main();
