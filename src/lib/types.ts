export interface Tag {
  id: number;
  name: string;
}

export interface Image {
  id: number;
  filepath: string;
  thumbnailPath: string;
  createdAt: string;
  tags: Tag[];
}
