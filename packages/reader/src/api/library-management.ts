import apiClient from './api-client';

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
  const response = await apiClient.put(
    `/library/manga/${mangaId}`,
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
  const response = await apiClient.delete(`/library/manga/${mangaId}`, {
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
  const response = await apiClient.put(
    `/library/volumes/${volumeId}`,
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
  const response = await apiClient.delete(
    `/library/volumes/${volumeId}`,
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
  const response = await apiClient.post(
    `/library/volumes/${volumeId}/move`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

