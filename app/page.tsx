"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import imageCompression from 'browser-image-compression'; 
import { MessageSquare, Heart, Send, Image as ImageIcon, X, TrendingUp, Hash, RefreshCw, User, ChevronDown, ChevronUp, CornerDownRight, Loader2 } from 'lucide-react';

// 1. 수파베이스 연결 설정
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

export default function PandajeonMaster() {
  const [currentUser, setCurrentUser] = useState("");
  const [activeSub, setActiveSub] = useState("전체");
  const [posts, setPosts] = useState<Post[]>([]);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [fullImage, setFullImage] = useState<string | null>(null);

  // 페이징 및 로딩 상태 관리
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 게시글 작성 관련 상태
  const [inputTitle, setInputTitle] = useState("");
  const [inputContent, setInputContent] = useState("");
  const [inputSub, setInputSub] = useState("자유");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({}); 
  const [replyInputs, setReplyInputs] = useState<{ [key: number]: string }>({});
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 데이터 불러오기 (10개씩 페이징 처리)
  const fetchPosts = async (isInitial = false) => {
    if (loading) return;
    setLoading(true);
    const currentPage = isInitial ? 0 : page;
    const from = currentPage * 10;
    const to = from + 9;

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (data) {
      if (isInitial) setPosts(data);
      else setPosts(prev => [...prev, ...data]);
      setHasMore(data.length === 10);
      setPage(currentPage + 1);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts(true);
    const savedName = localStorage.getItem('panda-nick') || `익명 ${Math.floor(Math.random() * 900) + 100}`;
    localStorage.setItem('panda-nick', savedName);
    setCurrentUser(savedName);
  }, []);

  const refreshNickname = () => {
    const newNick = `익명 ${Math.floor(Math.random() * 900) + 100}`;
    localStorage.setItem('panda-nick', newNick);
    setCurrentUser(newNick);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    files.forEach(file => setPreviewUrls(prev => [...prev, URL.createObjectURL(file)]));
  };

  // ★ 게시글 저장 (GIF 보존 + 일반 이미지 리사이징)
  const handlePostSubmit = async () => {
    if (!inputTitle || !inputContent || isUploading) return;
    setIsUploading(true);

    try {
      const uploadedUrls = [];
      for (const file of selectedFiles) {
        let fileToUpload = file;

        // GIF가 아닐 경우에만 압축을 진행하여 애니메이션 보존
        if (file.type !== 'image/gif') {
          fileToUpload = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1024 });
        }

        const fileName = `${Date.now()}-${file.name}`;
        const { data } = await supabase.storage.from('photos').upload(fileName, fileToUpload);
        
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
          uploadedUrls.push(publicUrl);
        }
      }

      await supabase.from('posts').insert([{
        sub: inputSub, title: inputTitle, content: inputContent, images: uploadedUrls, author: currentUser, comments: []
      }]);

      setInputTitle(""); setInputContent(""); setSelectedFiles([]); setPreviewUrls([]); setInputSub("자유");
      fetchPosts(true);
    } catch (err) {
      alert("업로드 실패: " + err);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleLike = async (e: React.MouseEvent, postId: number, likes: number, isLiked: boolean) => {
    e.stopPropagation();
    await supabase.from('posts').update({ likes: isLiked ? likes - 1 : likes + 1, is_liked: !isLiked }).eq('id', postId);
    fetchPosts(true);
  };

  // 댓글 및 대댓글 좋아요 처리 (재귀적 업데이트)
  const toggleCommentLike = async (postId: number, comments: Comment[], targetId: number) => {
    const updateRecursive = (items: Comment[]): Comment[] => items.map(c => {
      if (c.id === targetId) return { ...c, likes: c.is_liked ? (c.likes || 0) - 1 : (c.likes || 0) + 1, is_liked: !c.is_liked };
      if (c.replies) return { ...c, replies: updateRecursive(c.replies) };
      return c;
    });
    const updatedComments = updateRecursive(comments);
    await supabase.from('posts').update({ comments: updatedComments }).eq('id', postId);
    fetchPosts(true);
  };

  const handleCommentSubmit = async (e: React.BaseSyntheticEvent, postId: number, currentComments: Comment[], parentCommentId?: number) => {
    e.stopPropagation();
    const isReply = !!parentCommentId;
    const content = isReply ? replyInputs[parentCommentId!] : commentInputs[postId];
    if (!content) return;

    const newComment = { id: Date.now(), author: currentUser, content, time: "방금 전", likes: 0, is_liked: false, replies: [] };
    let updatedComments;
    if (isReply) {
      updatedComments = currentComments.map(c => c.id === parentCommentId ? { ...c, replies: [...(c.replies || []), newComment] } : c);
      setReplyInputs({ ...replyInputs, [parentCommentId!]: "" }); setReplyingTo(null);
    } else {
      updatedComments = [...(currentComments || []), newComment];
      setCommentInputs({ ...commentInputs, [postId]: "" });
    }
    await supabase.from('posts').update({ comments: updatedComments }).eq('id', postId);
    fetchPosts(true);
  };

  const toggleExpand = (id: number) => {
    const newSet = new Set(expandedPosts);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setExpandedPosts(newSet);
  };

  const filteredPosts = posts.filter(p => activeSub === "전체" || p.sub === activeSub);
  const subGroups = Array.from(new Set(["전체", "자유", ...posts.map(p => p.sub)]));

  return (
    <div className="min-h-screen bg-[#DAE0E6] font-sans pb-10 text-[#1A1A1B]">
      {/* 이미지 확대 모달 */}
      {fullImage && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setFullImage(null)}>
          <img src={fullImage} className="max-w-full max-h-full object-contain rounded" alt="" />
        </div>
      )}

      {/* 네비게이션 */}
      <nav className="sticky top-0 bg-white border-b h-12 flex items-center justify-center px-5 z-50 shadow-sm">
        <div className="text-xl font-bold text-orange-600 flex items-center gap-1 cursor-pointer" onClick={() => { setActiveSub("전체"); fetchPosts(true); }}>
          <TrendingUp size={24}/> 판대전
        </div>
        <div className="absolute right-5 flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full border cursor-pointer" onClick={refreshNickname}>
          <User size={14} className="text-gray-500"/><span className="text-xs font-bold text-gray-700">{currentUser}</span>
        </div>
      </nav>

      <div className="max-w-[800px] mx-auto py-5 flex gap-6 px-4">
        {/* 사이드바 */}
        <aside className="w-48 hidden lg:block sticky top-20 h-fit">
          <div className="bg-white rounded p-3 border shadow-sm">
            <h2 className="text-[10px] font-bold text-gray-400 mb-3 uppercase px-2 tracking-widest">소그룹</h2>
            {subGroups.map(sub => (
              <button key={sub} onClick={() => setActiveSub(sub)} className={`w-full text-left px-3 py-2 rounded text-sm mb-0.5 ${activeSub === sub ? 'bg-orange-50 text-orange-600 font-bold' : 'hover:bg-gray-50 text-gray-700'}`}># {sub}</button>
            ))}
          </div>
        </aside>

        {/* 메인 피드 */}
        <main className="flex-1 space-y-4">
          {/* 게시글 작성창 */}
          <div className="bg-white p-4 rounded border shadow-sm space-y-3">
            <div className="flex gap-2 items-center bg-gray-100 rounded px-2 py-1 w-fit text-xs font-bold text-gray-500">p/ <input type="text" value={inputSub} onChange={(e) => setInputSub(e.target.value)} className="bg-transparent outline-none w-24 text-black font-bold" /></div>
            <input type="text" value={inputTitle} onChange={(e) => setInputTitle(e.target.value)} placeholder="제목" className="w-full text-lg font-bold outline-none" />
            <textarea value={inputContent} onChange={(e) => setInputContent(e.target.value)} placeholder="무슨 소식이 있나요?" className="w-full text-sm outline-none min-h-[80px] resize-none" />
            
            {previewUrls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-2">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg border overflow-hidden flex-shrink-0"><img src={url} className="w-full h-full object-cover" alt="" /><button onClick={() => { setPreviewUrls(previewUrls.filter((_, idx) => idx !== i)); setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i)); }} className="absolute top-0 right-0 bg-black/50 text-white p-0.5"><X size={12}/></button></div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-gray-600"><ImageIcon size={20}/></button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
              <button onClick={handlePostSubmit} disabled={isUploading} className="bg-blue-600 text-white px-6 py-1.5 rounded-full font-bold text-sm flex items-center gap-2">
                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} 게시하기
              </button>
            </div>
          </div>

          {/* 게시글 리스트 */}
          <div className="space-y-3">
            {filteredPosts.map((post) => {
              const expanded = expandedPosts.has(post.id);
              return (
                <div key={post.id} className="bg-white rounded border shadow-sm overflow-hidden hover:border-gray-400 transition cursor-pointer" onClick={() => toggleExpand(post.id)}>
                  <div className="p-4">
                    <div className="text-[10px] text-gray-500 font-bold mb-1 uppercase">p/{post.sub} • {post.author}</div>
                    <h3 className="text-md font-bold mb-2">{post.title}</h3>
                    {!expanded ? (
                      <div className="flex gap-4"><p className="text-sm text-gray-700 flex-1 line-clamp-3 leading-relaxed">{post.content}</p>{post.images?.[0] && <img src={post.images[0]} className="w-24 h-24 object-cover rounded-lg border flex-shrink-0" alt="" />}</div>
                    ) : (
                      <div className="space-y-4"><p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>{post.images?.map((img, i) => <img key={i} src={img} className="w-full rounded border cursor-zoom-in" onClick={(e) => { e.stopPropagation(); setFullImage(img); }} />)}</div>
                    )}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t">
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                        <button onClick={(e) => toggleLike(e, post.id, post.likes, post.is_liked)} className={`flex items-center gap-1.5 ${post.is_liked ? 'text-red-500' : ''}`}><Heart size={16} fill={post.is_liked ? "currentColor" : "none"}/> {post.likes}</button>
                        <div className="flex items-center gap-1.5"><MessageSquare size={16}/> 댓글 {post.comments?.length || 0}</div>
                      </div>
                      <div className="text-gray-400">{expanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</div>
                    </div>
                  </div>

                  {/* 댓글/대댓글 영역 */}
                  {expanded && (
                    <div className="bg-gray-50 border-t p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <input type="text" value={commentInputs[post.id] || ""} onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })} placeholder="댓글 작성..." className="flex-1 bg-white border rounded-full px-4 py-1.5 text-xs outline-none focus:border-blue-500" onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(e, post.id, post.comments)}/>
                        <button onClick={(e) => handleCommentSubmit(e, post.id, post.comments)} className="text-blue-600 font-bold text-xs">등록</button>
                      </div>
                      {post.comments?.map(comment => (
                        <div key={comment.id} className="space-y-2">
                          <div className="flex gap-2"><div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-[8px] font-bold text-gray-500 flex-shrink-0">{comment.author[0]}</div>
                          <div className="flex-1 bg-white p-2 rounded-lg border shadow-sm"><div className="text-[10px] font-bold mb-0.5">{comment.author}</div><p className="text-xs text-gray-800 mb-2">{comment.content}</p>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400"><button onClick={() => toggleCommentLike(post.id, post.comments, comment.id)} className={comment.is_liked ? 'text-red-500' : ''}><Heart size={12} fill={comment.is_liked ? "currentColor" : "none"}/> {comment.likes || 0}</button><button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>답글 달기</button></div></div></div>
                          {comment.replies?.map(reply => (
                            <div key={reply.id} className="flex gap-2 pl-8"><CornerDownRight size={14} className="text-gray-300 mt-1 flex-shrink-0"/><div className="flex-1 bg-gray-100 p-2 rounded-lg border border-gray-200 shadow-inner"><div className="text-[10px] font-bold mb-0.5">{reply.author}</div><p className="text-xs text-gray-700 mb-2">{reply.content}</p><button onClick={() => toggleCommentLike(post.id, post.comments, reply.id)} className={reply.is_liked ? 'text-red-500' : ''}><Heart size={10} fill={reply.is_liked ? "currentColor" : "none"}/> {reply.likes || 0}</button></div></div>
                          ))}
                          {replyingTo === comment.id && <div className="pl-8 flex gap-2"><input type="text" value={replyInputs[comment.id] || ""} onChange={(e) => setReplyInputs({ ...replyInputs, [comment.id]: e.target.value })} placeholder="답글 작성..." className="flex-1 bg-white border rounded-full px-3 py-1 text-[11px] outline-none border-blue-200" onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(e, post.id, post.comments, comment.id)}/><button onClick={(e) => handleCommentSubmit(e, post.id, post.comments, comment.id)} className="text-blue-500 font-bold text-[11px]">등록</button></div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {hasMore && (
              <button onClick={() => fetchPosts()} className="w-full py-3 bg-white border rounded font-bold text-sm text-gray-500 hover:bg-gray-50 transition flex items-center justify-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} 더 읽어오기
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}