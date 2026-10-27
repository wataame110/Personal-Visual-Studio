// テスト環境向け Canvas 2D コンテキストのモック。
//
// jsdom は canvas ネイティブパッケージが無い環境（CIのクリーン環境など）では
// HTMLCanvasElement.getContext('2d') が null を返し、MontageEngine の初期化が
// 「Canvas 2D context is not available」で失敗する。
// 描画結果を検証しないユニットテストでは描画APIをノーオペレーションに
// 置き換えても支障がないため、どの環境でも同一の挙動になるよう常に差し替える。

type AnyRecord = Record<string, unknown>;

const gradientStub = { addColorStop: () => undefined };

function createCtxStub(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  return new Proxy({} as AnyRecord, {
    get: (_target, prop) => {
      if (prop === 'canvas') return canvas;
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => gradientStub;
      }
      if (prop === 'measureText') {
        return () => ({ width: 0 });
      }
      if (prop === 'getImageData') {
        return () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      }
      // メソッド呼び出しは無害な関数、fillStyle 等の読み取りは関数を返すが検証対象外
      if (typeof prop === 'string') return () => undefined;
      return undefined;
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
}

const originalGetContext = HTMLCanvasElement.prototype.getContext as unknown as (
  this: HTMLCanvasElement,
  ...args: unknown[]
) => unknown;

HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: unknown[]) {
  if (args[0] === '2d') {
    return createCtxStub(this);
  }
  return originalGetContext.apply(this, args);
} as unknown as typeof HTMLCanvasElement.prototype.getContext;
