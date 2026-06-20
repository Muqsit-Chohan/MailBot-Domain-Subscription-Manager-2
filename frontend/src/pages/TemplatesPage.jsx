import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Star,
  ChevronDown, ChevronUp, Sparkles, Lightbulb
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import AIGenerateModal from '../components/AIGenerateModal';
import PromptSuggestions from '../components/PromptSuggestions';

const TYPE_OPTS = ['reminder_30', 'reminder_15', 'reminder_7', 'reminder_1', 'expired', 'custom'];
const VARS = ['{{domain}}', '{{owner}}', '{{expiryDate}}', '{{days}}', '{{registrar}}'];

const EMPTY = { name: '', type: 'custom', subject: '', htmlBody: '', textBody: '', isDefault: false };

function TemplateCard({ tmpl, onEdit, onDelete, onToggleDefault }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between p-4 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-[#0f1523] dark:text-[#eef0f8] text-sm truncate">{tmpl.name}</h3>
            <span className="badge bg-[#f1f3f9] dark:bg-[#1e2235] text-[#6b7280] dark:text-[#8b92b3] font-mono text-[10px]">
              {tmpl.type}
            </span>
            {tmpl.isDefault && <span className="badge bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">Default</span>}
          </div>
          <p className="text-xs text-[#6b7280] dark:text-[#8b92b3] mt-1 truncate">{tmpl.subject}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1 ml-0 sm:ml-2">
          <button onClick={() => onToggleDefault(tmpl)} title="Set as default"
            className={`p-1.5 rounded-lg transition-colors ${tmpl.isDefault ? 'text-amber-500' : 'text-[#9ca3af] hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}>
            <Star size={14} fill={tmpl.isDefault ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => onEdit(tmpl)} className="p-1.5 rounded-lg hover:bg-[#f1f3f9] dark:hover:bg-[#1e2235] text-[#6b7280] transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(tmpl)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg hover:bg-[#f1f3f9] dark:hover:bg-[#1e2235] text-[#6b7280] transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[#e2e6f0] dark:border-[#2a2f48] p-4 bg-[#f8f9fc] dark:bg-[#0d0f1a]">
          <p className="text-xs text-[#6b7280] dark:text-[#8b92b3] font-mono mb-2 uppercase tracking-wide">HTML Body Preview</p>
          <div className="text-xs bg-white dark:bg-[#151829] border border-[#e2e6f0] dark:border-[#2a2f48] rounded-lg p-3 font-mono overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap text-[#0f1523] dark:text-[#eef0f8]">
            {tmpl.htmlBody}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [seeding, setSeeding] = useState(false);

  // AI related state
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/templates');
      setTemplates(data);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (tmpl) => {
    setEditing(tmpl);
    setForm({
      name: tmpl.name,
      type: tmpl.type,
      subject: tmpl.subject,
      htmlBody: tmpl.htmlBody,
      textBody: tmpl.textBody || '',
      isDefault: tmpl.isDefault,
    });
    setFormOpen(true);
  };

  const handleAITemplateGenerated = (generatedTemplate) => {
    setForm({
      name: generatedTemplate.name,
      type: generatedTemplate.type,
      subject: generatedTemplate.subject,
      htmlBody: generatedTemplate.htmlBody,
      textBody: generatedTemplate.textBody,
      isDefault: false,
    });
    setEditing(null);
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/templates/${editing._id}`, form);
        toast.success('Template updated');
      } else {
        await api.post('/templates', form);
        toast.success('Template created');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/templates/${deleteTarget._id}`);
      toast.success('Deleted');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  const toggleDefault = async (tmpl) => {
    try {
      await api.put(`/templates/${tmpl._id}`, { ...tmpl, isDefault: !tmpl.isDefault });
      toast.success(tmpl.isDefault ? 'Unset as default' : 'Set as default');
      load();
    } catch {
      toast.error('Failed');
    }
  };

  const insertVar = (v) => setForm(f => ({ ...f, htmlBody: f.htmlBody + v }));

  const seedDefaults = async () => {
    setSeeding(true);
    try {
      const { data } = await api.post('/templates/seed-defaults');
      toast.success(data.message);
      load();
    } catch {
      toast.error('Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  // When user picks a prompt from the suggestions modal
  const handlePromptSelect = (promptText) => {
    setSelectedPrompt(promptText);
    setIsPromptModalOpen(false);      // close ideas modal
    setIsAIModalOpen(true);          // open AI modal with pre‑filled prompt
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Email Templates</h1>
          <p className="text-sm text-[#6b7280] dark:text-[#8b92b3] mt-0.5">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button onClick={seedDefaults} disabled={seeding} className="btn-secondary flex items-center gap-2">
            {seeding ? 'Seeding…' : '⚡ Seed Defaults'}
          </button>

          <button
            onClick={() => setIsPromptModalOpen(true)}
            className="btn-secondary flex items-center gap-2"
            title="Prompt ideas"
          >
            <Lightbulb size={15} /> Ideas
          </button>

          <button
            onClick={() => { setSelectedPrompt(''); setIsAIModalOpen(true); }}
            className="btn-primary flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-md"
          >
            <Sparkles size={15} /> Generate with AI
          </button>

          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> New Template
          </button>
        </div>
      </div>

      {/* Loading / Empty / List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[#6b7280] dark:text-[#8b92b3] mb-4">No templates yet. Seed defaults or create your own.</p>
          <button onClick={seedDefaults} className="btn-primary">Seed Default Templates</button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <TemplateCard key={t._id} tmpl={t} onEdit={openEdit} onDelete={setDeleteTarget} onToggleDefault={toggleDefault} />
          ))}
        </div>
      )}

      {/* Create/Edit Template Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Template' : 'New Template'} size="xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Template Name *</label>
              <input className="input" placeholder="30-Day Reminder" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {TYPE_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Subject *</label>
            <input className="input" placeholder="⚠️ Domain {{domain}} expires in {{days}} days"
              value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">HTML Body *</label>
              <div className="flex gap-1 flex-wrap">
                {VARS.map(v => (
                  <button key={v} type="button" onClick={() => insertVar(v)}
                    className="px-2 py-0.5 text-[10px] font-mono bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-100 transition-colors">
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <textarea className="input font-mono text-xs" rows={8} placeholder="<html>…</html>"
              value={form.htmlBody} onChange={e => setForm(f => ({ ...f, htmlBody: e.target.value }))} required />
          </div>

          <div>
            <label className="label">Plain Text (optional)</label>
            <textarea className="input text-xs" rows={3} placeholder="Plain text fallback…"
              value={form.textBody} onChange={e => setForm(f => ({ ...f, textBody: e.target.value }))} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="rounded" />
            <span className="text-sm text-[#6b7280] dark:text-[#8b92b3]">Set as default for this type</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Template" size="sm">
        <p className="text-sm text-[#6b7280] dark:text-[#8b92b3]">
          Delete <strong className="text-[#0f1523] dark:text-[#eef0f8]">{deleteTarget?.name}</strong>?
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleDelete} className="btn-danger">Delete</button>
        </div>
      </Modal>

      {/* AI Generate Modal */}
      <AIGenerateModal
        open={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onTemplateGenerated={handleAITemplateGenerated}
        initialPrompt={selectedPrompt}
      />

      {/* Prompt Suggestions Modal */}
      <PromptSuggestions
        open={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onSelectPrompt={handlePromptSelect}
      />
    </div>
  );
}