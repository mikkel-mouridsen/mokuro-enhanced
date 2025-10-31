import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface UpdateMangaData {
  title?: string;
  author?: string;
  description?: string;
  status?: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
}

export interface UpdateVolumeData {
  title?: string;
  volumeNumber?: number;
  coverUrl?: string;
}

export interface MoveVolumeData {
  targetMangaId: string;
  newVolumeNumber?: number;
}

/**
 * Update manga information
 */
export async function updateManga(
  token: string,
  mangaId: string,
  data: UpdateMangaData
) {
  const response = await axios.put(
    `${API_URL}/library/manga/${mangaId}`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

/**
 * Delete a manga and all its volumes
 */
export async function deleteManga(token: string, mangaId: string) {
  const response = await axios.delete(`${API_URL}/library/manga/${mangaId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

/**
 * Update volume information
 */
export async function updateVolume(
  token: string,
  volumeId: string,
  data: UpdateVolumeData
) {
  const response = await axios.put(
    `${API_URL}/library/volumes/${volumeId}`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

/**
 * Delete a volume and all its pages
 */
export async function deleteVolume(token: string, volumeId: string) {
  const response = await axios.delete(
    `${API_URL}/library/volumes/${volumeId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

/**
 * Move a volume to a different manga
 */
export async function moveVolume(
  token: string,
  volumeId: string,
  data: MoveVolumeData
) {
  const response = await axios.post(
    `${API_URL}/library/volumes/${volumeId}/move`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

