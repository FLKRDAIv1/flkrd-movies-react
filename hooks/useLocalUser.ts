import { useState, useEffect } from 'react';

// A collection of fun, cinematic anonymous nicknames
const ANONYMOUS_NICKNAMES = [
  'Cinephile', 'FilmBuff', 'MovieFan', 'PopcornLover', 'Director', 
  'Scriptwriter', 'CameraOperator', 'Gaffer', 'FoleyArtist', 
  'Projectionist', 'FilmCritic', 'Hollywood', 'Screenplay', 'BoxOffice'
];

export const useLocalUser = () => {
  const [localUserId, setLocalUserId] = useState<string>(() => {
    try {
      return localStorage.getItem('local_user_id') || '';
    } catch {
      return '';
    }
  });

  const [localUserName, setLocalUserName] = useState<string>(() => {
    try {
      return localStorage.getItem('local_user_name') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      // 1. Resolve UUID
      let id = localStorage.getItem('local_user_id');
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('local_user_id', id);
      }
      setLocalUserId(id);

      // 2. Resolve or generate a persistent username
      let name = localStorage.getItem('local_user_name');
      if (!name) {
        const randomIndex = Math.floor(Math.random() * ANONYMOUS_NICKNAMES.length);
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        name = `${ANONYMOUS_NICKNAMES[randomIndex]}-${randomNum}`;
        localStorage.setItem('local_user_name', name);
      }
      setLocalUserName(name);
    } catch (e) {
      console.error('Failed to initialize local user session:', e);
    }
  }, []);

  // Provide a function to update the user's nickname if they want to personalize it
  const updateLocalUserName = (newName: string) => {
    try {
      const trimmed = newName.trim();
      if (trimmed) {
        localStorage.setItem('local_user_name', trimmed);
        setLocalUserName(trimmed);
      }
    } catch (e) {
      console.error('Failed to update local user name:', e);
    }
  };

  return { localUserId, localUserName, updateLocalUserName };
};
