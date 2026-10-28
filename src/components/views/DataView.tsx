import React, { useState } from 'react';
import { StoredFileInfo } from '../../services/api';
import { Download, Upload, FileText, HardDrive, Database } from 'lucide-react';

interface DataViewProps {
  jobName: string;
  measuredCount: number;
  isIP: boolean;
  files: StoredFileInfo[];
  onDownloadExport: (format: 'csv' | 'z2d' | 'stg' | 'json') => void;
  onUploadCmd: (filename: string, content: string) => void;
}

export const DataView: React.FC<DataViewProps> = ({
  jobName,
  measuredCount,
  isIP,
  files,
  onDownloadExport,
  onUploadCmd,
}) => {
  const maxCapacity = isIP ? 26000 : 79000;
  const memoryPct = Math.min(100, (measuredCount / maxCapacity) * 100);

  const [cmdName, setCmdName] = useState('DD_CUSTOM.cmd');
  const [cmdContent, setCmdContent] = useState(
    '# Secuencia SuperSting R8\n# A, B, M, N\n1, 2, 4, 5\n1, 2, 5, 6\n2, 3, 5, 6'
  );
  const [showCmdModal, setShowCmdModal] = useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start pb-20 md:pb-6">
      {/* 1. Memoria interna del SuperSting */}
      <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-[#141e2b]">
          <HardDrive className="w-3.5 h-3.5 text-[#38c8f5]" />
          <h3 className="text-[12.5px] font-semibold text-[#dbe5f0]">
            Memoria Flash del Equipo
          </h3>
        </div>

        <div className="h-2 bg-[#060a0f] border border-[#162130] rounded-xs overflow-hidden my-2.5">
          <div
            className="h-full bg-gradient-to-r from-[#1b435a] to-[#38c8f5] transition-all duration-300"
            style={{ width: `${memoryPct}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-[#8497ad] font-mono-numbers mb-3">
          <span>{measuredCount} / {maxCapacity.toLocaleString()} puntos</span>
          <span className="text-[#38c8f5] font-semibold">{memoryPct.toFixed(1)}% ocupado</span>
        </div>

        <h4 className="text-[10.5px] font-semibold text-[#6b7e94] mb-2 uppercase tracking-wider font-mono">
          Archivos Guardados en Memoria
        </h4>
        <div className="grid gap-1.5 max-h-[220px] overflow-y-auto pr-1">
          <div className="flex justify-between items-center py-2 px-2.5 bg-[#060a0f] border border-[#19405c] rounded-lg text-[12px]">
            <span className="font-mono text-[#38c8f5] font-medium">{jobName}.stg (activo)</span>
            <b className="font-mono-numbers text-[#dbe5f0]">{measuredCount} ptos</b>
          </div>
          {files.map((file) => (
            <div
              key={file.name}
              className="flex justify-between items-center py-2 px-2.5 bg-[#060a0f] border border-[#141e2b] rounded-lg text-[12px]"
            >
              <span className="font-mono text-[#8497ad]">{file.name}</span>
              <b className="font-mono-numbers text-[#dbe5f0]">{file.pointsCount} ptos</b>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Exportar datos para inversión geofísica */}
      <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-[#141e2b]">
          <Database className="w-3.5 h-3.5 text-[#34d399]" />
          <h3 className="text-[12.5px] font-semibold text-[#dbe5f0]">
            Exportar Formatos de Inversión
          </h3>
        </div>

        <p className="text-[11.5px] text-[#8497ad] leading-relaxed mb-3">
          Descarga los datos del survey procesados para software de inversión 2D/3D (EarthImager 2D, RES2DINV, BERT).
        </p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => onDownloadExport('z2d')}
            className="h-10 px-3 rounded-lg font-medium text-[12px] bg-[#101b27] hover:bg-[#162536] hover:border-[#38c8f5] border border-[#22354a] text-[#38c8f5] flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>EarthImager (.z2d)</span>
          </button>
          <button
            onClick={() => onDownloadExport('csv')}
            className="h-10 px-3 rounded-lg font-medium text-[12px] bg-[#101b27] hover:bg-[#162536] hover:border-[#38c8f5] border border-[#22354a] text-[#dbe5f0] flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Planilla CSV</span>
          </button>
          <button
            onClick={() => onDownloadExport('stg')}
            className="h-10 px-3 rounded-lg font-medium text-[12px] bg-[#101b27] hover:bg-[#162536] hover:border-[#38c8f5] border border-[#22354a] text-[#dbe5f0] flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Nativo AGI (.stg)</span>
          </button>
          <button
            onClick={() => onDownloadExport('json')}
            className="h-10 px-3 rounded-lg font-medium text-[12px] bg-[#101b27] hover:bg-[#162536] hover:border-[#38c8f5] border border-[#22354a] text-[#dbe5f0] flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>JSON Completo</span>
          </button>
        </div>

        <p className="text-[11px] text-[#6b7e94] leading-relaxed">
          El formato <b className="text-[#8497ad]">.z2d</b> exporta resistencia de transferencia ΔV/I en Ω con precisión exponencial de 14 dígitos, factor geométrico exacto y cabeceras compatibles con EarthImager 2D.
        </p>
      </div>

      {/* 3. Archivos de comando */}
      <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs md:col-span-2 lg:col-span-1">
        <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-[#141e2b]">
          <Upload className="w-3.5 h-3.5 text-[#38c8f5]" />
          <h3 className="text-[12.5px] font-semibold text-[#dbe5f0]">
            Archivos de Comandos (.cmd)
          </h3>
        </div>

        <p className="text-[11.5px] text-[#8497ad] leading-relaxed mb-3">
          Transfiere secuencias personalizadas de medición al SwitchBox para arreglos mixtos, roll-along o tomografía en pozos.
        </p>

        <button
          onClick={() => setShowCmdModal(true)}
          className="w-full h-9.5 rounded-lg font-medium text-[12px] bg-[#101b27] hover:bg-[#162536] hover:border-[#38c8f5] border border-[#22354a] text-[#dbe5f0] flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
        >
          <Upload className="w-4 h-4 text-[#38c8f5]" />
          <span>Cargar archivo .cmd al equipo</span>
        </button>
      </div>

      {/* Modal for Command Upload */}
      {showCmdModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0a1017] border border-[#1b2838] rounded-xl max-w-lg w-full p-4 shadow-2xl">
            <h3 className="text-[13px] font-semibold text-[#dbe5f0] pb-2 border-b border-[#141e2b]">
              Subir Archivo .cmd al SuperSting
            </h3>
            <div className="mt-3">
              <label className="block text-[11px] text-[#8497ad] mb-1 font-mono">Nombre de Archivo</label>
              <input
                type="text"
                value={cmdName}
                onChange={(e) => setCmdName(e.target.value)}
                className="w-full h-8.5 px-2.5 bg-[#060a0f] border border-[#1b2838] focus:border-[#38c8f5] rounded-lg text-[12px] font-mono text-[#dbe5f0] outline-none"
              />
            </div>
            <div className="mt-3">
              <label className="block text-[11px] text-[#8497ad] mb-1 font-mono">Secuencia Cuadripolos (A, B, M, N)</label>
              <textarea
                rows={6}
                value={cmdContent}
                onChange={(e) => setCmdContent(e.target.value)}
                className="w-full p-2.5 bg-[#060a0f] border border-[#1b2838] focus:border-[#38c8f5] rounded-lg text-[11.5px] font-mono text-[#dbe5f0] outline-none leading-relaxed"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[#141e2b]">
              <button
                onClick={() => setShowCmdModal(false)}
                className="h-8.5 px-3.5 rounded-lg text-[12px] border border-[#22354a] text-[#8497ad] hover:text-[#dbe5f0] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onUploadCmd(cmdName, cmdContent);
                  setShowCmdModal(false);
                }}
                className="h-8.5 px-4 rounded-lg text-[12px] bg-[#0e5c3e] hover:bg-[#13754f] border border-[#1d976c] text-[#e8fff5] font-medium cursor-pointer shadow-xs"
              >
                Guardar en Memoria Flash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
