// 文字列をBase64エンコードする関数
export const encodeData = (data: string): string => {
  return btoa(data);
};

// Base64エンコードされた文字列をデコードする関数
export const decodeData = (encodedData: string): string => {
  return atob(encodedData);
};
