"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { HUD_EASE, Rise, Stagger } from "@/components/motion/primitives";
import { AnalystInsignia } from "@/components/game/analyst-badge";
import { CoachInsignia } from "@/components/game/coach-badge";
import { TopBar } from "@/components/hud/top-bar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/data";
import { ANALYST } from "@/lib/engine/analyst";
import { COACHES } from "@/lib/engine/coaches";
import type { CommsAuthor, CommsMessage } from "@/lib/engine/comms";
import type { AvatarState } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

const MOODS = ["1", "2", "3", "4", "5"];

const AUTHOR_META: Record<
  Exclude<CommsAuthor, "me">,
  { name: string; codename: string }
> = {
  goggins: { name: COACHES.goggins.name, codename: COACHES.goggins.codename },
  robbins: { name: COACHES.robbins.name, codename: COACHES.robbins.codename },
  oracle: { name: ANALYST.name, codename: ANALYST.codename },
};

function AgentAvatar({ author }: { author: Exclude<CommsAuthor, "me"> }) {
  if (author === "oracle") return <AnalystInsignia size={30} />;
  return <CoachInsignia coach={COACHES[author]} size={30} />;
}

export default function CommsPage() {
  const [avatar, setAvatar] = useState<AvatarState | null>(null);
  const [messages, setMessages] = useState<CommsMessage[]>([]);
  const [text, setText] = useState("");
  const [mood, setMood] = useState(3);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    db().getAvatar().then(setAvatar);
    db().listComms().then(setMessages);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    const updated = await db().sendComms(text.trim(), mood);
    setMessages(updated);
    setText("");
    setMood(3);
    setSending(false);
  }

  if (!avatar) return <main className="min-h-dvh" />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-6 pt-6">
      <TopBar dayIndex={avatar.dayIndex} streakDays={avatar.streakDays} />

      <Stagger className="flex min-h-0 flex-1 flex-col">
        <Rise>
          <p className="hud-label mb-1">Canal sécurisé — tes trois agents écoutent</p>
          <h1 className="mb-4 font-display text-2xl font-bold uppercase tracking-wider">
            Comms
          </h1>
        </Rise>

        {/* ── FIL ── */}
        <Rise className="min-h-0 flex-1">
          <div className="space-y-3 pb-4">
            {messages.length === 0 && (
              <Panel className="p-5 text-center">
                <p className="font-mono text-xs leading-relaxed text-ink-mute">
                  Raconte ta journée, ton ressenti, ce qui a marché ou pas.
                  <br />
                  Tout est consigné — c&apos;est la mémoire de tes agents.
                </p>
              </Panel>
            )}
            {messages.map((msg) =>
              msg.author === "me" ? (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: HUD_EASE }}
                  className="ml-10"
                >
                  <div className="border border-volt/30 bg-volt-faint p-3">
                    <p className="text-sm leading-snug text-ink">{msg.text}</p>
                    {msg.mood !== undefined && (
                      <p className="mt-1.5 font-mono text-[9px] tracking-micro text-ink-mute">
                        ÉTAT {msg.mood}/5
                      </p>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.15, ease: HUD_EASE }}
                  className="mr-6 flex items-start gap-2.5"
                >
                  <div className="shrink-0 pt-1">
                    <AgentAvatar author={msg.author} />
                  </div>
                  <div className="min-w-0 border border-line bg-surface p-3">
                    <p className="hud-label mb-1">
                      {AUTHOR_META[msg.author].codename}
                    </p>
                    <p className="text-sm leading-snug text-ink-dim">
                      {msg.text}
                    </p>
                  </div>
                </motion.div>
              ),
            )}
            <div ref={endRef} />
          </div>
        </Rise>

        {/* ── SAISIE ── */}
        <Rise>
          <Panel className="space-y-3 p-3">
            <div className="flex items-center gap-2">
              <span className="hud-label shrink-0">État</span>
              <div className="grid flex-1 grid-cols-5 gap-1">
                {MOODS.map((m, i) => {
                  const val = i + 1;
                  const selected = mood === val;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMood(val)}
                      className={cn(
                        "h-8 border font-mono text-xs font-bold transition-colors tabular",
                        selected
                          ? val <= 2
                            ? "border-danger bg-danger/15 text-danger"
                            : "border-volt bg-volt-faint text-volt"
                          : "border-line text-ink-mute hover:border-line-bright",
                      )}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Journée en mer épuisante, mal dormi, mais séance tenue…"
              className="w-full resize-none border border-line bg-void p-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-volt"
            />
            <Button
              size="md"
              className="w-full"
              disabled={!text.trim() || sending}
              onClick={send}
            >
              Transmettre
            </Button>
          </Panel>
        </Rise>

        <Rise className="pt-3">
          <Link href="/" className="block">
            <Button variant="ghost" size="sm" className="w-full" tabIndex={-1}>
              ← Retour au QG
            </Button>
          </Link>
        </Rise>
      </Stagger>
    </main>
  );
}
