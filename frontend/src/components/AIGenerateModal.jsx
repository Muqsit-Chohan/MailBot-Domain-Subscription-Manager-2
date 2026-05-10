// frontend/src/components/AIGenerateModal.jsx
import { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function AIGenerateModal({ open, onClose, onTemplateGenerated, initialPrompt = '' }) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);

  // Update prompt when modal opens with a new initial value
  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt, open]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const { data } = await api.post('/templates/generate', { prompt });
      onTemplateGenerated(data);
      toast.success('Template generated! You can review it now.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="✨ AI Email Creator">
      <form onSubmit={handleGenerate}>
        <div className="mb-4">
          <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            What kind of email do you need?
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Describe it naturally – the AI understands plain English. For example:
          </p>
          <textarea
            id="ai-prompt"
            rows="4"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder={`"Remind my customer 7 days before their domain expires"`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Quick ideas:</span>
            {[
              'A friendly renewal notice 30 days before expiry',
              'Urgent: domain expires tomorrow',
              'Sorry, your domain has expired – please renew',
              'Remind customer to renew with a discount offer'
            ].map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setPrompt(idea)}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? 'Generating...' : 'Create Email'}
          </button>
        </div>
      </form>
    </Modal>
  );
}