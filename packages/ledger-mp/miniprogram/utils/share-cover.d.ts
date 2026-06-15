// 类型声明（运行实现见同目录 share-cover.js）
export interface ShareCoverOpts {
  title: string
  subtitle?: string
  code?: string
}
export declare function drawShareCover(canvas: any, opts: ShareCoverOpts): Promise<string>
export declare function makeShareCover(
  ctx: any,
  selector: string,
  opts: ShareCoverOpts,
): Promise<string>
