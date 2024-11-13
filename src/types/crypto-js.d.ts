// 'crypto-js'モジュールの型宣言を行う
declare module 'crypto-js' {
  // SHA256関数の宣言
  // message: ハッシュ化する文字列
  // 返り値: ハッシュ化された文字列を表すオブジェクト
  export function SHA256(message: string): {
    // ハッシュ化された文字列を取得するためのメソッド
    toString(): string;
  };
}
