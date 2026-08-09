import React, { useState, useRef } from 'react';
import { Copy, Share2, Link as LinkIcon, Mail, MessageSquare, Facebook, } from 'lucide-react';

type ShareButtonProps = {
  url?: string;
  title?: string;
  text?: string;
  className?: string;
};

export default function ShareButton({ url, title = 'GraficNeo', text = 'Check this out on GraficNeo!', className = '' }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const handleNativeShare = async () => {
    if (!navigator.share) return false;
    try {
      await navigator.share({ title, text, url: canonicalUrl });
      return true;
    } catch (err: any) {
      // If user cancels share it throws an AbortError / DOMException on some browsers — treat as non-error.
      if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError' || err.code === 64)) {
        return true; // cancelled gracefully
      }
      // otherwise rethrow or return false to fall back
      return false;
    }
  };

  const openWhatsApp = () => {
    const payload = `${text} ${canonicalUrl}`;
    const urlWA = `https://wa.me/?text=${encodeURIComponent(payload)}`;
    window.open(urlWA, '_blank');
    setOpen(false);
  };

  const openEmail = () => {
    const subject = title;
    const body = `${text}\n\n${canonicalUrl}`;
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setOpen(false);
  };

  const openFacebook = () => {
    const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}&quote=${encodeURIComponent(text)}`;
    window.open(fb, '_blank', 'noopener');
    setOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopied(true);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // fallback: select input method (not implemented)
      console.error('Clipboard write failed', err);
      alert('Unable to copy link.');
    }
    setOpen(false);
  };

  const onClick = async () => {
    // Try native share first
    const usedNative = await handleNativeShare();
    if (usedNative) return;
    // show fallback menu
    setOpen((o) => !o);
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="true"
        aria-expanded={open}
        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800"
        title="Share"
      >
        <Share2 className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 shadow-lg z-50">
          <div className="py-1">
            <button onClick={copyLink} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-800 flex items-center gap-2">
              <Copy className="w-4 h-4" />
              <span>{copied ? 'Link copied!' : 'Copy link'}</span>
            </button>
            <button onClick={openWhatsApp} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
            <button onClick={openEmail} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-800 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </button>
            <button onClick={openFacebook} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-800 flex items-center gap-2">
              <Facebook className="w-4 h-4" />
              <span>Facebook</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
