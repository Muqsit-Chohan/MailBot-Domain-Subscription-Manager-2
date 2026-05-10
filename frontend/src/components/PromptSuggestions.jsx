// frontend/src/components/PromptSuggestions.jsx
import { useState } from 'react';
import Modal from './Modal';
import { Copy, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const PROMPTS = [
  { title: '30-day reminder', text: 'Send a friendly reminder 30 days before domain expiry.' },
  { title: '15-day reminder', text: 'Remind the domain owner that their domain will expire in 15 days.' },
  { title: '7-day reminder', text: 'One week left! Urge the customer to renew now.' },
  { title: '1-day warning', text: 'Final warning: domain expires tomorrow. Use urgent tone.' },
  { title: '3-day + discount', text: 'Renew in 3 days with a 10% discount coupon.' },
  { title: 'Expired notice', text: 'Domain has expired. Notify the owner that their site may be down.' },
  { title: '2nd notice after expiry', text: 'Second warning before domain goes to auction.' },
  { title: 'Renewal confirmation', text: 'Thank you for renewing! Confirm new expiry date.' },
  { title: 'Black Friday promo', text: 'Black Friday 50% off multi-year renewals.' },
  { title: 'Loyalty discount', text: 'Exclusive 20% off for returning customers.' },
  { title: 'Transfer completed', text: 'Domain transfer successful – welcome message.' },
  { title: 'Auto-renewal notice', text: 'Auto-renewal successful, billing summary inside.' },
];

export default function PromptSuggestions({ open, onClose, onSelectPrompt }) {
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Prompt copied!');
  };

  const handleUsePrompt = (text) => {
    onSelectPrompt(text);   // passes prompt back to parent to open AI modal
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="💡 AI Prompt Ideas" size="lg">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Click <Sparkles size={14} className="inline" /> to send to AI, or <Copy size={14} className="inline" /> to copy.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {PROMPTS.map((item, idx) => (
          <div
            key={idx}
            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 group transition-colors"
          >
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-1">{item.title}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">{item.text}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => handleCopy(item.text)}
                className="p-1 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                title="Copy to clipboard"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() => handleUsePrompt(item.text)}
                className="p-1 text-gray-500 hover:text-green-600 dark:hover:text-green-400"
                title="Use this prompt with AI"
              >
                <Sparkles size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}