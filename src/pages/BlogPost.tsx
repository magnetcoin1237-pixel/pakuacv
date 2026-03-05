import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { BLOG_POSTS } from '../constants';
import { ArrowLeft, Calendar, User, Tag, Share2 } from 'lucide-react';

export default function BlogPost() {
  const { id } = useParams();
  const post = BLOG_POSTS.find(p => p.id === id);

  if (!post) return <Navigate to="/blog" />;

  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <Link 
        to="/blog" 
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-12 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Blog
      </Link>

      <header className="mb-12">
        <div className="flex items-center gap-4 text-sm text-zinc-400 mb-6">
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            {post.date}
          </span>
          <span className="flex items-center gap-1">
            <Tag size={14} />
            {post.category}
          </span>
          <span className="flex items-center gap-1">
            <User size={14} />
            {post.author}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-8">
          {post.title}
        </h1>
        <div className="aspect-video rounded-3xl overflow-hidden mb-12">
          <img 
            src={`https://picsum.photos/seed/${post.id}/1200/800`} 
            alt={post.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </header>

      <div className="markdown-body prose prose-zinc max-w-none">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>

      <footer className="mt-20 pt-12 border-t border-zinc-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
              <User size={24} />
            </div>
            <div>
              <p className="text-sm font-bold">{post.author}</p>
              <p className="text-xs text-zinc-500">Career Strategist</p>
            </div>
          </div>
          <button className="p-2 rounded-full border border-zinc-200 hover:bg-zinc-50 transition-colors">
            <Share2 size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
}
