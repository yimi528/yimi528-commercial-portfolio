import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { AlertTriangle, Camera, CameraOff, CheckCircle2, MapPin, RefreshCw, ScanLine, Search, TicketCheck } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { checkinCode, loadCheckins, type CheckinRecord } from '../../lib/checkinApi';
import { useApp } from '../../context/AppContext';

export const CheckinPanel: React.FC = () => {
  const { tr, reloadForumStats } = useApp();
  const [code, setCode] = useState('');
  const [gate, setGate] = useState('主入口');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'dup' | 'err'; text: string; record?: CheckinRecord } | null>(null);
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<CheckinRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [scanError, setScanError] = useState('');
  const [retryCode, setRetryCode] = useState('');
  const mounted = useRef(true);
  const pending = useRef(false);
  const cameraPending = useRef(false);
  const cameraVersion = useRef(0);
  const readVersion = useRef(0);
  const gateRef = useRef(gate); gateRef.current = gate;
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastCode = useRef('');

  const loadRecords = useCallback(async () => {
    const version = ++readVersion.current;
    const isCurrent = () => mounted.current && version === readVersion.current;
    setRecordsLoading(true); setRecordsError(false);
    try {
      const rows = await loadCheckins();
      if (isCurrent()) setRecords(rows);
    } catch { if (isCurrent()) setRecordsError(true); }
    finally { if (isCurrent()) setRecordsLoading(false); }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (window.matchMedia('(min-width: 768px)').matches) inputRef.current?.focus();
    void loadRecords();
    return () => {
      mounted.current = false; ++readVersion.current; ++cameraVersion.current;
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, [loadRecords]);

  const doCheckin = async (rawCode: string): Promise<boolean> => {
    const target = rawCode.trim();
    if (!target || pending.current || !mounted.current) return false;
    pending.current = true; setSubmitting(true); setFeedback(null);
    try {
      const record = await checkinCode(target, gateRef.current);
      void reloadForumStats();
      if (!mounted.current) return false;
      ++readVersion.current;
      setRecords(previous => [record, ...previous.filter(row => row.code !== record.code)]);
      setFeedback({ kind: 'ok', text: tr('签到成功，可以入场', 'Checked in. Ready to enter.'), record });
      setRetryCode('');
      void loadRecords();
      return true;
    } catch (error) {
      if (!mounted.current) return false;
      const duplicate = error instanceof ApiError && error.status === 409;
      setFeedback({ kind: duplicate ? 'dup' : 'err', text: error instanceof Error ? error.message : tr('核销失败，请重试', 'Check-in failed. Please retry.') });
      if (duplicate) { void loadRecords(); void reloadForumStats(); }
      return false;
    } finally { pending.current = false; if (mounted.current) setSubmitting(false); }
  };
  const checkinRef = useRef(doCheckin); checkinRef.current = doCheckin;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const target = code.trim();
    if (await doCheckin(target) && mounted.current) {
      setCode(previous => previous.trim() === target ? '' : previous);
      requestAnimationFrame(() => { if (mounted.current) inputRef.current?.focus(); });
    }
  };
  const stopScan = () => {
    ++cameraVersion.current; cameraPending.current = false;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    lastCode.current = ''; setRetryCode(''); setScanning(false); setStarting(false);
  };
  const startScan = async () => {
    if (cameraPending.current || streamRef.current) return;
    const version = ++cameraVersion.current;
    cameraPending.current = true; setStarting(true); setScanError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (!mounted.current || cameraVersion.current !== version) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream; setScanning(true);
    } catch {
      if (mounted.current && cameraVersion.current === version) setScanError(tr('无法访问摄像头，请检查授权或改用扫码枪、手动输入。', 'Camera unavailable. Check permission or use a scanner or manual entry.'));
    } finally {
      if (mounted.current && cameraVersion.current === version) { cameraPending.current = false; setStarting(false); }
    }
  };

  useEffect(() => {
    if (!scanning || !videoRef.current || !streamRef.current) return;
    const version = cameraVersion.current, video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {
      if (mounted.current && cameraVersion.current === version) { stopScan(); setScanError(tr('摄像头画面无法播放，请重试或手动输入。', 'Camera playback failed. Retry or enter the code manually.')); }
    });
    const interval = window.setInterval(() => {
      const canvas = canvasRef.current;
      if (pending.current || !canvas || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;
      context.drawImage(video, 0, 0);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      const hit = jsQR(frame.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
      if (!hit?.data || hit.data === lastCode.current) return;
      lastCode.current = hit.data;
      const target = hit.data;
      void checkinRef.current(target).then(ok => {
        if (mounted.current && cameraVersion.current === version) setRetryCode(ok ? '' : target);
      });
    }, 250);
    return () => window.clearInterval(interval);
  }, [scanning]);

  const formatTime = (time: string) => new Intl.DateTimeFormat(tr('zh-CN', 'en-GB'), {
    timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(time));
  const gateLabel = (value: string) => value === '主入口' ? tr('主入口', 'Main entrance') : value === '德必大虹桥园区' ? tr('德必大虹桥园区会场', 'Dobe Greater Hongqiao Park') : value === '乐动虹桥' ? tr('乐动虹桥会场', 'LeDong Hongqiao') : value;
  const search = query.trim().toLocaleLowerCase();
  const visibleRecords = records.filter(record => !search || [record.holder, record.code, record.gate, gateLabel(record.gate)].some(value => value.toLocaleLowerCase().includes(search)));
  const controlClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#165DFF] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const cameraLabel = starting ? tr('取消开启摄像头', 'Cancel camera') : scanning ? tr('关闭摄像头', 'Stop camera') : tr('开启摄像头扫码', 'Scan with camera');

  return <div className="pt-6 space-y-6 max-w-5xl">
    <section aria-label={tr('验票签到工作台', 'Check-in desk')} className="overflow-hidden rounded-2xl border border-[#DFE7F3] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8EDF5] bg-[#F7F9FD] px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#165DFF]" />
          <div><label htmlFor="checkin-gate" className="block text-sm font-semibold text-[#0B1B3A]">{tr('当前签到地点', 'Check-in location')}</label><p className="mt-1 text-xs text-[#6B7C9B]">{tr('请先确认地点，每次签到都会记录在此。', 'Confirm the location before checking in attendees.')}</p></div>
        </div>
        <select id="checkin-gate" disabled={submitting} value={gate} onChange={event => setGate(event.target.value)} className={`w-full rounded-lg border border-[#D4DEEE] bg-white px-3 py-2.5 text-sm font-medium text-[#0B1B3A] sm:w-auto ${controlClass}`}>
          <option value="主入口">{gateLabel('主入口')}</option><option value="德必大虹桥园区">{gateLabel('德必大虹桥园区')}</option><option value="乐动虹桥">{gateLabel('乐动虹桥')}</option>
        </select>
      </div>
      <div className="grid md:grid-cols-2">
        <div className="border-b border-[#E8EDF5] p-5 sm:p-6 md:border-b-0 md:border-r">
          <div className="mb-4 flex items-center gap-2"><Camera className="h-4 w-4 text-[#165DFF]" /><h3 className="text-sm font-semibold text-[#0B1B3A]">{tr('摄像头扫码', 'Camera scan')}</h3></div>
          <div className={`relative flex min-h-48 items-center justify-center overflow-hidden rounded-xl ${scanning ? 'bg-[#0B1B3A]' : 'border border-dashed border-[#C8D6EC] bg-[#F7F9FD]'}`}>
            {scanning ? <><video ref={videoRef} muted playsInline aria-label={tr('扫码摄像头画面', 'Camera preview')} className="block h-48 w-full object-contain" /><div aria-hidden="true" className="pointer-events-none absolute inset-9 rounded-xl border-2 border-white/60" /></> : <div className="px-4 py-6 text-center"><ScanLine className="mx-auto mb-3 h-10 w-10 text-[#165DFF]" /><p className="text-sm font-medium text-[#0B1B3A]">{starting ? tr('正在等待摄像头授权…', 'Waiting for camera permission…') : tr('请参会者出示入场二维码', 'Ask the attendee to show their pass QR code')}</p><p className="mt-2 text-xs leading-5 text-[#6B7C9B]">{tr('开启摄像头后，对准二维码即可自动验票签到', 'Turn on the camera and scan the code to check in automatically')}</p></div>}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <button type="button" onClick={scanning || starting ? stopScan : () => void startScan()} className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${scanning || starting ? 'border border-[#D4DEEE] bg-white text-[#0B1B3A] hover:bg-[#F7F9FD]' : 'bg-[#165DFF] text-white hover:bg-[#0E4ED9]'} ${controlClass}`}>
            {scanning ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}{cameraLabel}
          </button>
          {scanning && <p className="mt-3 text-center text-xs text-[#6B7C9B]">{tr('正在识别二维码，签到结果将显示在下方', 'Scanning. Check-in results will appear below.')}</p>}
          {scanError && <p role="alert" className="mt-3 text-sm leading-6 text-red-700">{scanError}</p>}
        </div>
        <form onSubmit={submit} aria-label="现场验票签到" className="flex flex-col p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2"><ScanLine className="h-4 w-4 text-[#165DFF]" /><h3 className="text-sm font-semibold text-[#0B1B3A]">{tr('扫码枪 / 手动输入', 'Scanner / manual entry')}</h3></div>
          <p className="mb-5 text-sm leading-6 text-[#6B7C9B]">{tr('点击输入框后使用扫码枪，或输入参会者的入场凭证码。', 'Focus the field and use a scanner, or enter the attendee’s pass code.')}</p>
          <label htmlFor="checkin-code" className="mb-2 text-xs font-semibold text-[#0B1B3A]">{tr('入场凭证码', 'Pass code')}</label>
          <input ref={inputRef} id="checkin-code" autoComplete="off" spellCheck={false} disabled={submitting} value={code} onChange={event => setCode(event.target.value)} maxLength={96} placeholder={tr('扫描或输入凭证码', 'Scan or enter pass code')} className={`min-h-12 w-full min-w-0 rounded-lg border border-[#C8D6EC] bg-white px-3 py-3 text-sm text-[#0B1B3A] placeholder:text-[#8795AD] ${controlClass}`} />
          <button type="submit" disabled={submitting || !code.trim()} className={`mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#165DFF] bg-white px-4 py-2.5 text-sm font-semibold text-[#165DFF] enabled:hover:bg-[#F0F5FF] ${controlClass}`}><TicketCheck className="h-4 w-4" />{submitting ? tr('正在验票…', 'Checking pass…') : tr('验票并签到', 'Verify & check in')}</button>
          <p className="mt-3 text-xs leading-5 text-[#6B7C9B]">{tr('支持回车提交，签到成功后可继续扫描下一位。', 'Press Enter to submit. After success, scan the next attendee.')}</p>
          <div className="mt-auto pt-5"><p className="border-t border-[#E8EDF5] pt-4 text-xs leading-5 text-[#6B7C9B]">{tr('仅有效且未签到的凭证可完成签到，重复扫描会提示处理结果。', 'Only valid, unused passes can check in. Repeat scans show the result.')}</p></div>
        </form>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className={`border-t px-5 py-5 sm:px-6 ${submitting ? 'border-[#DFE7F3] bg-[#F0F5FF]' : feedback?.kind === 'ok' ? 'border-[#BBE6D7] bg-[#F0FAF5]' : feedback ? 'border-[#F0D6B1] bg-[#FFFAF2]' : 'border-[#E8EDF5] bg-[#FAFBFD]'}`}>
        {submitting ? <div className="flex items-center gap-3 text-[#165DFF]"><ScanLine className="h-6 w-6 shrink-0" /><div><p className="text-base font-semibold">{tr('正在核验凭证…', 'Verifying pass…')}</p><p className="mt-1 text-xs">{tr('请等待核验结果', 'Please wait for the result')}</p></div></div> : feedback ? <div className="flex items-start gap-3">
          {feedback.kind === 'ok' ? <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-[#008060]" /> : <AlertTriangle className="mt-0.5 h-7 w-7 shrink-0 text-[#A65C00]" />}
          <div className="min-w-0 flex-1"><p className={`text-lg font-bold ${feedback.kind === 'ok' ? 'text-[#007052]' : 'text-[#8A4A00]'}`}>{feedback.kind === 'ok' ? feedback.text : feedback.kind === 'dup' ? tr('该凭证已签到', 'Pass already checked in') : tr('未完成签到', 'Check-in not completed')}</p>
            {feedback.record ? <><p className="mt-1 break-words text-base font-semibold text-[#0B1B3A]">{feedback.record.holder || tr('未提供持票人姓名', 'Holder name unavailable')}</p><p className="mt-1 text-xs leading-5 text-[#526581]">{gateLabel(feedback.record.gate)} · {formatTime(feedback.record.time)} {tr('（北京时间）', '(Beijing time)')}</p><p className="mt-1 break-all font-mono text-xs text-[#526581]">{feedback.record.code}</p></> : <><p className="mt-1 break-words text-sm text-[#8A4A00]">{feedback.text}</p><p className="mt-2 text-xs leading-5 text-[#6B7C9B]">{feedback.kind === 'dup' ? tr('请核对下方签到记录，确认是否已入场。', 'Review the records below to confirm previous entry.') : tr('请核对凭证码；如遇网络问题，可刷新记录确认后重试。', 'Check the pass code. For network issues, refresh records before retrying.')}</p></>}
            {retryCode && <button type="button" disabled={submitting} onClick={() => void doCheckin(retryCode)} className={`mt-3 min-h-11 rounded-lg border border-[#C8D6EC] bg-white px-4 py-2 text-sm font-semibold text-[#0B1B3A] ${controlClass}`}>{tr('重试识别的凭证', 'Retry scanned pass')}</button>}
          </div>
        </div> : <div className="flex items-center gap-3 text-[#6B7C9B]"><TicketCheck className="h-6 w-6 shrink-0" /><div><p className="text-sm font-semibold text-[#0B1B3A]">{tr('等待验票', 'Ready to check in')}</p><p className="mt-1 text-xs leading-5">{tr('扫描或输入凭证，核验结果将在这里显示。', 'Scan or enter a pass to see the verification result here.')}</p></div></div>}
      </div>
    </section>
    <section aria-label={tr('签到记录', 'Check-in records')} className="overflow-hidden rounded-2xl border border-[#DFE7F3] bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-5 sm:px-6"><div><h3 className="text-base font-bold text-[#0B1B3A]">{tr('签到记录', 'Check-in records')}{!recordsLoading && !recordsError && <span className="ml-2 text-sm font-normal text-[#6B7C9B]">{tr(`已加载 ${records.length} 条`, `${records.length} loaded`)}</span>}</h3><p className="mt-1 text-xs text-[#6B7C9B]">{tr('各签到地点的记录，时间均为北京时间。', 'Records across locations. All times are Beijing time.')}</p></div><button type="button" disabled={recordsLoading} onClick={() => void loadRecords()} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#165DFF] hover:bg-[#F0F5FF] ${controlClass}`}><RefreshCw className="h-3.5 w-3.5" />{recordsLoading ? tr('正在刷新…', 'Refreshing…') : tr('刷新记录', 'Refresh records')}</button></div>
      {records.length > 0 && <div className="px-5 pb-4 sm:px-6"><div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-[#6B7C9B]" /><input type="search" aria-label={tr('搜索签到记录', 'Search check-in records')} value={query} onChange={event => setQuery(event.target.value)} placeholder={tr('搜索持票人、凭证码或签到地点', 'Search holder, pass code or location')} className={`min-h-10 w-full rounded-lg border border-[#DFE7F3] bg-[#FAFBFD] py-2 pl-9 pr-3 text-sm ${controlClass}`} /></div>{search && <p role="status" className="mt-2 text-xs text-[#6B7C9B]">{tr(`在已加载记录中找到 ${visibleRecords.length} 条`, `${visibleRecords.length} matches in loaded records`)}</p>}</div>}
      {recordsLoading && <p role="status" className="border-t border-[#E8EDF5] p-6 text-sm text-[#6B7C9B]">{tr('正在读取签到记录…', 'Loading check-in records…')}</p>}
      {recordsError && <div role="status" className="space-y-3 border-t border-[#E8EDF5] p-6 text-sm text-red-700"><p>{tr('签到记录暂时无法加载，请重试。', 'Check-in records could not be loaded. Please retry.')}</p><button type="button" onClick={() => void loadRecords()} className={`min-h-11 rounded-lg border border-[#DFE7F3] px-4 py-2 text-sm ${controlClass}`}>{tr('重新加载签到记录', 'Reload check-in records')}</button></div>}
      {!recordsLoading && !recordsError && records.length === 0 && <div className="border-t border-[#E8EDF5] px-5 py-9 text-center"><TicketCheck className="mx-auto mb-3 h-7 w-7 text-[#8795AD]" /><p className="text-sm font-medium text-[#0B1B3A]">{tr('还没有签到记录', 'No check-ins yet')}</p><p className="mt-2 text-xs text-[#6B7C9B]">{tr('完成第一位参会者的验票后，记录会显示在这里。', 'Records will appear here after the first attendee checks in.')}</p></div>}
      {records.length > 0 && <div className="divide-y divide-[#E8EDF5] border-t border-[#E8EDF5] sm:hidden">{visibleRecords.map(record => <article key={record.code + record.time} className="px-5 py-4"><div className="flex items-start justify-between gap-3"><p className="min-w-0 break-words text-sm font-semibold text-[#0B1B3A]">{record.holder || '—'}</p><span className="inline-flex shrink-0 items-center gap-1 text-xs text-[#008060]"><CheckCircle2 className="h-3.5 w-3.5" />{tr('已签到', 'Checked in')}</span></div><p className="mt-2 break-all font-mono text-xs text-[#526581]">{record.code}</p><div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-[#6B7C9B]"><span>{gateLabel(record.gate)}</span><time dateTime={record.time}>{formatTime(record.time)}</time></div></article>)}{visibleRecords.length === 0 && <p className="px-5 py-8 text-center text-sm text-[#6B7C9B]">{tr('未找到匹配记录，请尝试姓名、凭证码或其他地点。', 'No matches. Try a name, pass code or another location.')}</p>}</div>}
      {records.length > 0 && <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-y border-[#E8EDF5] bg-[#F7F9FD] text-xs text-[#526581]"><tr>{[tr('持票人', 'Holder'), tr('入场凭证码', 'Pass code'), tr('签到地点', 'Location'), tr('签到时间', 'Check-in time')].map(label => <th scope="col" key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{visibleRecords.map(record => <tr key={record.code + record.time} className="border-b border-[#EEF2F8] last:border-0"><td className="px-5 py-4 font-medium text-[#0B1B3A]">{record.holder || '—'}</td><td className="max-w-52 break-all px-5 py-4 font-mono text-xs text-[#526581]">{record.code}</td><td className="px-5 py-4 text-[#526581]">{gateLabel(record.gate)}</td><td className="whitespace-nowrap px-5 py-4 text-xs tabular-nums text-[#526581]"><time dateTime={record.time}>{formatTime(record.time)}</time></td></tr>)}{visibleRecords.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-[#6B7C9B]">{tr('未找到匹配记录，请尝试姓名、凭证码或其他地点。', 'No matches. Try a name, pass code or another location.')}</td></tr>}</tbody></table></div>}
    </section>
  </div>;
};
