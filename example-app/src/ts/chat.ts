import { supabase } from './supabase';
import { navigate } from './router';
import type { Message } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';

let channel: RealtimeChannel | null = null;

export async function renderChat(params: Record<string, string>): Promise<void> {
  const groupId = params.id;
  const groupName = decodeURIComponent(params.name || 'Chat');

  // Clean up previous subscription
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }

  const app = document.getElementById('app')!;
  app.innerHTML = `
    <div class="screen chat-screen">
      <header class="app-header">
        <button id="back-btn" class="icon-btn" title="Back">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h1>${groupName}</h1>
        <div style="width: 44px;"></div>
      </header>
      <div id="messages-container" class="messages-container">
        <div class="loading"><span class="spinner"></span></div>
      </div>
      <form id="message-form" class="message-input-container">
        <input
          type="text"
          id="message-input"
          placeholder="Type a message..."
          autocomplete="off"
          maxlength="1000"
        />
        <button type="submit" id="send-btn" class="send-btn" disabled>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  `;

  // Back button
  document.getElementById('back-btn')!.addEventListener('click', () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
    navigate('/rooms');
  });

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;
  if (!currentUserId) {
    navigate('/sign-in');
    return;
  }

  // Ensure user is a member
  const { data: existing } = await supabase
    .from('group_members')
    .select()
    .eq('group_id', groupId)
    .eq('user_id', currentUserId)
    .maybeSingle();

  if (!existing) {
    await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: currentUserId,
    });
  }

  // Load messages
  const messagesContainer = document.getElementById('messages-container')!;
  const messageInput = document.getElementById('message-input') as HTMLInputElement;
  const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;

  // Enable/disable send button
  messageInput.addEventListener('input', () => {
    sendBtn.disabled = !messageInput.value.trim();
  });

  let messages: Message[] = [];

  const renderMessages = () => {
    if (messages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="empty-state">
          <p>No messages yet</p>
          <p class="subtitle">Be the first to send a message!</p>
        </div>
      `;
      return;
    }

    messagesContainer.innerHTML = messages
      .map((msg) => {
        const isMe = msg.user_id === currentUserId;
        const senderName = msg.users?.name || 'Unknown';
        return `
          <div class="message ${isMe ? 'message-me' : 'message-other'}">
            ${!isMe ? `<span class="sender-name">${senderName}</span>` : ''}
            <div class="message-bubble ${isMe ? 'bubble-me' : 'bubble-other'}">
              ${msg.content}
            </div>
          </div>
        `;
      })
      .join('');

    scrollToBottom();
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  };

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*, users!inner(name)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    messages = data || [];
    renderMessages();
  } catch (err: any) {
    messagesContainer.innerHTML = `<div class="error-message">${err.message || 'Failed to load messages'}</div>`;
  }

  // Subscribe to new messages
  channel = supabase
    .channel(`group:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `group_id=eq.${groupId}`,
      },
      async (payload) => {
        const newMessage = payload.new as Message;

        // Don't add duplicates
        if (messages.some((m) => m.id === newMessage.id)) return;

        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', newMessage.user_id)
          .single();

        const messageWithUser: Message = {
          ...newMessage,
          users: userData || undefined,
        };

        messages.push(messageWithUser);
        renderMessages();
      },
    )
    .subscribe();

  // Send message
  const form = document.getElementById('message-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = messageInput.value.trim();
    if (!content) return;

    sendBtn.disabled = true;
    messageInput.value = '';

    try {
      const { error } = await supabase.from('messages').insert({
        content,
        user_id: currentUserId,
        group_id: groupId,
      });

      if (error) throw error;
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
      messageInput.value = content;
    } finally {
      sendBtn.disabled = !messageInput.value.trim();
      messageInput.focus();
    }
  });
}
