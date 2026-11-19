/**
 * 全局渲染错误边界。
 *
 * 上游接口随时可能返回形状变化的数据（字段缺失、数组变对象、null），
 * 前端虽然逐处加了 Array.isArray 兜底，但组件内部仍有取不到属性就抛错的可能。
 * 没有错误边界时，一处抛错会让整站白屏，用户既看不到导航也看不到原因。
 * 这里只兜住渲染期异常：展示可读提示 + 重试入口，并把错误打到 console 便于排查。
 */
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  /** 出现在提示里的页面名，便于运营反馈问题时定位。 */
  label?: string;
  /** 站点语言：错误提示同样跟随中英切换。 */
  lang?: 'zh' | 'en';
  resetKey?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 保留原始堆栈，方便从浏览器控制台定位到具体组件。
    console.error('[DOAI] 页面渲染失败', error, info.componentStack);
  }

  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    const en = this.props.lang === 'en';
    if (!error) return this.props.children;
    return (
      <div className="pt-32 pb-24 max-w-[720px] mx-auto px-6">
        <div className="rounded-3xl border border-[#F5D6B8] bg-[#FFF8F0] p-8">
          <div className="flex items-center gap-3 text-[#B2540B]">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h1 className="text-lg font-bold">
              {this.props.label
                ? en
                  ? `${this.props.label} failed to load`
                  : `${this.props.label}加载失败`
                : en
                  ? 'This page failed to load'
                  : '页面加载失败'}
            </h1>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#7A4A16]">
            {en
              ? 'Something went wrong while rendering this page, usually caused by a change in backend data shape. You can retry right away — if it keeps happening, please send the line below to the organizing committee.'
              : '页面渲染时出现异常，通常是后端数据格式变化导致的。可以直接重试；如果反复出现，请把下面这行信息反馈给组委会。'}
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-white/70 border border-[#F0DCC6] p-3 text-xs text-[#7A4A16] whitespace-pre-wrap break-all">
            {error.message || String(error)}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-5 px-5 py-2.5 text-sm font-semibold rounded-full bg-[#165DFF] text-white hover:bg-[#1453E6]"
          >
            {en ? 'Reload this page' : '重新加载此页'}
          </button>
        </div>
      </div>
    );
  }
}
