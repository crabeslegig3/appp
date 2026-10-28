import React, { useState } from 'react';
import { Server, Play, Check, Copy } from 'lucide-react';

export const BackendApiModal: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/instrument/status');
  const [responseJson, setResponseJson] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const endpoints = [
    { method: 'GET', path: '/api/instrument/status', desc: 'Telemetría de hardware SuperSting (baterías, Wi-Fi, GPS, temp)' },
    { method: 'POST', path: '/api/instrument/connect', desc: 'Enlaza socket Wi-Fi con el equipo', body: '{"action":"connect"}' },
    { method: 'POST', path: '/api/instrument/contact-test', desc: 'Test de resistencia de contacto en SwitchBox' },
    { method: 'POST', path: '/api/instrument/receiver-test', desc: 'Test de calibración de 8 canales ADC 24-bit' },
    { method: 'POST', path: '/api/instrument/ip-test', desc: 'Prueba de carga y decaimiento IP ventanas M1..M6' },
    { method: 'POST', path: '/api/instrument/sp-test', desc: 'Medición de potencial espontáneo (SP) simultáneo' },
    { method: 'GET', path: '/api/survey/config', desc: 'Parámetros actuales de geometría y survey' },
    { method: 'POST', path: '/api/survey/sequence', desc: 'Genera secuencia teórica de cuadripolos', body: '{"arrayType":"dd","electrodes":56,"spacing":5,"nMax":8}' },
    { method: 'POST', path: '/api/survey/start', desc: 'Inicia medición continua con apilado' },
    { method: 'POST', path: '/api/survey/pause', desc: 'Pausa medición en terreno' },
    { method: 'POST', path: '/api/survey/step', desc: 'Disparo manual único de 8 canales' },
    { method: 'POST', path: '/api/survey/remeasure', desc: 'Remide cuadripolos con dispersión sobre el umbral' },
    { method: 'GET', path: '/api/survey/state', desc: 'Estado completo y puntos adquiridos del survey' },
    { method: 'GET', path: '/api/files', desc: 'Lista de archivos .stg y .cmd en memoria' },
    { method: 'GET', path: '/api/files/LINEA01.stg/export?format=z2d', desc: 'Exportación .z2d con formato EarthImager 2D' },
  ];

  const testEndpoint = async (item: typeof endpoints[0]) => {
    setLoading(true);
    try {
      const opts: RequestInit = {
        method: item.method,
      };
      if (item.body) {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = item.body;
      }
      const res = await fetch(item.path, opts);
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        setResponseJson(JSON.stringify(json, null, 2));
      } catch {
        setResponseJson(text);
      }
    } catch (err: unknown) {
      setResponseJson(`Error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    testEndpoint(endpoints[0]);
  }, []);

  const copyResponse = () => {
    navigator.clipboard.writeText(responseJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start pb-20 md:pb-6">
      {/* 1. Endpoints List */}
      <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
        <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-[#141e2b]">
          <Server className="w-4 h-4 text-[#38c8f5]" />
          <h3 className="text-[12.5px] font-semibold text-[#dbe5f0]">
            Endpoints REST del Backend SuperSting Express
          </h3>
        </div>

        {/* Mobile Horizontal scroll (< lg) */}
        <div className="flex lg:hidden gap-2 overflow-x-auto pb-1 no-scrollbar">
          {endpoints.map((ep) => (
            <button
              key={ep.path + ep.method}
              onClick={() => {
                setSelectedEndpoint(ep.path);
                testEndpoint(ep);
              }}
              className={`shrink-0 px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                selectedEndpoint === ep.path
                  ? 'bg-[#0f2438] border-[#38c8f5] text-[#38c8f5] shadow-xs'
                  : 'bg-[#060a0f] border-[#162231] text-[#8497ad]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold font-mono ${
                    ep.method === 'GET' ? 'bg-[#0b3323] text-[#6ee7b7]' : 'bg-[#1b435a] text-[#38c8f5]'
                  }`}
                >
                  {ep.method}
                </span>
                <span className="font-mono text-[11px] text-[#dbe5f0]">{ep.path}</span>
              </div>
              <div className="text-[10px] text-[#6b7e94] mt-1 max-w-[180px] truncate">{ep.desc}</div>
            </button>
          ))}
        </div>

        {/* Desktop Vertical list (>= lg) */}
        <div className="hidden lg:grid gap-2 max-h-[520px] overflow-y-auto pr-1">
          {endpoints.map((ep) => (
            <div
              key={ep.path + ep.method}
              className={`p-2.5 rounded-lg border text-[12px] transition-all cursor-pointer ${
                selectedEndpoint === ep.path
                  ? 'bg-[#0f2438] border-[#38c8f5] shadow-xs'
                  : 'bg-[#060a0f] border-[#162231] hover:border-[#22354a]'
              }`}
              onClick={() => {
                setSelectedEndpoint(ep.path);
                testEndpoint(ep);
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                      ep.method === 'GET' ? 'bg-[#0b3323] text-[#6ee7b7]' : 'bg-[#1b435a] text-[#38c8f5]'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-[#dbe5f0] font-medium">{ep.path}</span>
                </div>
                <Play className="w-3 h-3 text-[#6b7e94] shrink-0" />
              </div>
              <p className="text-[#8497ad] text-[11px] leading-tight">{ep.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Response Viewer */}
      <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
        <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#141e2b]">
          <h3 className="text-[12.5px] font-semibold text-[#dbe5f0]">
            Respuesta JSON en Tiempo Real
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#8497ad] font-mono">
              {loading ? 'Consultando…' : selectedEndpoint}
            </span>
            <button
              onClick={copyResponse}
              className="p-1 text-[#8497ad] hover:text-[#dbe5f0] transition-colors cursor-pointer"
              title="Copiar JSON"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#34d399]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <pre className="h-[300px] sm:h-[400px] lg:h-[520px] overflow-auto p-3 bg-[#060a0f] border border-[#141e2b] rounded-lg text-[#38c8f5] font-mono text-[11px] sm:text-[11.5px] leading-relaxed scrollbar-thin">
          {responseJson || '// Consultando backend…'}
        </pre>
      </div>
    </div>
  );
};
