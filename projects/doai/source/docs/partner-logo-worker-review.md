# PartnerLogo 主线程性能复评整改

对应退回提交：56acb58 / 85fc35f。旧实现仍在 UI 线程读取像素并遍历去底、裁边；仅修改结果页不能解决该 P2。

## 本次实现

- `src/components/common/PartnerLogo.tsx` 只观察可见区域、发起异步请求和展示图片。SVG 直接使用原矢量图，位图等待期间显示原图。
- `src/lib/partnerLogo.ts` 负责单个共享 Worker、按素材 URL 去重、回执分发及 Blob URL 缓存；没有像素读取、Canvas 绘制、裁边或编码。
- `src/lib/partnerLogo.worker.ts` 在独立 Worker 内 fetch、createImageBitmap 解码、OffscreenCanvas 像素处理和 PNG 编码。任务串行执行，结束后关闭 ImageBitmap，避免同时解码整面 Logo 墙。
- Worker 不支持、资源加载失败或处理失败时保留原图；不使用主线程 Canvas/OffscreenCanvas 回退。源码未修改已有品牌素材和分类。

## 本轮复现与实测

```sh
npm run lint
BASE=/doai/ npm run build
node scripts/verify_partner_logos_flow.mjs
node scripts/verify_partner_logo_performance.mjs
```

浏览器需要本机 Chrome；CHROME_PATH 可指定路径。测试自行创建本地静态服务器并模拟 API，不连接生产业务写接口。

测试通过覆盖：

- 65 个 Logo，49 个位图经 Worker 处理、16 个 SVG 保持矢量；中英文、2x 桌面及 3x 手机布局正常。
- 主线程禁止 CanvasRenderingContext2D.getImageData、HTMLCanvasElement.toBlob 及 OffscreenCanvas.getContext 后，适配仍成功；相关主线程调用数为 0。
- Worker 不支持、Worker 文件返回 503 时全部位图显示原图，无主线程像素处理或页面异常。
- 本轮 Long Tasks API 实测报告在 `partner-logo-worker-performance.json`。常速和 CDP 主线程 4 倍 CPU 降速场景均记录到 0 个主线程长任务（该 API 只报告 >=50ms 的任务，不代表主线程耗时绝对为 0）。
- 性能脚本对 Logo 滚动区间设置最大主线程长任务 <200ms 的项目回归预算；不将它当作 INP 或整站性能评分。

本轮数据采集于报告 measuredAt，对象是本地生产构建滚动遍历 Logo 时的主线程长任务；未引用旧轮 384ms / 2169ms。CPU 降速仅作用于 renderer 主线程，不代表 Worker 或整台设备也降速。wallMs 包含 Worker、图片异步加载、测试轮询等，不能用来比较 CPU 降速前后的处理速度。未采集完整 DevTools CPU trace，也未重新测量旧版函数耗时，因此不计算与旧轮的改善百分比。

当前只更新候选分支，不修改 main/release，不执行生产发布、数据库迁移或发布请示。主站40项、构建辅助5项等为上一轮复评结果，本轮不将其冒认为重跑。
