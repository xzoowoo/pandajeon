"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MessageSquare, Heart, Send, Image as ImageIcon, X, TrendingUp, Hash, RefreshCw, User } from 'lucide-react';

// 1. Supabase 연결 (환경 변수 사용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 데이터 타입 정의
interface Post {
  id: number;
  sub: string;
  title: string;
  content: string;
  image?: string | null;
  author: string;
  likes: number;
  is_liked: boolean;
  created_at: string;
}

export default function PandajeonSupabase() {
  const [currentUser, setCurrentUser] = useState<string>("");
  const [activeSub, setActiveSub] = useState("전체");
  const [posts, setPosts] = useState<Post[]>([]); // 이제 빈 배열로 시작합니다.
  
  const [inputTitle, setInputTitle] = useState("");
  const [inputContent, setInputContent] = useState("");
  const [inputSub, setInputSub] = useState("자유");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. 서버에서 글 목록 가져오기 함수
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false }); // 최신글이 위로 오게 함

    if (error) {
      console.error("데이터 로드 에러:", error.message);
    } else {
      setPosts(data || []);
    }
  };

  // 3. 페이지 접속 시 실행
  useEffect(() => {
    fetchPosts(); // 서버에서 글 가져오기

    // 닉네임 설정
    const savedName = localStorage.getItem('panda-nick');
    if (savedName) {
      setCurrentUser(savedName);
    } else {
      const newNick = `익명 ${Math.floor(Math.random() * 900) + 100}`;
      localStorage.setItem('panda-nick', newNick);
      setCurrentUser(newNick);
    }
  }, []);

  // 4. 서버에 글 저장하기 함수
  const handlePostSubmit = async () => {
    if (!inputTitle || !inputContent) return alert("내용을 입력해주세요!");

    // Supabase에 데이터 넣기
    const { error } = await supabase.from('posts').insert([
      {
        sub: inputSub.trim() || "자유",
        title: inputTitle,
        content: inputContent,
        image: selectedImage,
        author: currentUser,
        likes: 0,
        is_liked: false
      }
    ]);

    if (error) {
      alert("글 저장 실패: " + error.message);
    } else {
      // 저장 성공 시 입력창 비우고 목록 다시 불러오기
      setInputTitle("");
      setInputContent("");
      setSelectedImage(null);
      fetchPosts(); 
      alert("글이 서버에 안전하게 저장되었습니다!");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const filteredPosts = activeSub === "전체" ? posts : posts.filter(p => p.sub === activeSub);

  return (
    <div className="min-h-screen bg-[#DAE0E6] font-sans text-[#1A1A1B]">
      {/* 상단바 */}
      <nav className="sticky top-0 bg-white border-b h-12 flex items-center justify-center px-5 z-50">
        <div className="text-xl font-bold text-orange-600 flex items-center gap-1 cursor-pointer" onClick={() => setActiveSub("전체")}>
          <TrendingUp size={24}/> 판대전
        </div>
        <div className="absolute right-5 text-xs font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded-full border">
          {currentUser}
        </div>
      </nav>

      <div className="max-w-[800px] mx-auto py-5 flex gap-6 px-4">
        {/* 왼쪽 사이드바 */}
        <aside className="w-52 hidden lg:block">
          <div className="bg-white rounded p-3 border shadow-sm">
            <h2 className="text-[10px] font-bold text-gray-400 mb-3 uppercase px-2">소그룹</h2>
            <nav className="space-y-0.5">
              {["전체", "카카오", "플랜티엠", "넥슨", "네이버"].map((sub) => (
                <button key={sub} onClick={() => setActiveSub(sub)} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition ${activeSub === sub ? 'bg-gray-100 text-blue-600' : 'hover:bg-gray-50 text-gray-700'}`}>
                  <Hash size={16} /> {sub}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* 메인 피드 */}
        <main className="flex-1 space-y-4">
          <div className="bg-white p-4 rounded border shadow-sm space-y-3">
            <input type="text" value={inputSub} onChange={(e) => setInputSub(e.target.value)} className="bg-gray-100 rounded px-2 py-1 text-xs font-bold outline-none w-24" placeholder="p/그룹명" />
            <input type="text" value={inputTitle} onChange={(e) => setInputTitle(e.target.value)} placeholder="제목" className="w-full text-lg font-bold outline-none" />
            <textarea value={inputContent} onChange={(e) => setInputContent(e.target.value)} placeholder="새로운 소식이 있나요?" className="w-full text-sm outline-none min-h-[80px] resize-none" />
            
            {selectedImage && (
              <div className="relative w-20 h-20 rounded border overflow-hidden">
                <img src={selectedImage} className="w-full h-full object-cover" alt="" />
                <button onClick={() => setSelectedImage(null)} className="absolute top-0 right-0 bg-black/50 text-white p-0.5"><X size={12}/></button>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition"><ImageIcon size={20} /></button>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
              <button onClick={handlePostSubmit} className="bg-blue-600 text-white px-6 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition">
                <Send size={14} /> 게시하기
              </button>
            </div>
          </div>

          {/* 게시글 목록 */}
          <div className="space-y-3">
            {filteredPosts.length > 0 ? filteredPosts.map((post) => (
              <div key={post.id} className="bg-white rounded border shadow-sm p-4 hover:border-gray-400 transition">
                <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1 font-bold">
                  <span className="text-black uppercase">p/{post.sub}</span> • {post.author}
                </div>
                <h3 className="text-md font-bold mb-1">{post.title}</h3>
                <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{post.content}</p>
                {post.image && <img src={post.image} className="w-20 h-20 object-cover rounded border mb-3" alt="" />}
                <div className="flex items-center gap-4 text-gray-400 text-xs font-bold">
                  <div className="flex items-center gap-1.5"><Heart size={16}/> {post.likes}</div>
                  <div className="flex items-center gap-1.5"><MessageSquare size={16}/> 댓글 0</div>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-gray-400 text-sm">불러올 게시글이 없습니다.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}