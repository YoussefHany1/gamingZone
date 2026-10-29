/**
 * Push-notification strings, server-side.
 *
 * The backend cannot import `packages/locales/*.json` (the Vercel folder
 * deploys standalone), so the handful of strings it sends are mirrored here.
 * Keep the keys identical to `social.notifications.*` in the locale files so a
 * translator sees one vocabulary.
 *
 * Only the locale of the *recipient* matters. `users/{uid}.language` is written
 * by the mobile notification setup; an unknown or missing value falls back to
 * English rather than dropping the notification.
 */

export const PUSH_LOCALES = ['en', 'ar', 'es', 'fr', 'hi', 'pt-BR', 'pt-PT'];

const MESSAGES = {
  friendRequest: {
    en: {
      title: 'New friend request',
      body: '{name} (@{handle}) wants to be friends.',
    },
    ar: {
      title: 'طلب صداقة جديد',
      body: '{name} (@{handle}) يريد أن يكون صديقك.',
    },
    es: {
      title: 'Nueva solicitud de amistad',
      body: '{name} (@{handle}) quiere ser tu amigo.',
    },
    fr: {
      title: "Nouvelle demande d'ami",
      body: '{name} (@{handle}) veut être votre ami.',
    },
    hi: {
      title: 'नई मित्रता अनुरोध',
      body: '{name} (@{handle}) आपके मित्र बनना चाहते हैं।',
    },
    'pt-BR': {
      title: 'Nova solicitação de amizade',
      body: '{name} (@{handle}) quer ser seu amigo.',
    },
    'pt-PT': {
      title: 'Novo pedido de amizade',
      body: '{name} (@{handle}) quer ser teu amigo.',
    },
  },
  friendAccepted: {
    en: {
      title: 'Friend request accepted',
      body: 'You and {name} are now friends.',
    },
    ar: {
      title: 'تم قبول طلب الصداقة',
      body: 'أنت و{name} أصبحتما صديقين.',
    },
    es: {
      title: 'Solicitud aceptada',
      body: 'Tú y {name} ahora son amigos.',
    },
    fr: {
      title: 'Demande acceptée',
      body: 'Vous et {name} êtes maintenant amis.',
    },
    hi: {
      title: 'मित्रता अनुरोध स्वीकृत',
      body: 'आप और {name} अब मित्र हैं।',
    },
    'pt-BR': {
      title: 'Solicitação aceita',
      body: 'Você e {name} agora são amigos.',
    },
    'pt-PT': {
      title: 'Pedido aceite',
      body: 'Tu e {name} são agora amigos.',
    },
  },
  sessionReminder: {
    en: {
      t60: { title: 'Session starting in 1 hour', body: '{gameName} starts at {time}.' },
      t15: { title: 'Session starting in 15 minutes', body: '{gameName} starts soon at {time}.' },
      starting: { title: 'Session starting now', body: '{gameName} is starting now.' },
    },
    ar: {
      t60: { title: 'تبدأ الجلسة خلال ساعة', body: 'تبدأ جلسة {gameName} في {time}.' },
      t15: { title: 'تبدأ الجلسة خلال 15 دقيقة', body: 'تبدأ جلسة {gameName} قريبًا في {time}.' },
      starting: { title: 'تبدأ الجلسة الآن', body: 'تبدأ جلسة {gameName} الآن.' },
    },
    es: {
      t60: { title: 'La sesión empieza en 1 hora', body: '{gameName} empieza a las {time}.' },
      t15: { title: 'La sesión empieza en 15 minutos', body: '{gameName} empieza pronto a las {time}.' },
      starting: { title: 'La sesión empieza ahora', body: '{gameName} empieza ahora.' },
    },
    fr: {
      t60: { title: 'La session commence dans 1 heure', body: '{gameName} commence à {time}.' },
      t15: { title: 'La session commence dans 15 minutes', body: '{gameName} commence bientôt à {time}.' },
      starting: { title: 'La session commence maintenant', body: '{gameName} commence maintenant.' },
    },
    hi: {
      t60: { title: 'सेशन 1 घंटे में शुरू होगा', body: '{gameName} {time} पर शुरू होगा।' },
      t15: { title: 'सेशन 15 मिनट में शुरू होगा', body: '{gameName} जल्द {time} पर शुरू होगा।' },
      starting: { title: 'सेशन अभी शुरू हो रहा है', body: '{gameName} अभी शुरू हो रहा है।' },
    },
    'pt-BR': {
      t60: { title: 'A sessão começa em 1 hora', body: '{gameName} começa às {time}.' },
      t15: { title: 'A sessão começa em 15 minutos', body: '{gameName} começa em breve às {time}.' },
      starting: { title: 'A sessão está começando', body: '{gameName} está começando agora.' },
    },
    'pt-PT': {
      t60: { title: 'A sessão começa dentro de 1 hora', body: '{gameName} começa às {time}.' },
      t15: { title: 'A sessão começa dentro de 15 minutos', body: '{gameName} começa brevemente às {time}.' },
      starting: { title: 'A sessão começa agora', body: '{gameName} começa agora.' },
    },
  },
};

/**
 * Narrows an arbitrary stored language tag to a supported locale.
 *
 * Region variants are matched before the base language so `pt-BR` never
 * collapses to plain `pt` (which is not a locale we ship).
 */
export function normalizePushLocale(raw) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return 'en';
  if (PUSH_LOCALES.includes(value)) return value;
  if (value.toLowerCase().startsWith('pt-br')) return 'pt-BR';
  if (value.toLowerCase().startsWith('pt-pt')) return 'pt-PT';
  const base = value.split('-')[0].toLowerCase();
  return PUSH_LOCALES.includes(base) ? base : 'en';
}

function interpolate(template, params) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    typeof params[key] === 'string' ? params[key] : match,
  );
}

/** @returns {{ title: string, body: string }} */
export function friendRequestMessage(locale, { name, handle }) {
  const messages = MESSAGES.friendRequest[normalizePushLocale(locale)];
  return {
    title: messages.title,
    body: interpolate(messages.body, {
      name: name || 'Player',
      handle: handle || 'player',
    }),
  };
}

/** @returns {{ title: string, body: string }} */
export function sessionReminderMessage(locale, reminder, { gameName, time }) {
  const messages = MESSAGES.sessionReminder[normalizePushLocale(locale)] ?? MESSAGES.sessionReminder.en;
  const message = messages[reminder] ?? messages.starting;
  return {
    title: message.title,
    body: interpolate(message.body, { gameName: gameName || 'Game', time: time || '' }),
  };
}

/** @returns {{ title: string, body: string }} */
export function friendAcceptedMessage(locale, { name }) {
  const messages = MESSAGES.friendAccepted[normalizePushLocale(locale)];
  return {
    title: messages.title,
    body: interpolate(messages.body, { name: name || 'Player' }),
  };
}
