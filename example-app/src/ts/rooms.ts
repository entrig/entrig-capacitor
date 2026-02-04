import { supabase } from './supabase';
import { navigate } from './router';
import type { Group } from './types';

export async function renderRooms(): Promise<void> {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <div class="screen rooms-screen">
      <header class="app-header">
        <h1>Rooms</h1>
        <button id="sign-out-btn" class="icon-btn" title="Sign Out">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </header>
      <div id="greeting" class="greeting"></div>
      <div id="rooms-content" class="rooms-content">
        <div class="loading"><span class="spinner"></span></div>
      </div>
      <button id="create-group-fab" class="fab" title="Create Group">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>

    <!-- Create Group Modal -->
    <div id="create-modal" class="modal-overlay" style="display: none;">
      <div class="modal-content">
        <h2>Create Group</h2>
        <form id="create-group-form">
          <input type="text" id="group-name-input" placeholder="Group Name" required />
          <div class="modal-buttons">
            <button type="button" id="modal-cancel" class="btn-secondary">Cancel</button>
            <button type="submit" id="modal-create" class="btn-primary">Create</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Load user name
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();
    document.getElementById('greeting')!.textContent = `Hi, ${userData?.name || 'Guest'}!`;
  }

  // Sign out
  document.getElementById('sign-out-btn')!.addEventListener('click', async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut();
      navigate('/sign-in');
    }
  });

  // Create group modal
  const modal = document.getElementById('create-modal')!;
  const groupNameInput = document.getElementById('group-name-input') as HTMLInputElement;

  document.getElementById('create-group-fab')!.addEventListener('click', () => {
    modal.style.display = 'flex';
    groupNameInput.value = '';
    groupNameInput.focus();
  });

  document.getElementById('modal-cancel')!.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  document.getElementById('create-group-form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = groupNameInput.value.trim();
    if (!name || !user) return;

    const createBtn = document.getElementById('modal-create') as HTMLButtonElement;
    createBtn.disabled = true;
    createBtn.innerHTML = '<span class="spinner"></span>';

    try {
      const { data: groupData, error } = await supabase
        .from('groups')
        .insert({ name, created_by: user.id })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('group_members').insert({
        group_id: groupData.id,
        user_id: user.id,
      });

      modal.style.display = 'none';
      await loadGroups(user.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    } finally {
      createBtn.disabled = false;
      createBtn.textContent = 'Create';
    }
  });

  // Load groups
  if (user) {
    await loadGroups(user.id);
  }
}

async function loadGroups(userId: string): Promise<void> {
  const container = document.getElementById('rooms-content')!;

  try {
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (groupsError) throw groupsError;

    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (memberError) throw memberError;

    const joinedIds = new Set(memberData.map((m: { group_id: string }) => m.group_id));

    if (!groups || groups.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <p>No groups yet</p>
          <p class="subtitle">Tap + to create the first group</p>
        </div>
      `;
      return;
    }

    container.innerHTML = groups
      .map((group: Group) => {
        const isJoined = joinedIds.has(group.id);
        return `
          <div class="group-card" data-id="${group.id}" data-name="${group.name}" data-joined="${isJoined}">
            <div class="group-icon ${isJoined ? 'joined' : ''}">${group.name[0].toUpperCase()}</div>
            <div class="group-info">
              <span class="group-name">${group.name}</span>
              ${isJoined ? '<span class="joined-badge">Joined</span>' : ''}
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        `;
      })
      .join('');

    // Attach click handlers
    container.querySelectorAll('.group-card').forEach((card) => {
      card.addEventListener('click', async () => {
        const groupId = card.getAttribute('data-id')!;
        const groupName = card.getAttribute('data-name')!;
        const isJoined = card.getAttribute('data-joined') === 'true';

        if (!isJoined) {
          if (confirm(`Do you want to join "${groupName}"?`)) {
            try {
              await supabase.from('group_members').insert({
                group_id: groupId,
                user_id: userId,
              });
            } catch (err: any) {
              alert(err.message || 'Failed to join group');
              return;
            }
          } else {
            return;
          }
        }

        navigate(`/chat/${groupId}?name=${encodeURIComponent(groupName)}`);
      });
    });
  } catch (err: any) {
    container.innerHTML = `<div class="error-message">${err.message || 'Failed to load groups'}</div>`;
  }
}
