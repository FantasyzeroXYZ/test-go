
export const audioBufferToWav = (buffer: AudioBuffer, opt?: any) => {
  opt = opt || {};
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = opt.float32 ? 3 : 1;
  const bitDepth = format === 3 ? 32 : 16;

  let result;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  return encodeWAV(result, format, sampleRate, numChannels, bitDepth);
};

const interleave = (inputL: Float32Array, inputR: Float32Array) => {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);

  let index = 0;
  let inputIndex = 0;

  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
};

const encodeWAV = (samples: Float32Array, format: number, sampleRate: number, numChannels: number, bitDepth: number) => {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * bytesPerSample, true);

  if (format === 1) { // PCM
    floatTo16BitPCM(view, 44, samples);
  } else {
    floatTo32BitFloat(view, 44, samples);
  }

  return buffer;
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
};

const floatTo32BitFloat = (output: DataView, offset: number, input: Float32Array) => {
  for (let i = 0; i < input.length; i++, offset += 4) {
    output.setFloat32(offset, input[i], true);
  }
};

// Main function to extract and convert slice
export const sliceAudioBuffer = async (
  originalBuffer: AudioBuffer,
  startTime: number,
  duration: number
): Promise<string> => {
  // Offline context to process
  const sampleRate = originalBuffer.sampleRate;
  const startFrame = Math.floor(startTime * sampleRate);
  const endFrame = Math.floor((startTime + duration) * sampleRate);
  const frameCount = endFrame - startFrame;

  if (frameCount <= 0) return '';

  const newBuffer = new AudioContext().createBuffer(
    originalBuffer.numberOfChannels,
    frameCount,
    sampleRate
  );

  for (let i = 0; i < originalBuffer.numberOfChannels; i++) {
    const channelData = originalBuffer.getChannelData(i);
    const newChannelData = newBuffer.getChannelData(i);
    // Copy data
    for (let j = 0; j < frameCount; j++) {
       if (startFrame + j < channelData.length) {
         newChannelData[j] = channelData[startFrame + j];
       }
    }
  }

  const wavBuffer = audioBufferToWav(newBuffer);
  // Convert ArrayBuffer to Base64
  let binary = '';
  const bytes = new Uint8Array(wavBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};
