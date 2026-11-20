import { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasTexture, SRGBColorSpace, VideoTexture, LinearFilter, TextureLoader } from 'three';

function testTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1440; canvas.height = 1080;
  const c = canvas.getContext('2d');
  const gradient = c.createLinearGradient(0, 0, 1440, 1080);
  gradient.addColorStop(0, '#ded9f3'); gradient.addColorStop(.55, '#e6dce7'); gradient.addColorStop(1, '#afc5d8');
  c.fillStyle = gradient; c.fillRect(0, 0, 1440, 1080);
  c.strokeStyle = '#45405233'; c.lineWidth = 2;
  for (let x = 0; x < 1440; x += 60) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 1080); c.stroke(); }
  for (let y = 0; y < 1080; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(1440, y); c.stroke(); }
  for (const [x,y,r,color] of [[440,430,260,'#6e72bc'],[950,650,300,'#c75e83'],[1000,230,100,'#e7f7c8']]) {
    c.fillStyle = color; c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill();
  }
  c.fillStyle = '#fff8ef'; c.font = '500 155px Georgia'; c.textAlign = 'center';
  c.fillText('LUNAR',720,585);
  c.font = '24px monospace'; c.fillStyle = '#292536'; c.fillText('R I I F F S   /   O P T I C A L   S T U D Y',720,980);
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function useCameraSource() {
  const [source, setSource] = useState(null);
  const [status, setStatus] = useState('Test card');
  const [error, setError] = useState('');
  const streamRef = useRef(null), videoRef = useRef(null), generation = useRef(0);
  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null;
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.srcObject = null; videoRef.current = null; }
  }, []);
  useEffect(() => {
    setSource({ texture: testTexture(), width: 1440, height: 1080, mirror: false });
    return () => { generation.current++; stop(); };
  }, [stop]);
  useEffect(() => () => source?.texture.dispose(), [source]);
  const startCamera = async () => {
    const request = ++generation.current;
    setError(''); setStatus('Connecting…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires localhost or HTTPS.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      if (request !== generation.current) { stream.getTracks().forEach(t => t.stop()); return; }
      stop(); streamRef.current = stream;
      const video = document.createElement('video');
      video.muted = true; video.playsInline = true; video.srcObject = stream; videoRef.current = video;
      await video.play();
      if (request !== generation.current) return;
      const texture = new VideoTexture(video); texture.colorSpace = SRGBColorSpace; texture.minFilter = LinearFilter;
      setSource({ texture, width: video.videoWidth, height: video.videoHeight, mirror: true });
      setStatus('Live camera');
      stream.getVideoTracks()[0].onended = () => { if (request === generation.current) reset(); };
    } catch (e) {
      if (request !== generation.current) return;
      stop(); setStatus('Camera unavailable');
      setError(e.name === 'NotAllowedError' ? 'Camera permission was declined. Allow it in your browser, or try a photo.' : e.message);
    }
  };
  const reset = () => {
    generation.current++; stop(); setError(''); setStatus('Test card');
    setSource({ texture: testTexture(), width: 1440, height: 1080, mirror: false });
  };
  const loadPhoto = async file => {
    if (!file) return;
    const request = ++generation.current;
    const url = URL.createObjectURL(file);
    try {
      const texture = await new TextureLoader().loadAsync(url);
      if (request !== generation.current) { texture.dispose(); return; }
      stop(); texture.colorSpace = SRGBColorSpace;
      setSource({ texture, width: texture.image.width, height: texture.image.height, mirror: false });
      setError(''); setStatus('Photo study');
    } catch { if (request === generation.current) setError('That photo could not be opened. Try a JPG, PNG or WebP.'); }
    finally { URL.revokeObjectURL(url); }
  };
  return { source, status, error, startCamera, loadPhoto, reset };
}
