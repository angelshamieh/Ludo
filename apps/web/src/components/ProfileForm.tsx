'use client';
import { useState } from 'react';
const AVATARS = ['🐱','🦊','🐼','🦁','🐻','🐨','🐯','🐶','🦄','🐢'];

export function ProfileForm({ initial, onSave }: {
  initial?: { name: string; avatar: string };
  onSave: (p: { name: string; avatar: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [avatar, setAvatar] = useState(initial?.avatar ?? '🐱');
  return (
    <form
      className="flex flex-col gap-3 w-full max-w-sm"
      onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave({ name: name.trim(), avatar }); }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm">Your name</span>
        <input
          autoFocus
          required
          minLength={1}
          maxLength={20}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-3 py-3 rounded-xl border border-edge bg-white"
        />
      </label>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="text-sm mb-1">Avatar</legend>
        {AVATARS.map((a) => (
          <button
            key={a} type="button" onClick={() => setAvatar(a)}
            className={`w-12 h-12 rounded-full border-2 text-2xl flex items-center justify-center
              ${avatar === a ? 'border-ink bg-white' : 'border-edge bg-paper'}`}
          >{a}</button>
        ))}
      </fieldset>
      <button type="submit" className="bg-ink text-paper py-3 rounded-xl font-medium">Continue</button>
    </form>
  );
}
