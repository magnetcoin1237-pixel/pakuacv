import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Trash2, ExternalLink, Plus, Loader2, Clock, Briefcase } from 'lucide-react';

interface SavedDocument {
  id: string;
  type: 'cv' | 'cover_letter';
  title: string;
  createdAt: any;
  data: any;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) return;
      
      try {
        const q = query(
          collection(db, 'documents'),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const docsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SavedDocument[];
        
        // Sort by date descending
        docsData.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });
        setDocuments(docsData);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'documents', id));
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-zinc-900" size={40} />
        <p className="text-zinc-500 font-medium">Loading your documents...</p>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">My Dashboard</h1>
          <p className="text-zinc-500 mt-2">Manage your AI-generated CVs and cover letters.</p>
        </div>
        <div className="flex gap-4">
          <Link
            to="/builder"
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
          >
            <Plus size={18} />
            New CV
          </Link>
          <Link
            to="/cover-letter"
            className="flex items-center gap-2 px-6 py-3 bg-white text-zinc-900 border border-zinc-200 rounded-xl font-bold hover:bg-zinc-50 transition-all"
          >
            <Plus size={18} />
            New Cover Letter
          </Link>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200 p-20 text-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <FileText size={40} className="text-zinc-300" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">No documents yet</h2>
          <p className="text-zinc-500 max-w-sm mx-auto mb-8">
            Start by creating your first professional CV or cover letter using our AI tools.
          </p>
          <Link
            to="/builder"
            className="inline-flex items-center gap-2 px-8 py-4 bg-zinc-900 text-white rounded-full font-bold hover:bg-zinc-800 transition-all"
          >
            Get Started
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {documents.map((doc) => (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    doc.type === 'cv' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {doc.type === 'cv' ? <FileText size={24} /> : <Briefcase size={24} />}
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    {deletingId === doc.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  </button>
                </div>

                <h3 className="text-lg font-bold text-zinc-900 mb-1 truncate">{doc.title}</h3>
                <p className="text-xs text-zinc-400 flex items-center gap-1 mb-6">
                  <Clock size={12} />
                  Saved on {formatDate(doc.createdAt)}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      console.log("Opening document:", doc.id, doc.type);
                      navigate(doc.type === 'cv' ? '/builder' : '/cover-letter', { 
                        state: { loadedData: doc.data } 
                      });
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-900 text-white text-sm font-bold rounded-lg hover:bg-zinc-800 transition-all"
                  >
                    <ExternalLink size={14} />
                    Open
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
