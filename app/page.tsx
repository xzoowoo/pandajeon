"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MessageSquare, Heart, Send, Image as ImageIcon, X, TrendingUp, Hash, RefreshCw, User, ChevronDown, ChevronUp, CornerDownRight } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface Comment {
  id: number;
  author: string;
  content: string;
  time: string;
  likes: number;
  is_liked: boolean;
  replies?: Comment[];
}

interface Post {
  id: number;
  sub: string;
  title: string;
  content: string;
  images: string[];
  author: string;
  likes: number;
  is_liked: boolean;
  comments: Comment[];
  created_at: string;
}

export default function PandajeonUltimateV5() {
  const [currentUser, setCurrentUser] = useState("");
  const [activeSub, setActiveSub] = useState("전체");
  const [posts, setPosts] = useState<Post[]>([]);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [fullImage, setFullImage] = useState<string | null>(null);

  const [inputTitle, setInputTitle] = useState("");
  const [inputContent, setInputContent] = useState("");
  const [inputSub, setInputSub] = useState("자유");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({}); 
  const [replyInputs, setReplyInputs] = useState<{ [key: number]: string }>({});
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  useEffect(() => {
    fetchPosts();
    const savedName = localStorage.getItem('panda-nick') || `익명 ${Math.floor(Math.random() * 900) + 100}`;
    localStorage.setItem('panda-nick', savedName);
    setCurrentUser(savedName);
  }, []);

  const refreshNickname = () => {
    const newNick = `익명 ${Math.floor(Math.random() * 900) + 100}`;
    localStorage.setItem('panda-nick', newNick);
    setCurrentUser(newNick);
  }

  const subGroups = Array.from(new Set(["전체", "자유", ...posts.map(p => p.sub)]));

  const handlePostSubmit = async () => {
    if (!inputTitle || !inputContent) return alert("제목과 내용을 입력해주세요.");
    const { error } = await supabase.from('posts').insert([{
      sub: inputSub, title: inputTitle, content: inputContent, images: selectedImages, author: currentUser, comments: []
    }]);
    if (!error) {
      setInputTitle(""); setInputContent(""); setSelectedImages([]); setInputSub("자유");
      fetchPosts();
    }
  };

  const toggleLike = async (e: React.MouseEvent, postId: number, likes: number, isLiked: boolean) => {
    e.stopPropagation();
    await supabase.from('posts').update({ likes: isLiked ? likes - 1 : likes + 1, is_liked: !isLiked }).eq('id', postId);
    fetchPosts();
  };

  // ★ 댓글 및 대댓글 좋아요 통합 로직
  const toggleCommentLike = async (postId: number, comments: Comment[], targetId: number) => {
    const updateRecursive = (items: Comment[]): Comment[] => {
      return items.map(c => {
        if (c.id === targetId) {
          return { ...c, likes: c.is_liked ? (c.likes || 0) - 1 : (c.likes || 0) + 1, is_liked: !c.is_liked };
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: updateRecursive(c.replies) };
        }
        return c;
      });
    };

    const updatedComments = updateRecursive(comments);
    await supabase.from('posts').update({ comments: updatedComments }).eq('id', postId);
    fetchPosts();
  };

  const handleCommentSubmit = async (e: React.BaseSyntheticEvent, postId: number, currentComments: Comment[], parentCommentId?: number) => {
    e.stopPropagation();
    const isReply = !!parentCommentId;
    const content = isReply ? replyInputs[parentCommentId!] : commentInputs[postId];
    if (!content) return;

    const newComment: Comment = { 
      id: Date.now(), 
      author: currentUser, 
      content, 
      time: "방금 전", 
      likes: 0, 
      is_liked: false,
      replies: [] 
    };

    let updatedComments: Comment[];
    if (isReply) {
      updatedComments = currentComments.map(c => {
        if (c.id === parentCommentId) {
          return { ...c, replies: [...(c.replies || []), newComment] };
        }
        return c;
      });
      setReplyInputs(prev => ({ ...prev, [parentCommentId!]: "" }));
      setReplyingTo(null);
    } else {
      updatedComments = [...(currentComments || []), newComment];
      setCommentInputs(prev => ({ ...prev, [postId]: "" }));
    }

    const { error } = await supabase.from('posts').update({ comments: updatedComments }).eq('id', postId);
    if (!error) fetchPosts();
  };

  const toggleExpand = (id: number) => {
    const newSet = new Set(expandedPosts);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedPosts(newSet);
  };

  return (
    <div className="min-h-screen bg-[#DAE0E6] font-sans pb-10 text-[#1A1A1B]">
      {fullImage && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setFullImage(null)}>
          <img src={fullImage} className="max-w-full max-h-full rounded shadow-2xl object-contain" alt="" />
        </div>
      )}

      <nav className="sticky top-0 bg-white border-b h-12 flex items-center justify-center px-5 z-50 shadow-sm">
        <div className="text-xl font-bold text-orange-600 flex items-center gap-1 cursor-pointer" onClick={() => setActiveSub("전체")}>
          <TrendingUp size={24}/> 판대전
        </div>
        <div className="absolute right-5 flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full border cursor-pointer hover:bg-gray-100" onClick={refreshNickname}>
          <User size={14} className="text-gray-500"/>
          <span className="text-xs font-bold text-gray-700">{currentUser}</span>
          <RefreshCw size={12} className="text-gray-400 ml-1"/>
        </div>
      </nav>

      <div className="max-w-[800px] mx-auto py-5 flex gap-6 px-4">
        <aside className="w-48 hidden lg:block sticky top-20 h-fit">
          <div className="bg-white rounded p-3 border shadow-sm">
            <h2 className="text-[10px] font-bold text-gray-400 mb-3 uppercase px-2 tracking-widest">소그룹</h2>
            <nav className="space-y-0.5">
              {subGroups.map((sub) => (
                <button key={sub} onClick={() => setActiveSub(sub)} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition ${activeSub === sub ? 'bg-orange-50 text-orange-600' : 'hover:bg-gray-50 text-gray-700'}`}>
                  <Hash size={16} /> {sub}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 space-y-4">
          <div className="bg-white p-4 rounded border shadow-sm space-y-3">
            <div className="flex gap-2 items-center bg-gray-100 rounded px-2 py-1 w-fit text-xs font-bold text-gray-500">
              p/ <input type="text" value={inputSub} onChange={(e) => setInputSub(e.target.value)} className="bg-transparent border-none outline-none w-24 text-black" placeholder="그룹명" />
            </div>
            <input type="text" value={inputTitle} onChange={(e) => setInputTitle(e.target.value)} placeholder="제목" className="w-full text-lg font-bold outline-none" />
            <textarea value={inputContent} onChange={(e) => setInputContent(e.target.value)} placeholder="내용을 입력하세요..." className="w-full text-sm outline-none min-h-[80px] resize-none" />
            <div className="flex justify-between items-center pt-2 border-t">
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition"><ImageIcon size={20} /></button>
              <input type="file" ref={fileInputRef} onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(file => {
                  const reader = new FileReader();
                  reader.onloadend = () => setSelectedImages(prev => [...prev, reader.result as string]);
                  reader.readAsDataURL(file);
                });
              }} className="hidden" accept="image/*" multiple />
              <button onClick={handlePostSubmit} className="bg-blue-600 text-white px-6 py-1.5 rounded-full font-bold text-sm">게시하기</button>
            </div>
          </div>

          <div className="space-y-3">
            {posts.filter(p => activeSub === "전체" || p.sub === activeSub).map((post) => {
              const isExpanded = expandedPosts.has(post.id);
              const hasImages = post.images && post.images.length > 0;
              return (
                <div key={post.id} className="bg-white rounded border shadow-sm overflow-hidden hover:border-gray-400 transition cursor-pointer" onClick={() => toggleExpand(post.id)}>
                  <div className="p-4">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1 font-bold">
                      <span className="text-black uppercase">p/{post.sub}</span> • {post.author}
                    </div>
                    <h3 className="text-md font-bold mb-2">{post.title}</h3>
                    
                    {/* ★ 썸네일 뷰 복구 포인트 */}
                    {!isExpanded && (
                      <div className="flex gap-4">
                        <p className="text-sm text-gray-700 flex-1 line-clamp-3 leading-relaxed">{post.content}</p>
                        {hasImages && (
                          <img src={post.images[0]} className="w-24 h-24 object-cover rounded-lg border flex-shrink-0" alt="thumbnail" />
                        )}
                      </div>
                    )}

                    {isExpanded && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                        {post.images?.map((img, i) => (
                          <img key={i} src={img} className="w-full rounded border cursor-zoom-in" onClick={(e) => { e.stopPropagation(); setFullImage(img); }} />
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 mt-3 border-t">
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                        <button onClick={(e) => toggleLike(e, post.id, post.likes, post.is_liked)} className={`flex items-center gap-1 ${post.is_liked ? 'text-red-500' : ''}`}><Heart size={14} fill={post.is_liked ? "currentColor" : "none"}/> {post.likes}</button>
                        <div className="flex items-center gap-1"><MessageSquare size={14}/> {post.comments?.length || 0}</div>
                      </div>
                      <div className="text-gray-400">{isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-gray-50 border-t p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <input type="text" value={commentInputs[post.id] || ""} onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))} placeholder="댓글 작성..." className="flex-1 bg-white border rounded-full px-4 py-1.5 text-xs outline-none focus:border-blue-500" onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(e, post.id, post.comments)}/>
                        <button onClick={(e) => handleCommentSubmit(e, post.id, post.comments)} className="text-blue-600 font-bold text-xs">등록</button>
                      </div>
                      
                      {post.comments?.map((comment) => (
                        <div key={comment.id} className="space-y-2">
                          <div className="flex gap-2 group">
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-[8px] font-bold text-gray-500 flex-shrink-0">{comment.author[0]}</div>
                            <div className="flex-1 bg-white p-2 rounded-lg border shadow-sm">
                              <div className="text-[10px] font-bold mb-0.5">{comment.author}</div>
                              <p className="text-xs text-gray-800 mb-2">{comment.content}</p>
                              <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                                <button onClick={() => toggleCommentLike(post.id, post.comments, comment.id)} className={`flex items-center gap-1 ${comment.is_liked ? 'text-red-500' : ''}`}><Heart size={12} fill={comment.is_liked ? "currentColor" : "none"}/> {comment.likes || 0}</button>
                                <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="hover:text-blue-500">답글 달기</button>
                              </div>
                            </div>
                          </div>

                          {comment.replies?.map((reply) => (
                            <div key={reply.id} className="flex gap-2 pl-8">
                              <CornerDownRight size={14} className="text-gray-300 mt-1 flex-shrink-0"/>
                              <div className="flex-1 bg-gray-100 p-2 rounded-lg border border-gray-200 shadow-inner">
                                <div className="text-[10px] font-bold mb-0.5">{reply.author}</div>
                                <p className="text-xs text-gray-700 mb-2">{reply.content}</p>
                                {/* ★ 대댓글 좋아요 버튼 추가 */}
                                <button onClick={() => toggleCommentLike(post.id, post.comments, reply.id)} className={`flex items-center gap-1 text-[10px] font-bold ${reply.is_liked ? 'text-red-500' : 'text-gray-400'}`}>
                                  <Heart size={10} fill={reply.is_liked ? "currentColor" : "none"}/> {reply.likes || 0}
                                </button>
                              </div>
                            </div>
                          ))}

                          {replyingTo === comment.id && (
                            <div className="pl-8 flex gap-2">
                              <input type="text" value={replyInputs[comment.id] || ""} onChange={(e) => setReplyInputs(prev => ({ ...prev, [comment.id]: e.target.value }))} placeholder="답글 작성..." className="flex-1 bg-white border rounded-full px-3 py-1 text-[11px] outline-none border-blue-200" onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(e, post.id, post.comments, comment.id)}/>
                              <button onClick={(e) => handleCommentSubmit(e, post.id, post.comments, comment.id)} className="text-blue-500 font-bold text-[11px]">등록</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}