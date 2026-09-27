import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://www.mailmate.space';
const DEFAULT_TITLE = 'MailMate | Domain, SSL & Subscription Expiry Tracker';
const DEFAULT_DESCRIPTION = 'MailMate tracks domain, hosting, SSL certificate and SaaS subscription expiry dates and emails automatic renewal reminders before anything goes offline.';

// Public pages search engines should index. Every other route is private or
// one-off (verification links, dashboard) and is marked noindex.
const PUBLIC_PAGES = {
  '/': { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
  '/login': {
    title: 'Sign In or Create Account | MailMate',
    description: 'Sign in to MailMate or create a free account to track domain, hosting, SSL and subscription renewals with automatic email reminders.',
  },
  '/privacy-policy': {
    title: 'Privacy Policy | MailMate',
    description: 'How MailMate collects, uses and protects your account and subscription data.',
  },
  '/terms-and-conditions': {
    title: 'Terms & Conditions | MailMate',
    description: 'The terms that apply when you use MailMate to track domains, hosting, SSL certificates and subscriptions.',
  },
};

const setMeta = (selector, attr, value) => {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
};

export default function RouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = PUBLIC_PAGES[pathname];
    const title = page?.title || 'MailMate';
    const description = page?.description || DEFAULT_DESCRIPTION;
    const url = `${SITE_URL}${pathname}`;

    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[name="robots"]', 'content', page ? 'index, follow' : 'noindex, nofollow');
    setMeta('link[rel="canonical"]', 'href', url);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);
  }, [pathname]);

  return null;
}
