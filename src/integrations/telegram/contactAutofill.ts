type TelegramUser = {
  id?: number;
  username?: string;
};

type TelegramWebApp = {
  initDataUnsafe?: {
    user?: TelegramUser;
  };
};

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
};

function resolveTelegramContact(): string {
  const telegramWindow = window as TelegramWindow;
  const rawUsername = telegramWindow.Telegram?.WebApp?.initDataUnsafe?.user?.username?.trim();
  if (!rawUsername) return '';
  return `@${rawUsername.replace(/^@+/, '')}`;
}

function fillTelegramContact(input: HTMLInputElement): boolean {
  if (input.value.trim()) return false;
  const contact = resolveTelegramContact();
  if (!contact) return false;

  input.value = contact;
  input.dataset.telegramAutofilled = 'true';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function syncTelegramContact(root: ParentNode = document): void {
  root.querySelectorAll<HTMLInputElement>('input[name="contact"]').forEach(fillTelegramContact);
}

export function installTelegramContactAutofill(): () => void {
  syncTelegramContact();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches('input[name="contact"]')) fillTelegramContact(node as HTMLInputElement);
        syncTelegramContact(node);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  const onFocus = (event: FocusEvent) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.matches('input[name="contact"]')) fillTelegramContact(target);
  };
  document.addEventListener('focusin', onFocus);

  return () => {
    observer.disconnect();
    document.removeEventListener('focusin', onFocus);
  };
}
