import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Activity, RefreshCw, X, CheckCircle2, AlertTriangle, XCircle, Clock, Server, Zap, Cpu } from 'lucide-react';
import { runBackendDiagnostic, DiagnosticReport, DiagnosticItem } from '../services/backendHealthInspector';
import { useTranslation } from '../contexts/LanguageContext';
import Portal from './Portal';

interface BackendHealthInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackendHealthInspectorModal: React.FC<BackendHealthInspectorModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const { language } = useTranslation();
  const isRtl = (language === 'ku' || language === 'badini');

  const startScan = async () => {
    setIsRunning(true);
    const finalReport = await runBackendDiagnostic((updatedItem) => {
      setReport((prev) => {
        if (!prev) {
          return {
            timestamp: new Date().toISOString(),
            overallStatus: 'healthy',
            items: [updatedItem]
          };
        }
        const updatedItems = prev.items.map(i => i.id === updatedItem.id ? updatedItem : i);
        if (!updatedItems.some(i => i.id === updatedItem.id)) {
          updatedItems.push(updatedItem);
        }
        return {
          ...prev,
          items: updatedItems
        };
      });
    });
    setReport(finalReport);
    setIsRunning(false);
  };

  useEffect(() => {
    if (isOpen) {
      startScan();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderStatusIcon = (status: DiagnosticItem['status']) => {
    switch (status) {
      case 'testing':
        return <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-zinc-500" />;
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/80 backdrop-blur-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-zinc-950/90 border border-red-500/30 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl overflow-hidden backdrop-blur-3xl"
        >
          {/* Header */}
          <div className={`flex items-center justify-between pb-6 border-b border-white/10 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
            <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-2xl">
                <Activity className="w-7 h-7 text-red-500 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-[1000] text-white uppercase tracking-tight italic">
                  {isRtl ? 'سیستەمی پشکنینی باکێند' : 'Backend Health Inspector'}
                </h2>
                <p className="text-xs text-zinc-400 font-medium tracking-wider uppercase mt-1">
                  {isRtl ? 'دۆزینەوەی ئۆتۆماتیکیی کێشەکانی ژێرنووس و باکێند' : 'Automated Diagnostic & Issue Detection for Subtitles'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Diagnostic Controls & Overall Badge */}
          <div className={`my-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <Server className="w-5 h-5 text-red-400" />
              <span className="text-sm font-bold text-zinc-300">
                {isRtl ? 'بارودۆخی گشتیی باکێند:' : 'Overall System Status:'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                report?.overallStatus === 'healthy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                report?.overallStatus === 'degraded' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {report?.overallStatus === 'healthy' ? (isRtl ? 'بێ کێشە (100%)' : 'Healthy (100%)') :
                 report?.overallStatus === 'degraded' ? (isRtl ? 'ئاگاداری (Degraded)' : 'Degraded') :
                 (isRtl ? 'کێشە دۆزرایەوە (Critical)' : 'Critical Issue Detected')}
              </span>
            </div>

            <button
              onClick={startScan}
              disabled={isRunning}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/30"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              {isRtl ? 'تستکردنەوەی باکێند' : 'Re-Run Diagnostic'}
            </button>
          </div>

          {/* List of Services */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {report?.items.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  item.status === 'success' ? 'bg-emerald-950/10 border-emerald-500/20' :
                  item.status === 'warning' ? 'bg-amber-950/10 border-amber-500/20' :
                  item.status === 'error' ? 'bg-red-950/20 border-red-500/40' :
                  'bg-zinc-900/50 border-white/5'
                } ${isRtl ? 'text-right' : 'text-left'}`}
              >
                <div className={`flex items-center justify-between gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    {renderStatusIcon(item.status)}
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {isRtl ? item.nameKu : item.name}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {isRtl ? item.messageKu || item.message : item.message}
                      </p>
                    </div>
                  </div>

                  {item.latencyMs !== undefined && (
                    <span className="text-[10px] font-mono font-bold text-zinc-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10 flex-shrink-0">
                      {item.latencyMs} ms
                    </span>
                  )}
                </div>

                {item.details && (
                  <div className="mt-2 text-[11px] font-mono text-zinc-500 bg-black/40 p-2 rounded-lg truncate border border-white/5">
                    {item.details}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div className={`mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-red-500" />
              {isRtl ? 'دۆزینەوەی بەردەوامی کێشەکانی ژێرنووس' : 'Continuous Automated Diagnostic System'}
            </span>
            <span className="font-mono text-[10px]">
              {report?.timestamp ? new Date(report.timestamp).toLocaleTimeString() : ''}
            </span>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
};

export default BackendHealthInspectorModal;
