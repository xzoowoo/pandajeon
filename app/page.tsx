"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Heart, Send, Image as ImageIcon, X, TrendingUp, Hash, RefreshCw, User, CornerDownRight } from 'lucide-react';

// 1. 데이터 타입 정의 (재귀적 구조로 대댓글 지원)
interface Comment {
  id: number;
  author: string;
  content: string;
  time: string;
  likes: number;
  isLiked: boolean;
  replies: Comment[]; // 대댓글 리스트
}

interface Post {
  id: number;
  sub: string;
  title: string;
  content: string;
  image?: string | null;
  author: string;
  likes: number;
  isLiked: boolean;
  comments: Comment[];
  time: string;
}

// 2. 랜덤 닉네임 생성기
const adjectives = ["야근하는", "커피마시는", "코딩하는", "회의중인", "연봉협상중인", "퇴근꿈꾸는", "셔틀기다리는"];
const nouns = ["판다", "개발자", "디자이너", "PO", "인턴", "사장님", "리드", "거북이"];

const generateNickname = () => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${adj} ${noun} ${num}`;
};

export default function PandajeonFinal() {
  const [currentUser, setCurrentUser] = useState<string>("");
  const [activeSub, setActiveSub] = useState("전체");
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null); // 현재 답글 작성 중인 댓글 ID

  const [posts, setPosts] = useState<Post[]>([
    { 
      id: 1, sub: "판교맛집", title: "유스페이스 라멘집 진짜 대박임", content: "오늘 가봤는데 국물이 끝내줘요.", image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800", author: "졸린 개발자 123", likes: 120, isLiked: false, time: "5분 전",
      comments: [
        { id: 101, author: "라멘매니아", content: "거기 차슈 추가 필수인거 아시죠?", time: "3분 전", likes: 5, isLiked: false, replies: [] }
      ]
    },
  ]);

  const [inputTitle, setInputTitle] = useState("");
  const [inputContent, setInputContent] = useState("");
  const [inputSub, setInputSub] = useState("자유");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [replyInput, setReplyInput] = useState(""); // 답글 입력 상태
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('panda-nick');
    const name = savedName || generateNickname();
    if (!savedName) localStorage.setItem('panda-nick', name);
    setCurrentUser(name);
  }, []);

  const refreshNickname = () => {
    const newNick = generateNickname();
    localStorage.setItem('panda-nick', newNick);
    setCurrentUser(newNick);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // 게시글 좋아요
  const toggleLike = (postId: number) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, likes: p.isLiked ? p.likes - 1 : p.likes + 1, isLiked: !p.isLiked } : p));
  };

  // ★ 댓글/대댓글 좋아요 기능 ★
  const toggleCommentLike = (postId: number, commentId: number) => {
    const updateLikes = (comments: Comment[]): Comment[] => {
      return comments.map(c => {
        if (c.id === commentId) {
          return { ...c, likes: c.isLiked ? c.likes - 1 : c.likes + 1, isLiked: !c.isLiked };
        }
        return { ...c, replies: updateLikes(c.replies) };
      });
    };

    setPosts(posts.map(p => p.id === postId ? { ...p, comments: updateLikes(p.comments) } : p));
  };

  const handlePostSubmit = () => {
    if (!inputTitle || !inputContent) return alert("제목과 내용을 입력해주세요!");
    const newPost: Post = {
      id: Date.now(), sub: inputSub.trim(), title: inputTitle, content: inputContent, image: selectedImage, author: currentUser, likes: 0, isLiked: false, comments: [], time: "방금 전"
    };
    setPosts([newPost, ...posts]);
    setInputTitle(""); setInputContent(""); setSelectedImage(null);
  };

  const addComment = (postId: number) => {
    if (!commentInput) return;
    const newComment: Comment = { id: Date.now(), author: currentUser, content: commentInput, time: "방금 전", likes: 0, isLiked: false, replies: [] };
    setPosts(posts.map(p => p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p));
    setCommentInput("");
  };

  // ★ 대댓글 추가 기능 ★
  const addReply = (postId: number, parentCommentId: number) => {
    if (!replyInput) return;
    const newReply: Comment = { id: Date.now(), author: currentUser, content: replyInput, time: "방금 전", likes: 0, isLiked: false, replies: [] };
    
    const insertReply = (comments: Comment[]): Comment[] => {
      return comments.map(c => {
        if (c.id === parentCommentId) {
          return { ...c, replies: [...c.replies, newReply] };
        }
        return { ...c, replies: insertReply(c.replies) };
      });
    };

    setPosts(posts.map(p => p.id === postId ? { ...p, comments: insertReply(p.comments) } : p));
    setReplyInput("");
    setActiveReplyId(null);
  };

  const filteredPosts = activeSub === "전체" ? posts : posts.filter(post => post.sub === activeSub);

  return (
    <div className="min-h-screen bg-[#DAE0E6] font-sans text-[#1A1A1B]">
      {fullImage && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-pointer" onClick={() => setFullImage(null)}>
          <img src={fullImage} className="max-w-full max-h-full rounded shadow-2xl" alt="" />
        </div>
      )}

      <nav className="sticky top-0 bg-white border-b h-12 flex items-center justify-center px-5 z-50">
        <div className="text-xl font-bold text-orange-600 flex items-center gap-1 cursor-pointer" onClick={() => setActiveSub("전체")}><TrendingUp size={24}/> 판대전</div>
        <div className="absolute right-5 flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full border">
          <span className="text-xs font-bold text-gray-700">{currentUser}</span>
          <button onClick={refreshNickname} className="text-gray-400 hover:text-blue-600"><RefreshCw size={14} /></button>
        </div>
      </nav>

      <div className="max-w-[800px] mx-auto py-5 flex gap-6 px-4">
        {/* 사이드바 */}
        <aside className="w-52 hidden lg:block">
          <div className="bg-white rounded p-3 border shadow-sm">
            <h2 className="text-[10px] font-bold text-gray-400 mb-3 uppercase px-2">소그룹</h2>
            <nav className="space-y-0.5">
              {["전체", ...Array.from(new Set(posts.map(p => p.sub)))].map((sub) => (
                <button key={sub} onClick={() => setActiveSub(sub)} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition ${activeSub === sub ? 'bg-gray-100 text-blue-600' : 'hover:bg-gray-50'}`}>
                  <Hash size={16} /> {sub}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* 피드 영역 */}
        <main className="flex-1 space-y-4">
          {/* 글쓰기 */}
          <div className="bg-white p-4 rounded border shadow-sm space-y-3">
            <div className="flex items-center bg-gray-100 rounded-md px-2 py-1 w-fit text-xs font-bold text-gray-500">
              p/ <input type="text" value={inputSub} onChange={(e) => setInputSub(e.target.value)} className="bg-transparent border-none outline-none ml-1 w-20 text-black font-bold" />
            </div>
            <input type="text" value={inputTitle} onChange={(e) => setInputTitle(e.target.value)} placeholder="제목" className="w-full text-lg font-bold outline-none" />
            <textarea value={inputContent} onChange={(e) => setInputContent(e.target.value)} placeholder="내용을 입력하세요..." className="w-full text-sm outline-none min-h-[80px] resize-none" />
            {selectedImage && (
              <div className="relative w-20 h-20 rounded border overflow-hidden"><img src={selectedImage} className="w-full h-full object-cover" alt="" /><button onClick={() => setSelectedImage(null)} className="absolute top-0 right-0 bg-black/50 text-white p-0.5"><X size={12} /></button></div>
            )}
            <div className="flex justify-between items-center pt-2 border-t">
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition"><ImageIcon size={20} /></button>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
              <button onClick={handlePostSubmit} className="bg-blue-600 text-white px-6 py-1.5 rounded-full font-bold text-sm flex items-center gap-2">게시하기</button>
            </div>
          </div>

          {/* 리스트 */}
          <div className="space-y-3">
            {filteredPosts.map((post) => (
              <div key={post.id} className="bg-white rounded border shadow-sm overflow-hidden">
                <div className="flex p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1 font-bold">
                      <span className="text-black uppercase cursor-pointer hover:underline" onClick={() => setActiveSub(post.sub)}>p/{post.sub}</span>
                      <span>• {post.author}</span>
                      <span>• {post.time}</span>
                    </div>
                    <h3 className="text-md font-bold mb-1">{post.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{post.content}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-1.5 text-xs font-bold transition ${post.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}>
                        <Heart size={16} fill={post.isLiked ? "currentColor" : "none"} /> {post.likes}
                      </button>
                      <button onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)} className="flex items-center gap-1.5 text-gray-400 text-xs font-bold hover:text-blue-500 transition">
                        <MessageSquare size={16}/> 댓글 {post.comments.length}
                      </button>
                    </div>
                  </div>
                  {post.image && (
                    <div className="ml-4 flex-shrink-0 cursor-pointer" onClick={() => setFullImage(post.image || null)}>
                      <img src={post.image} className="w-20 h-20 object-cover rounded-lg border hover:opacity-80 transition" alt="" />
                    </div>
                  )}
                </div>

                {/* 댓글 영역 */}
                {expandedPostId === post.id && (
                  <div className="bg-gray-50 border-t p-4 space-y-4">
                    <div className="flex gap-2">
                      <input type="text" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="댓글 남기기..." className="flex-1 bg-white border rounded-full px-4 py-1.5 text-sm outline-none focus:border-blue-500" onKeyDown={(e) => e.key === 'Enter' && addComment(post.id)} />
                      <button onClick={() => addComment(post.id)} className="text-blue-600 font-bold text-sm px-2">등록</button>
                    </div>

                    {/* 댓글 렌더링 함수 (재귀) */}
                    <div className="space-y-4">
                      {post.comments.map(comment => (
                        <div key={comment.id} className="space-y-3">
                          <div className="flex gap-2">
                            <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-[10px] text-gray-500 font-bold">{comment.author[0]}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-[10px] mb-1 font-bold">{comment.author} <span className="text-gray-400 font-normal">{comment.time}</span></div>
                              <p className="text-sm text-gray-700">{comment.content}</p>
                              
                              {/* 댓글 좋아요 & 답글 달기 버튼 */}
                              <div className="flex gap-4 mt-2 text-[11px] font-bold text-gray-400">
                                <button 
                                  onClick={() => toggleCommentLike(post.id, comment.id)} 
                                  className={`flex items-center gap-1 transition ${comment.isLiked ? 'text-red-500' : 'hover:text-gray-600'}`}
                                >
                                  <Heart size={14} fill={comment.isLiked ? "currentColor" : "none"} /> {comment.likes}
                                </button>
                                <button 
                                  onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)}
                                  className="hover:text-blue-500"
                                >
                                  답글 달기
                                </button>
                              </div>

                              {/* 답글 입력창 */}
                              {activeReplyId === comment.id && (
                                <div className="mt-3 flex gap-2">
                                  <CornerDownRight size={16} className="text-gray-300" />
                                  <input 
                                    type="text" 
                                    value={replyInput}
                                    onChange={(e) => setReplyInput(e.target.value)}
                                    placeholder="답글을 남겨보세요"
                                    className="flex-1 bg-white border rounded-full px-3 py-1 text-xs outline-none focus:border-blue-500"
                                    onKeyDown={(e) => e.key === 'Enter' && addReply(post.id, comment.id)}
                                  />
                                  <button onClick={() => addReply(post.id, comment.id)} className="text-blue-600 font-bold text-xs">등록</button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 대댓글 리스트 (레딧 스타일 왼쪽 선) */}
                          {comment.replies.map(reply => (
                            <div key={reply.id} className="ml-8 pl-4 border-l-2 border-gray-100 flex gap-2">
                              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] text-gray-400 font-bold">{reply.author[0]}</div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 text-[10px] mb-1 font-bold">{reply.author} <span className="text-gray-400 font-normal">{reply.time}</span></div>
                                <p className="text-sm text-gray-700">{reply.content}</p>
                                <button 
                                  onClick={() => toggleCommentLike(post.id, reply.id)} 
                                  className={`mt-1 flex items-center gap-1 text-[10px] font-bold transition ${reply.isLiked ? 'text-red-500' : 'text-gray-400'}`}
                                >
                                  <Heart size={12} fill={reply.isLiked ? "currentColor" : "none"} /> {reply.likes}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}