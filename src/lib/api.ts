import { invoke } from "@tauri-apps/api/core";
import type { Image, Tag } from "./types";

export const importImage = (path: string): Promise<Image> =>
  invoke("import_image", { path });

export const getImages = (tagIds: number[]): Promise<Image[]> =>
  invoke("get_images", { tagIds });

export const getTags = (): Promise<Tag[]> => invoke("get_tags");

export const addTag = (imageId: number, tagName: string): Promise<Tag> =>
  invoke("add_tag", { imageId, tagName });

export const removeTag = (imageId: number, tagId: number): Promise<void> =>
  invoke("remove_tag", { imageId, tagId });

export const renameTag = (tagId: number, newName: string): Promise<void> =>
  invoke("rename_tag", { tagId, newName });

export const deleteTag = (tagId: number): Promise<void> =>
  invoke("delete_tag", { tagId });

export const deleteImage = (imageId: number): Promise<void> =>
  invoke("delete_image", { imageId });
