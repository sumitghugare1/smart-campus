import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { BookOpen, FileText, Download, PlusCircle, Search, Filter, X } from 'lucide-react';

export default function ResourcesPage() {
  const { user, isTrainer, isAdmin } = useAuth();
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [myBatches, setMyBatches] = useState([]);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'Database & SQL',
    batch_id: '',
    file_url: 'uploads/sample_sql_guide.pdf'
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isTrainer && !isAdmin) return;
    async function loadMyBatches() {
      try {
        const data = isAdmin ? await api.getBatches() : await api.getMyBatches();
        setMyBatches(data.batches || []);
        if (data.batches && data.batches.length > 0) {
          setUploadForm((prev) => ({ ...prev, batch_id: data.batches[0].batch_id }));
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadMyBatches();
    const refreshOnFocus = () => loadMyBatches();
    const refreshTimer = window.setInterval(loadMyBatches, 5000);
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [isTrainer, isAdmin]);

  const fetchResources = async () => {
    try {
      const [resData, catData] = await Promise.all([
        api.getResources({ category: selectedCategory, search }),
        api.getResourceCategories()
      ]);
      setResources(resData.resources || []);
      setCategories(catData.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedCategory, search]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      if (!uploadForm.batch_id) {
        alert('Please select a batch to publish this resource to.');
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('category', uploadForm.category);
      formData.append('batch_id', uploadForm.batch_id);
      formData.append('file_url', uploadForm.file_url);

      const fileInput = document.getElementById('resource-file-input');
      if (fileInput && fileInput.files[0]) {
        formData.append('file', fileInput.files[0]);
      }

      await api.uploadResource(formData);
      alert('✓ Study material uploaded successfully!');
      setUploadModalOpen(false);
      setUploadForm((prev) => ({ ...prev, title: '', category: 'Database & SQL', file_url: 'uploads/sample_sql_guide.pdf' }));
      fetchResources();
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Resource Repository</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Structured study materials, SQL guides, and interview cheatsheets organized by module.
          </p>
        </div>

        {(isTrainer || isAdmin) && (
          <button
            id="btn-upload-resource"
            className="btn btn-primary"
            onClick={() => setUploadModalOpen(true)}
          >
            <PlusCircle size={16} />
            <span>Upload Study Material</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            id="resource-search-input"
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
            placeholder="Search resources, topics, cheat sheets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>

        {/* Categories Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${selectedCategory === '' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedCategory('')}
          >
            All Modules
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {resources.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>No resources found</h3>
            <p style={{ fontSize: '0.8125rem' }}>Trainers can upload notes and cheat sheets using the button above.</p>
          </div>
        ) : (
          resources.map((res) => (
            <div
              key={res.resource_id}
              className="glass-card glass-card-interactive"
              style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                    {res.category}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {new Date(res.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', color: '#ffffff', lineHeight: 1.4 }}>
                  {res.title}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  Uploaded by: {res.trainer_name || 'Institute Faculty'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PDF Material</span>
                <a
                  href={`/${res.file_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  <Download size={14} /> Download
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="modal-overlay" onClick={() => setUploadModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem' }}>Upload Institute Study Material</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setUploadModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Material Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g. SQL Window Functions Cheatsheet"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Batch</label>
                  <select
                    className="form-select"
                    value={uploadForm.batch_id}
                    onChange={(e) => setUploadForm({ ...uploadForm, batch_id: e.target.value })}
                    required
                  >
                    {myBatches.length === 0 && <option value="">No batches assigned</option>}
                    {myBatches.map((b) => (
                      <option key={b.batch_id} value={b.batch_id}>
                        {b.batch_code} ({b.course_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Module Category</label>
                  <select
                    className="form-select"
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  >
                    <option value="Database & SQL">Database & SQL</option>
                    <option value="Frontend">Frontend & React</option>
                    <option value="Backend">Backend & Node.js</option>
                    <option value="System Design">System Design</option>
                    <option value="Aptitude & Reasoning">Aptitude & Reasoning</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Upload File (PDF / DOCX)</label>
                  <input
                    id="resource-file-input"
                    type="file"
                    className="form-input"
                    accept=".pdf,.docx,.txt"
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Leave empty to use sample PDF attachment.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setUploadModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Publish Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
