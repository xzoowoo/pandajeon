"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MessageSquare, Heart, Send, Image as ImageIcon, X, TrendingUp, Hash, RefreshCw, User, ChevronLeft, ChevronRight } from 'lucide-react';

// 1. 수파베이스 연결
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface Comment {
  id: number;
  author: string;
  content: string;
  time: string;
}

interface Post {
  id: number;
  sub: string;
  title: string;
  content: string;
  images: string[]; // 여러 장의 사진 배열
  author: string;
  likes: number;
  is_liked: boolean;
  comments: Comment[];
  created_at: string;
}

export default function PandajeonUltimate() {
  const [currentUser, setCurrentUser] = useState("");
  const [activeSub, setActiveSub] = useState("전체");
  const [posts, setPosts] = useState<Post[]>([]);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [fullImage, setFullImage] = useState<string | null>(null);

  // 입력 상태
  const [inputTitle, setInputTitle] = useState("");
  const [inputContent, setInputContent] = useState("");
  const [inputSub, setInputSub] = useState("자유");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 서버에서 데이터 가져오기
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

  // 소그룹 목록 동적 생성 (#전체, #자유 + 작성된 그룹들)
  const subGroups = Array.from(new Set(["전체", "자유", ...posts.map(p => p.sub)]));

  // 다중 이미지 처리
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // 게시글 작성
  const handlePostSubmit = async () => {
    if (!inputTitle || !inputContent) return;
    const { error } = await supabase.from('posts').insert([{
      sub: inputSub,
      title: inputTitle,
      content: inputContent,
      images: selectedImages,
      author: currentUser,
      comments: []
    }]);

    if (!error) {
      setInputTitle(""); setInputContent(""); setSelectedImages([]); setInputSub("자유");
      fetchPosts();
    }
  };

  // 좋아요 기능
  const toggleLike = async (postId: number, likes: number, isLiked: boolean) => {
    await supabase.from('posts').update({ 
      likes: isLiked ? likes - 1 : likes + 1, 
      is_liked: !isLiked 
    }).eq('id', postId);
    fetchPosts();
  };

  // 글 펼치기/접기 토글
  const toggleExpand = (id: number) => {
    const newSet = new Set(expandedPosts);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedPosts(newSet);
  };

  const filteredPosts = activeSub === "전체" ? posts : posts.filter(p => p.sub === activeSub);

  return (
    <div className="min-h-screen bg-[#DAE0E6] font-sans pb-10 text-[#1A1A1B]">
      {/* 이미지 확대 모달 */}
      {fullImage && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setFullImage(null)}>
          <img src={fullImage} className="max-w-full max-h-full rounded shadow-2xl" alt="" />
          <button className="absolute top-5 right-5 text-white"><X size={32} /></button>
        </div>
      )}

      {/* 네비게이션 */}
      <nav className="sticky top-0 bg-white border-b h-12 flex items-center justify-center px-5 z-50 shadow-sm">
        <div className="text-xl font-bold text-orange-600 flex items-center gap-1 cursor-pointer" onClick={() => setActiveSub("전체")}>
          <TrendingUp size={24}/> 판대전
        </div>
        <div className="absolute right-5 flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full border">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">User:</span>
          <span className="text-xs font-bold text-gray-700">{currentUser}</span>
        </div>
      </nav>

      <div className="max-w-[1000px] mx-auto py-5 flex gap-6 px-4">
        {/* 사이드바 - 동적 소그룹 */}
        <aside className="w-56 hidden lg:block sticky top-20 h-fit">
          <div className="bg-white rounded p-3 border shadow-sm">
            <h2 className="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest px-2">소그룹 목록</h2>
            <nav className="space-y-0.5">
              {subGroups.map((sub) => (
                <button key={sub} onClick={() => setActiveSub(sub)} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition ${activeSub === sub ? 'bg-orange-50 text-orange-600' : 'hover:bg-gray-50 text-gray-700'}`}>
                  <Hash size={16} /> {sub}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* 메인 피드 */}
        <main className="flex-1 space-y-4">
          {/* 글쓰기 영역 */}
          <div className="bg-white p-4 rounded border shadow-sm space-y-3">
            <div className="flex gap-2 items-center bg-gray-100 rounded px-2 py-1 w-fit text-xs font-bold text-gray-500">
              p/ <input type="text" value={inputSub} onChange={(e) => setInputSub(e.target.value)} className="bg-transparent border-none outline-none w-24 text-black" placeholder="그룹명" />
            </div>
            <input type="text" value={inputTitle} onChange={(e) => setInputTitle(e.target.value)} placeholder="제목을 입력하세요" className="w-full text-lg font-bold outline-none" />
            <textarea value={inputContent} onChange={(e) => setInputContent(e.target.value)} placeholder="무슨 소식이 있나요?" className="w-full text-sm outline-none min-h-[100px] resize-none" />
            
            {/* 여러 장 사진 미리보기 */}
            {selectedImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-2">
                {selectedImages.map((img, idx) => (
                  <div key={idx} className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border">
                    <img src={img} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => setSelectedImages(selectedImages.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black"><X size={12}/></button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition"><ImageIcon size={20} /></button>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" multiple />
              <button onClick={handlePostSubmit} className="bg-blue-600 text-white px-8 py-2 rounded-full font-bold text-sm hover:bg-blue-700 transition active:scale-95 flex items-center gap-2">
                <Send size={14} /> 게시하기
              </button>
            </div>
          </div>

          {/* 게시글 목록 */}
          <div className="space-y-3">
            {filteredPosts.map((post) => {
              const isExpanded = expandedPosts.has(post.id);
              const isLongContent = post.content.length > 150;

              return (
                <div key={post.id} className="bg-white rounded border shadow-sm flex overflow-hidden hover:border-gray-400 transition cursor-pointer" onClick={() => toggleExpand(post.id)}>
                  {/* 좋아요 사이드바 */}
                  <div className="w-10 bg-[#F8F9FA] p-2 flex flex-col items-center gap-1 border-r text-gray-400 font-bold text-xs">
                    <button onClick={(e) => { e.stopPropagation(); toggleLike(post.id, post.likes, post.is_liked); }} className={`hover:text-orange-600 ${post.is_liked ? 'text-orange-600' : ''}`}>▲</button>
                    <span className="text-black">{post.likes}</span>
                    <button className="hover:text-blue-600">▼</button>
                  </div>

                  {/* 메인 내용 */}
                  <div className="p-4 flex-1">
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold mb-1">
                      <span className="text-black uppercase">p/{post.sub}</span> • 게시자: {post.author}
                    </div>
                    <h3 className="text-md font-bold mb-2">{post.title}</h3>
                    
                    {/* 글 내용 (요약/펼치기 로직) */}
                    <div className="text-sm text-gray-700 leading-relaxed mb-4">
                      {isExpanded ? post.content : post.content.slice(0, 150) + (isLongContent ? "..." : "")}
                      {isLongContent && (
                        <span className="text-blue-500 ml-1 font-bold">{isExpanded ? " 접기" : " 더보기"}</span>
                      )}
                    </div>

                    {/* 이미지 그리드/리스트 */}
                    {post.images && post.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-4 max-w-xl">
                        {post.images.map((img, idx) => (
                          <div key={idx} className={`rounded-lg overflow-hidden border bg-gray-50 cursor-zoom-in ${post.images.length === 1 ? 'col-span-2' : ''}`} onClick={(e) => { e.stopPropagation(); setFullImage(img); }}>
                            <img src={img} className="w-full max-h-96 object-contain" alt="" />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-gray-400 text-xs font-bold pt-2 border-t">
                      <div className="flex items-center gap-1.5 hover:bg-gray-100 p-1.5 rounded transition">
                        <MessageSquare size={16}/> 댓글 {post.comments?.length || 0}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}