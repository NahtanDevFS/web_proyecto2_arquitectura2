import { useState, useRef, useEffect } from 'react';
import './Bluetooth.css';
import Swal from 'sweetalert2';


export default function Bluetooth() {
  const [output, setOutput] = useState('');
  const [port, setPort]     = useState(null);
  const [writer, setWriter] = useState(null);
  const [line1,  setLine1]  = useState('');
  const [line2,  setLine2]  = useState('');

  // 3 estados para cada “terminal”
  const [tempLog, setTempLog]   = useState('');
  const [distLog, setDistLog]   = useState('');
  const [ldrLog, setLdrLog]     = useState('');

  // 3 refs, uno por cada textarea
  const tempRef = useRef(null);
  const distRef = useRef(null);
  const ldrRef  = useRef(null);

   // Función para sanear texto para el LCD para que indique cuando tildes o ñ
   const sanitizeLCDText = (text) => {
    const map = {
      'Á':'A','á':'a','É':'E','é':'e',
      'Í':'I','í':'i','Ó':'O','ó':'o',
      'Ú':'U','ú':'u','Ñ':'N','ñ':'n',
      'Ü':'U','ü':'u'
    };
    let s = text.replace(/[ÁáÉéÍíÓóÚúÑñÜü]/g, c => map[c]);
    return s.replace(/[^ -~]/g, '');
  };

  // Cada vez que cambie tempLog auto-scroll
  useEffect(() => {
    if (tempRef.current) {
      tempRef.current.scrollTop = tempRef.current.scrollHeight;
      // para scroll suave: 
      // tempRef.current.scrollTo({ top: tempRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [tempLog]);

  // Igual para distancia
  useEffect(() => {
    if (distRef.current) {
      distRef.current.scrollTop = distRef.current.scrollHeight;
    }
  }, [distLog]);

  // Y para LDR
  useEffect(() => {
    if (ldrRef.current) {
      ldrRef.current.scrollTop = ldrRef.current.scrollHeight;
    }
  }, [ldrLog]);

  const connect = async () => {
    try {
      const selectedPort = await navigator.serial.requestPort();
      await selectedPort.open({ baudRate: 9600 });
      setPort(selectedPort);

      // lector
      const textDecoder = new TextDecoderStream();
      selectedPort.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();

      reader.read().then(function pump({ value, done }) {
        if (done) return;
        if (value) {
          // dividimos por saltos de línea
          const lines = value.split(/\r?\n/);
          lines.forEach(line => {
            if (line.startsWith('T:') && line.includes(' D:')) {
              // separamos justo donde empieza " D:"
              const [tPart, dRest] = line.split(' D:');
              const dPart = 'D:' + dRest;
              setTempLog(prev => prev + tPart + '\n');
              setDistLog(prev => prev + dPart + '\n');
            }
            else if (line.startsWith('LDR:')) {
              setLdrLog(prev => prev + line + '\n');
            }
          });
        }
        return reader.read().then(pump);
      });

      // escritor
      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(selectedPort.writable);
      setWriter(textEncoder.writable.getWriter());
    } catch (err) {
      alert('Error al conectar: ' + err);
    }
  };

  const sendLCDText = async () => {
    if (!writer) return;

    // Saneamos ambos textos
    const safe1 = sanitizeLCDText(line1);
    const safe2 = sanitizeLCDText(line2);

    // Si cambió alguno, había carácter inválido
    if (safe1 !== line1 || safe2 !== line2) {
      Swal.fire({
        icon: 'error',
        title: 'Caracteres inválidos',
        text: 'El texto contiene símbolos que la LCD no puede mostrar. Por favor, elimina tildes, ñ u otros caracteres especiales.',
      });
      return;
    }

    // Si todo boen, armamos las líneas de 16 chars
    const l1 = safe1.padEnd(16).slice(0,16);
    const l2 = safe2.padEnd(16).slice(0,16);
    await writer.write(`#:${l1}${l2}\n`);
  };

  return (
    <div className='bluetooth_container'>
      <h2>Pulsar botón para conectarme al HC-05</h2>
      <button onClick={connect}>Conectar</button>

      <div className='button_container' style={{ marginTop: '1rem' }}>
        <div>
          <button className='button' onClick={() => writer?.write('1')}>Encender LED</button>
          <button className='button' onClick={() => writer?.write('2')}>Apagar LED</button>
        </div>
        <div>
          <button className='button' onClick={() => writer?.write('3')}>Servo 0°</button>
          <button className='button' onClick={() => writer?.write('4')}>Servo 90°</button>
        </div>
      </div>

      <h2 className='input_text_bluetooth_title'>Mostrar texto en la LCD</h2>
      <div className='input_text_bluetooth_container'>
        <div>
          <input
            className='input_text_bluetooth'
            type="text"
            maxLength={16}
            placeholder="Línea superior del LCD"
            value={line1}
            onChange={e => setLine1(e.target.value)}
          />
          <div className="char-counter">{line1.length}/16</div>
        </div>

        <div>
          <input
            className='input_text_bluetooth'
            type="text"
            maxLength={16}
            placeholder="Línea inferior del LCD"
            value={line2}
            onChange={e => setLine2(e.target.value)}
          />
          <div className="char-counter">{line2.length}/16</div>
        </div>

        <button onClick={sendLCDText}>Enviar a LCD</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
      <div>
          <h3>Temperatura</h3>
          <textarea
            value={tempLog}
            ref={tempRef}
            readOnly
            rows={10}
            cols={30}
            style={{ background:'#111', color:'#0f0' }}
          />
        </div>
        <div>
          <h3>Distancia</h3>
          <textarea
            value={distLog}
            ref={distRef}
            readOnly
            rows={10}
            cols={30}
            style={{ background:'#111', color:'#0ff' }}
          />
        </div>
        <div>
          <h3>LDR (KΩ)</h3>
          <textarea
            value={ldrLog}
            ref={ldrRef}
            readOnly
            rows={10}
            cols={30}
            style={{ background:'#111', color:'#ff0' }}
          />
        </div>
      </div>
    </div>
  );
}
