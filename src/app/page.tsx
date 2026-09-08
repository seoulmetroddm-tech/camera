"use client";

import { useRouter } from "next/navigation";
import LayoutPicker from "@/components/LayoutPicker";
import { useAppStore } from "@/lib/store";

export default function HomePage() {
  const router = useRouter();
  const itemName = useAppStore((s) => s.itemName);
  const layout = useAppStore((s) => s.layout);
  const setMeta = useAppStore((s) => s.setMeta);
  const setLayout = useAppStore((s) => s.setLayout);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-5 py-8">
      <header>
        <div className="flex justify-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/images/logo.png`}
            alt="서울교통공사"
            className="h-10 w-auto"
          />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">유실물 촬영 도우미</h1>
        <p className="mt-2 text-sm text-slate-600">
          사진을 찍고 배경 제거·개인정보 가림·여러 장 합치기를 한 번에 끝냅니다. 모든 처리는 이
          기기 안에서만 이뤄지고, 사진은 어디로도 전송되지 않습니다.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">접수 정보</h2>
        <p className="mt-1 text-xs text-slate-500">저장할 파일 이름에 사용됩니다. 비워둬도 됩니다.</p>
        <label className="mt-4 block">
          <span className="text-xs font-medium text-slate-600">품목명</span>
          <input
            value={itemName}
            onChange={(e) => setMeta({ itemName: e.target.value })}
            placeholder="예: 검정 지갑"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
          />
        </label>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">사진 배치</h2>
        <p className="mt-1 text-xs text-slate-500">
          몇 장을 한 파일로 합칠지 고릅니다. 나중에 바꿔도 찍은 사진은 그대로 남습니다.
        </p>
        <div className="mt-4">
          <LayoutPicker value={layout} onChange={setLayout} />
        </div>
      </section>

      <button
        type="button"
        onClick={() => router.push("/board")}
        className="mt-auto w-full rounded-xl bg-slate-900 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
      >
        촬영 시작
      </button>
    </main>
  );
}
