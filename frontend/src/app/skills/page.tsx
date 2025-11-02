"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

type Skill = {
  id: number;
  skill_name: string;
  level: number;
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [level, setLevel] = useState(3);
  const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

  const fetchSkills = async (uid: string) => {
    const { data } = await api.get("/skills", {
      params: { userId: uid },
    });
    setSkills(data);
  };

  useEffect(() => {

   const fetchUserAndSkills = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {

        setLoading(false);
        return;
      }

      setUserId(user.id);


      await fetchSkills(user.id);
      setLoading(false);
    };

    fetchUserAndSkills();

  

  
  }, []);

  const addSkill = async () => {
    if (!newSkill.trim() || !userId) return;
    await api.post("/skills", {
      userId: userId,
      skill_name: newSkill,
      level,
    });
    setNewSkill("");
    setLevel(3);
     await fetchSkills(userId);
  };

  const removeSkill = async (id: number) => {
    if (!userId) return;
    await api.delete(`/skills?id=${id}`);
    await fetchSkills(userId);
  };

   if (loading) return <p className="p-8">読み込み中...</p>;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="max-w-3xl mx-auto py-16 px-6">
        <h1 className="text-3xl font-bold mb-6">スキル登録</h1>

        <div className="flex gap-3 mb-8">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="例: Next.js / Python / SQL"
            className="flex-1 border rounded-lg px-4 py-2 dark:bg-zinc-900"
          />
          <select
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 dark:bg-zinc-900"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                Lv.{n}
              </option>
            ))}
          </select>
          <button
            onClick={addSkill}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            追加
          </button>
        </div>

        <ul className="space-y-3">
          {skills.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between border-b pb-2"
            >
              <span>
                <b>{s.skill_name}</b>（Lv.{s.level}）
              </span>
              <button
                onClick={() => removeSkill(s.id)}
                className="text-sm text-red-500 hover:underline"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
