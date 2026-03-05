import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BLOG_POSTS } from '../constants';
import { ArrowRight, Calendar, User, Tag } from 'lucide-react';

export default function Blog() {
  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Career Insights</h1>
        <p className="text-zinc-500 max-w-2xl mx-auto">
          Expert advice on job searching, CV writing, and navigating your professional journey in the age of AI.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {BLOG_POSTS.map((post, i) => (
          <motion.article
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group flex flex-col bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-xl transition-all"
          >
            <div className="aspect-video overflow-hidden">
              <img 
                src={`https://picsum.photos/seed/${post.id}/600/400`} 
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex items-center gap-4 text-xs text-zinc-400 mb-4">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {post.date}
                </span>
                <span className="flex items-center gap-1">
                  <Tag size={12} />
                  {post.category}
                </span>
              </div>
              <h2 className="text-xl font-bold mb-3 group-hover:text-zinc-600 transition-colors">
                <Link to={`/blog/${post.id}`}>{post.title}</Link>
              </h2>
              <p className="text-zinc-500 text-sm mb-6 flex-grow">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
                <span className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                  <User size={12} />
                  {post.author}
                </span>
                <Link 
                  to={`/blog/${post.id}`}
                  className="text-sm font-bold flex items-center gap-1 text-zinc-900 group-hover:gap-2 transition-all"
                >
                  Read More
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
